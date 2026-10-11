import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Sun,
  Moon,
  Loader2,
  User,
  SlidersHorizontal,
  Bell,
  PiggyBank,
  Database,
  Headphones,
  Info,
  KeyRound,
  Trash2,
} from "lucide-react";
import emailjs from "@emailjs/browser";
import supabase from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { useNotifications } from "../context/NotificationContext";
import { apiFetch, API_BASE } from "../lib/api";
import { useTranslation } from "react-i18next";

const RATING_LABEL_KEYS = [
  "settings.support.rating.veryPoor",
  "settings.support.rating.poor",
  "settings.support.rating.okay",
  "settings.support.rating.good",
  "settings.support.rating.excellent",
] as const;

const INPUT_CLASS =
  "w-full border border-gray-200 dark:border-[var(--bd)] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#888] bg-white dark:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a] transition-colors";

// Subtle card wrapper for groups of related settings
const CARD = "bg-gray-50 dark:bg-[var(--bg-muted)] rounded-xl border border-gray-100 dark:border-[var(--bd)] p-5";

const RATING_EMOJIS = ["😔", "😕", "😐", "🙂", "😍"] as const;

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0 ${
        checked
          ? "bg-emerald-500 dark:bg-[#e8643a]"
          : "bg-gray-200 dark:bg-[var(--bg-hover)]"
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="pb-4 border-b border-gray-100 dark:border-[var(--bd)]">
      <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-0.5">{desc}</p>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection() {
  const { t } = useTranslation();
  const { user, username, updateUsername } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [usernameInput, setUsernameInput] = useState(username);
  const [savingUsername, setSavingUsername] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url ?? null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsernameInput(username);
  }, [username]);

  async function handleAvatarUpload(file: File) {
    const ext = file.name.split(".").pop();
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    const STORAGE_PATH = `${user.id}/avatar.${ext}`;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("file size is above 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("file is not image");
      return;
    }
    setUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(STORAGE_PATH, file, { upsert: true });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(STORAGE_PATH);
      const urlWithTimestamp = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.auth.updateUser({
        data: { avatar_url: urlWithTimestamp },
      });
      setAvatarUrl(urlWithTimestamp);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    await handleAvatarUpload(file);
  }

  async function handleSaveUsername() {
    const trimmed = usernameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      toast.error(t("auth.errorUsernameTooShort"));
      return;
    }
    if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
      toast.error(t("auth.errorUsernameInvalid"));
      return;
    }
    setSavingUsername(true);
    try {
      await updateUsername(trimmed);
      toast.success(t("settings.toastUsernameUpdated"));
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleSendResetEmail() {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      });
      if (error) toast.error(error.message);
      else toast.success(t("settings.toastResetEmailSent"));
    } finally {
      setSendingReset(false);
    }
  }

  async function handleDeleteAccount() {
    const ok = await confirm({
      title: t("settings.deleteAccount"),
      message: t("settings.deleteAccountConfirm"),
      confirmLabel: t("settings.deleteAccount"),
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch(`${API_BASE}/account/`, { method: "DELETE" });
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.message || t("settings.toastDeleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const initials = username
    ? username
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("")
    : "U";

  return (
    <div className="max-w-lg space-y-5">
      <SectionHeader
        title={t("settings.nav.profile")}
        desc={t("settings.profileDesc")}
      />

      {/* Account info card */}
      <div className={`${CARD} space-y-5`}>
        {/* Avatar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full overflow-hidden cursor-pointer relative shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarPreview || avatarUrl ? (
              <img
                src={avatarPreview ?? avatarUrl!}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <span className="text-xl font-bold text-emerald-600 dark:text-[#e8643a]">
                  {initials}
                </span>
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{username}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="text-xs text-emerald-600 dark:text-[#e8643a] hover:underline mt-0.5"
            >
              {uploadingAvatar ? t("common.uploading") : t("settings.profile.changeAvatar")}
            </button>
            <p className="text-xs text-gray-400 dark:text-[#777] mt-0.5">
              {t("settings.profile.avatarHint")}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-[var(--bd)]" />

        {/* Username */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.profile.Username")}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder={t("settings.usernamePlaceholder")}
              className={INPUT_CLASS}
            />
            <button
              onClick={handleSaveUsername}
              disabled={savingUsername}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingUsername && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingUsername ? t("settings.saving") : t("settings.save")}
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.emailLabel")}
          </label>
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="w-full border border-gray-200 dark:border-[var(--bd)] rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-[#888] bg-gray-50 dark:bg-[var(--bg-hover)] cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 dark:text-[#777]">
            {t("settings.emailNote")}
          </p>
        </div>
      </div>

      {/* Security card */}
      <div className={`${CARD} space-y-3`}>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.changePassword")}
          </p>
          <p className="text-xs text-gray-500 dark:text-[#a0a0a0] mt-0.5">
            {t("settings.changePasswordDesc")}
          </p>
        </div>
        <button
          onClick={handleSendResetEmail}
          disabled={sendingReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[var(--bd)] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-60"
        >
          {sendingReset ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          {sendingReset ? t("settings.saving") : t("settings.sendResetEmailBtn")}
        </button>
      </div>

      {/* Danger zone */}
      <div className="border border-red-200 dark:border-red-500/30 rounded-xl p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            {t("settings.dangerZone")}
          </p>
        </div>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-500/30 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {deleting ? t("settings.saving") : t("settings.deleteAccount")}
        </button>
      </div>
    </div>
  );
}

// ─── Preferences ──────────────────────────────────────────────────────────────

function PreferencesSection() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [defaultTxType, setDefaultTxType] = useState<"expense" | "income">("expense");
  const [weekStart, setWeekStart] = useState<"monday" | "sunday">("monday");

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/settings/`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCurrency(data.base_currency ?? "USD");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  async function handleSaveCurrency() {
    setSaving(true);
    try {
      await apiFetch(`${API_BASE}/settings/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_currency: currency }),
      });
      toast.success(t("settings.toastSettingsSaved"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <SectionHeader
        title={t("settings.nav.preferences")}
        desc={t("settings.prefDesc")}
      />

      {/* Locale card */}
      <div className={`${CARD} space-y-5`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#777]">
          {t("settings.groupLocale") || "Locale"}
        </p>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.language")}
          </label>
          <p className="text-xs text-gray-400 dark:text-[#888]">
            {t("settings.languageDesc")}
          </p>
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="en">English</option>
            <option value="vi">Vietnamese</option>
            <option value="ja">Japanese</option>
            <option value="hi">Hindi</option>
            <option value="ch">Chinese (simplify)</option>
            <option value="ko">Korean</option>
          </select>
        </div>

        <div className="border-t border-gray-100 dark:border-[var(--bd)]" />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.currency")}
          </label>
          <p className="text-xs text-gray-400 dark:text-[#888]">
            {t("settings.currencyDesc")}
          </p>
          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="AUD">AUD</option>
              <option value="VND">VND</option>
            </select>
            <button
              onClick={handleSaveCurrency}
              disabled={saving}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? t("settings.saving") : t("settings.save")}
            </button>
          </div>
        </div>
      </div>

      {/* Appearance card */}
      <div className={`${CARD} space-y-3`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#777]">
          {t("settings.groupAppearance") || "Appearance"}
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
              {t("settings.appearance")}
            </p>
            <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">
              {t("settings.appearanceDesc")}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[var(--bd)] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors shrink-0"
          >
            {theme === "dark" ? (
              <>
                <Moon className="w-4 h-4" />
                {t("settings.apearanceDarkMode")}
              </>
            ) : (
              <>
                <Sun className="w-4 h-4" />
                {t("settings.apearanceLightMode")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Defaults card */}
      <div className={`${CARD} space-y-5`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#777]">
          {t("settings.groupDefaults") || "Defaults"}
        </p>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.defaultTxType")}
          </label>
          <p className="text-xs text-gray-400 dark:text-[#888]">
            {t("settings.defaultTxTypeDesc")}
          </p>
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[var(--bg-hover)] rounded-lg w-fit">
            {(["expense", "income"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDefaultTxType(type)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  defaultTxType === type
                    ? "bg-white dark:bg-[var(--bg-surface)] text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-[#a0a0a0] hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                {type === "expense" ? t("settings.txTypeExpense") : t("settings.txTypeIncome")}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-[var(--bd)]" />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.weekStart")}
          </label>
          <p className="text-xs text-gray-400 dark:text-[#888]">
            {t("settings.weekStartDesc")}
          </p>
          <select
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value as "monday" | "sunday")}
            className={`${INPUT_CLASS} max-w-xs`}
          >
            <option value="monday">{t("settings.weekStartMonday")}</option>
            <option value="sunday">{t("settings.weekStartSunday")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [budgetSaved, setBudgetSaved] = useState<boolean>(true);
  const [budgetWarning, setBudgetWarning] = useState<boolean>(true);
  const [warningThreshold, setWarningThreshold] = useState<string>("80");
  const [goalReminder, setGoalReminder] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const notifPrefsStr = JSON.stringify(user?.user_metadata?.notification_prefs ?? {});
  useEffect(() => {
    const prefs = JSON.parse(notifPrefsStr);
    setBudgetSaved(prefs.budget_saved !== false);
    setBudgetWarning(prefs.budget_warning !== false);
    setWarningThreshold(String(prefs.warning_threshold ?? 80));
    setGoalReminder(prefs.goal_reminders !== false);
  }, [notifPrefsStr]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          notification_prefs: {
            budget_saved: budgetSaved,
            budget_warning: budgetWarning,
            warning_threshold: Number(warningThreshold),
            goal_reminders: goalReminder,
          },
        },
      });
      if (error) toast.error(error.message);
      else toast.success(t("settings.notifications.saveSuccess"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <SectionHeader
        title={t("settings.nav.notifications")}
        desc={t("settings.notifDesc")}
      />

      <div className={`${CARD} divide-y divide-gray-100 dark:divide-[var(--bd)]`}>
        {/* Budget saved */}
        <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
              {t("settings.notifBudgetSaved")}
            </p>
            <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">
              {t("settings.notifBudgetSavedDesc")}
            </p>
          </div>
          <Toggle checked={budgetSaved} onChange={setBudgetSaved} />
        </div>

        {/* Budget warning */}
        <div className="py-4 space-y-3 first:pt-0 last:pb-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
                {t("settings.notifBudgetWarning")}
              </p>
              <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">
                {t("settings.notifBudgetWarningDesc")}
              </p>
            </div>
            <Toggle checked={budgetWarning} onChange={setBudgetWarning} />
          </div>
          {budgetWarning && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-[#a0a0a0] whitespace-nowrap">
                {t("settings.notifWarningThreshold")}
              </span>
              <select
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                className="border border-gray-200 dark:border-[var(--bd)] rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white bg-white dark:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors"
              >
                <option value="60">60%</option>
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
              </select>
            </div>
          )}
        </div>

        {/* Goal reminder */}
        <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
              {t("settings.notifGoalReminder")}
            </p>
            <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">
              {t("settings.notifGoalReminderDesc")}
            </p>
          </div>
          <Toggle checked={goalReminder} onChange={setGoalReminder} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? t("settings.saving") : t("settings.notifSave")}
      </button>
    </div>
  );
}

// ─── Budget & Goals ───────────────────────────────────────────────────────────

function BudgetGoalsSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [defaultPeriod, setDefaultPeriod] = useState<string>("monthly");
  const [autoSuggest, setAutoSuggest] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const budgetPrefsStr = JSON.stringify(user?.user_metadata?.budget_defaults ?? {});
  useEffect(() => {
    const budgetPrefs = JSON.parse(budgetPrefsStr);
    setDefaultPeriod(budgetPrefs.default_period ?? "monthly");
    setAutoSuggest(budgetPrefs.auto_suggest_goals !== false);
  }, [budgetPrefsStr]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          budget_defaults: {
            default_period: defaultPeriod,
            auto_suggest_goals: autoSuggest,
          },
        },
      });
      if (error) toast.error(error.message);
      else toast.success(t("settings.budgetGoals.saveSuccess"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <SectionHeader
        title={t("settings.nav.budgetGoals")}
        desc={t("settings.budgetGoalsDesc")}
      />

      <div className={`${CARD} divide-y divide-gray-100 dark:divide-[var(--bd)]`}>
        <div className="pb-4 space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.defaultBudgetPeriod")}
          </label>
          <p className="text-xs text-gray-400 dark:text-[#888]">
            {t("settings.defaultBudgetPeriodDesc")}
          </p>
          <select
            value={defaultPeriod}
            onChange={(e) => setDefaultPeriod(e.target.value)}
            className={`${INPUT_CLASS} max-w-xs`}
          >
            <option value="daily">{t("budget.periodDaily")}</option>
            <option value="weekly">{t("budget.periodWeekly")}</option>
            <option value="monthly">{t("budget.periodMonthly")}</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
              {t("settings.autoSuggestGoals")}
            </p>
            <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">
              {t("settings.autoSuggestGoalsDesc")}
            </p>
          </div>
          <Toggle checked={autoSuggest} onChange={setAutoSuggest} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? t("settings.saving") : t("settings.budgetGoalsSave")}
      </button>
    </div>
  );
}

// ─── Data & Privacy ───────────────────────────────────────────────────────────

function DataPrivacySection() {
  const { t } = useTranslation();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { refresh: refreshNotifications } = useNotifications();

  async function handleClear(
    titleKey: string,
    msgKey: string,
    action: () => Promise<void>,
  ) {
    const ok = await confirm({
      title: t(titleKey),
      message: t(msgKey),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (ok) await action();
  }

  const clearItems = [
    {
      labelKey: "settings.clearNotifications",
      descKey: "settings.clearNotificationsDesc",
      msgKey: "settings.confirmClearNotifications",
      action: async () => {
        try {
          await apiFetch(`${API_BASE}/notifications/clear-all`, {
            method: "DELETE",
          });
          await refreshNotifications();
          toast.success(t("settings.toastNotificationsCleared"));
        } catch (err: any) {
          toast.error(err?.message || t("settings.support.sendError"));
        }
      },
    },
    {
      labelKey: "settings.clearTransactions",
      descKey: "settings.clearTransactionsDesc",
      msgKey: "settings.confirmClearTransactions",
      action: async () => {
        try {
          await apiFetch(`${API_BASE}/transactions/all`, {
            method: "DELETE",
          });
          toast.success(t("settings.dataPrivacy.transactionsCleared"));
        } catch (err: any) {
          toast.error(err?.message || t("settings.support.sendError"));
        }
      },
    },
    {
      labelKey: "settings.clearBudgets",
      descKey: "settings.clearBudgetsDesc",
      msgKey: "settings.confirmClearBudgets",
      action: async () => {
        try {
          await apiFetch(`${API_BASE}/budgets/all`, {
            method: "DELETE",
          });
          toast.success(t("settings.dataPrivacy.budgetsCleared"));
        } catch (err: any) {
          toast.error(err?.message || t("settings.support.sendError"));
        }
      },
    },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <SectionHeader
        title={t("settings.nav.dataPrivacy")}
        desc={t("settings.dataDesc")}
      />

      {/* Export card */}
      <div className={`${CARD} space-y-3`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#777]">
          {t("settings.exportTransactions")}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={async () => {
              const res = await apiFetch(`${API_BASE}/export/csv`, { method: "GET" });
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "transactions.csv";
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[var(--bd)] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("settings.exportCsv")}
          </button>
          <button
            onClick={async () => {
              const res = await apiFetch(`${API_BASE}/export/pdf`, { method: "GET" });
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "transactions.pdf";
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[var(--bd)] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("settings.exportPdf")}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            {t("settings.dangerZone")}
          </p>
          <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">
            {t("settings.dangerZoneDesc")}
          </p>
        </div>
        <div className="border border-red-200 dark:border-red-500/30 rounded-xl overflow-hidden divide-y divide-red-100 dark:divide-red-500/20">
          {clearItems.map(({ labelKey, descKey, msgKey, action }) => (
            <div
              key={labelKey}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
                  {t(labelKey)}
                </p>
                <p className="text-xs text-gray-400 dark:text-[#888] mt-0.5">
                  {t(descKey)}
                </p>
              </div>
              <button
                onClick={() => handleClear(labelKey, msgKey, action)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("common.delete")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Support ──────────────────────────────────────────────────────────────────

function SupportSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (rating === null) return;
    setSending(true);
    const emoji = RATING_EMOJIS[rating];
    const ratingLabel = t(RATING_LABEL_KEYS[rating]);
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_FEEDBACK_TEMPLATE_ID,
        {
          from_name: user?.user_metadata?.username ?? "User",
          from_email: user?.email ?? "unknown",
          rating: `${emoji} ${ratingLabel}`,
          message: feedback || "No message provided",
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );
      toast.success(t("settings.support.sendSuccess"));
      setRating(null);
      setFeedback("");
    } catch (err: any) {
      toast.error(err?.text || err?.message || t("settings.support.sendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <SectionHeader
        title={t("settings.nav.support")}
        desc={t("settings.supportDesc")}
      />

      <div className={`${CARD} space-y-5`}>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.supportRating")}
          </p>
          <div className="flex gap-3">
            {RATING_EMOJIS.map((emoji, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                aria-label={t(RATING_LABEL_KEYS[i])}
                className={`w-9 h-9 rounded-full text-2xl flex items-center justify-center transition-all ${
                  rating === i
                    ? "bg-emerald-100 dark:bg-[#e8643a]/20 ring-2 ring-emerald-500 dark:ring-[#e8643a] scale-110"
                    : "hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-[#888] h-4">
            {rating !== null ? t(RATING_LABEL_KEYS[rating]) : ""}
          </p>
        </div>

        <div className="border-t border-gray-100 dark:border-[var(--bd)]" />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
            {t("settings.supportGetInTouch")}
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("settings.support.feedbackPlaceholder")}
            rows={4}
            style={{ minHeight: 100 }}
            className="w-full border border-gray-200 dark:border-[var(--bd)] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#888] bg-white dark:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a] resize-y transition-colors"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={rating === null || sending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sending && <Loader2 className="w-4 h-4 animate-spin" />}
          {sending ? t("settings.saving") : t("settings.support.sendFeedback")}
        </button>
      </div>
    </div>
  );
}

// ─── About ────────────────────────────────────────────────────────────────────

function AboutSection() {
  const { t } = useTranslation();
  const toast = useToast();

  return (
    <div className="max-w-lg space-y-5">
      <SectionHeader
        title={t("settings.nav.about")}
        desc={t("settings.aboutAppDescription")}
      />

      <div className={`${CARD} space-y-4`}>
        <div className="space-y-1">
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {t("common.appName")}
          </p>
          <p className="text-sm font-medium text-emerald-600 dark:text-[#e8643a]">
            {t("settings.aboutVersion")}
          </p>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
            {t("settings.aboutAppDescription")}
          </p>
        </div>

        <div className="border-t border-gray-100 dark:border-[var(--bd)]" />

        <div className="flex gap-4">
          <button
            onClick={() => toast.success(t("settings.aboutComingSoon"))}
            className="text-sm text-emerald-600 dark:text-[#e8643a] hover:underline font-medium"
          >
            {t("settings.aboutPrivacyPolicy")}
          </button>
          <button
            onClick={() => toast.success(t("settings.aboutComingSoon"))}
            className="text-sm text-emerald-600 dark:text-[#e8643a] hover:underline font-medium"
          >
            {t("settings.aboutTerms")}
          </button>
        </div>

        <p className="text-xs text-gray-400 dark:text-[#777]">
          {t("settings.aboutBuiltBy")} · {t("settings.aboutYear")}
        </p>
      </div>
    </div>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavGroup = {
  label: string;
  items: { id: string; labelKey: string; icon: React.ComponentType<{ className?: string }> }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Account",
    items: [{ id: "profile", labelKey: "settings.nav.profile", icon: User }],
  },
  {
    label: "App Settings",
    items: [
      { id: "preferences", labelKey: "settings.nav.preferences", icon: SlidersHorizontal },
      { id: "notifications", labelKey: "settings.nav.notifications", icon: Bell },
      { id: "budgetGoals", labelKey: "settings.nav.budgetGoals", icon: PiggyBank },
      { id: "dataPrivacy", labelKey: "settings.nav.dataPrivacy", icon: Database },
    ],
  },
  {
    label: "Help",
    items: [
      { id: "support", labelKey: "settings.nav.support", icon: Headphones },
      { id: "about", labelKey: "settings.nav.about", icon: Info },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const SECTION_MAP: Record<string, React.ComponentType> = {
  profile: ProfileSection,
  preferences: PreferencesSection,
  notifications: NotificationsSection,
  budgetGoals: BudgetGoalsSection,
  dataPrivacy: DataPrivacySection,
  support: SupportSection,
  about: AboutSection,
};

// ─── Main ─────────────────────────────────────────────────────────────────────

function Settings() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("profile");
  const ActiveSection = SECTION_MAP[activeSection] ?? ProfileSection;

  return (
    <div className="font-[Inter]">
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          {t("settings.pageDesc")}
        </p>
      </header>

      <div className="flex flex-col sm:flex-row bg-white dark:bg-[var(--bg-surface)] rounded-2xl border border-gray-200 dark:border-[var(--bd)] shadow-sm overflow-hidden min-h-[640px]">
        {/* Sidebar nav */}
        <nav className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-[var(--bd)] bg-gray-50/60 dark:bg-[var(--bg-page)]">
          {/* Mobile: horizontal scrollable pills */}
          <div className="flex sm:hidden gap-2 overflow-x-auto thin-scrollbar px-3 py-3">
            {NAV_ITEMS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activeSection === id
                    ? "bg-emerald-100 dark:bg-[#e8643a]/20 text-emerald-700 dark:text-[#e8643a]"
                    : "bg-white dark:bg-[var(--bg-surface)] text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[var(--bg-muted)] border border-gray-200 dark:border-[var(--bd)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(labelKey)}
              </button>
            ))}
          </div>

          {/* Desktop: vertical grouped list */}
          <div className="hidden sm:flex flex-col py-3">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
                <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-[#666]">
                  {group.label}
                </p>
                {group.items.map(({ id, labelKey, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left border-l-2 ${
                      activeSection === id
                        ? "border-emerald-500 dark:border-[#e8643a] bg-emerald-50 dark:bg-[#e8643a]/10 text-emerald-700 dark:text-[#e8643a] font-semibold"
                        : "border-transparent text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[var(--bg-muted)] hover:text-gray-900 dark:hover:text-white font-medium"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 p-5 lg:p-8 overflow-y-auto">
          <ActiveSection />
        </div>
      </div>
    </div>
  );
}

export default Settings;
