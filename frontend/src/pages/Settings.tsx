import { useState, useEffect, useCallback } from "react";
import {
  Coins,
  Download,
  Sun,
  Moon,
  Loader2,
  User,
  SlidersHorizontal,
  Bell,
  PiggyBank,
  Database,
  HeadphonesIcon,
  Info,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { apiFetch } from "../lib/api";
import { useTranslation } from "react-i18next";

function Settings() {
  const { user, username, updateUsername } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [currency, setCurrency] = useState("");
  const [saving, setSaving] = useState(false);
  const [usernameInput, setUsernameInput] = useState(username);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    setUsernameInput(username);
  }, [username]);

  const fetchSettings = useCallback(async () => {
    const response = await apiFetch(`http://localhost:8000/settings/`);
    const data = await response.json();
    setCurrency(data.base_currency);
  }, [user?.id]);

  const { t, i18n } = useTranslation();

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

  async function handleEditCurrency() {
    setSaving(true);
    try {
      await apiFetch(`http://localhost:8000/settings/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          base_currency: currency,
        }),
      });
      toast.success(t("settings.toastSettingsSaved"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadCSV() {
    const response = await apiFetch(`http://localhost:8000/export/csv`, {
      method: "GET",
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transaction.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleDownloadPDF() {
    const response = await apiFetch(`http://localhost:8000/export/pdf`, {
      method: "GET",
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transaction.pdf";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const inputClass =
    "w-full border border-gray-200 dark:border-[var(--bd)] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]";

  return (
    <div className="font-[Inter]">
      {/* Page header */}
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          {t("settings.pageDesc")}
        </p>
      </header>

      <section className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-200 dark:border-[var(--bd)] shadow-sm p-4 lg:p-6 max-w-2xl">
        {/* Profile */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("settings.profile")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            {t("settings.profileDesc")}
          </p>
          <div className="flex items-center justify-end mt-4 gap-3">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder={t("settings.usernamePlaceholder")}
              className={inputClass}
            />
            <button
              onClick={handleSaveUsername}
              disabled={savingUsername}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingUsername && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingUsername ? t("settings.saving") : t("settings.save")}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-[var(--bd)] my-6" />

        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("settings.language")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            {t("settings.languageDesc")}
          </p>
          <div className="flex items-center justify-end mt-4 gap-3">
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className={inputClass}
            >
              <option value="en">English (en)</option>
              <option value="vi">Tiếng Việt (vi)</option>
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-[var(--bd)] my-6" />

        {/* Currency Preferences */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("settings.currency")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            {t("settings.currencyDesc")}
          </p>
          <div className="flex items-center justify-end mt-4 gap-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="AUD">AUD</option>
              <option value="VND">VND</option>
            </select>

            <button
              onClick={() => handleEditCurrency()}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? t("settings.saving") : t("settings.save")}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-[var(--bd)] my-6" />

        {/* Appearance */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            ) : (
              <Sun className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            )}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("settings.appearance")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            {t("settings.appearanceDesc")}
          </p>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[var(--bd)] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
          >
            {theme === "dark" ? (
              <>
                <Moon className="w-4 h-4" /> {t("settings.apearanceDarkMode")}
              </>
            ) : (
              <>
                <Sun className="w-4 h-4" /> {t("settings.apearanceLightMode")}
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-[var(--bd)] my-6" />

        {/* Data Export */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("settings.export")}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            {t("settings.exportDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleDownloadCSV()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[var(--bd)] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Download className="w-4 h-4" /> {t("settings.exportCsv")}
            </button>
            <button
              onClick={() => handleDownloadPDF()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[var(--bd)] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Download className="w-4 h-4" /> {t("settings.exportPdf")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
export default Settings;
