import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import { apiFetch, API_BASE } from "../lib/api";
import { useToast } from "../context/ToastContext";
import i18n from "../i18n/config";
import { Check, Loader2, PawPrint } from "lucide-react";

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KRW", name: "South Korean Won" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "THB", name: "Thai Baht" },
  { code: "INR", name: "Indian Rupee" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "IDR", name: "Indonesian Rupiah" },
];

function ChoiceCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
        selected
          ? "border-emerald-500 dark:border-[#e8643a] bg-emerald-50 dark:bg-[#e8643a]/10"
          : "border-gray-200 dark:border-[var(--bd)] hover:border-gray-300 dark:hover:border-[#555]"
      }`}
    >
      {selected && (
        <Check className="absolute top-2.5 right-2.5 w-4 h-4 text-emerald-500 dark:text-[#e8643a]" />
      )}
      {children}
    </button>
  );
}

function SetupWizard() {
  useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [companion, setCompanion] = useState<"cat" | "dog" | null>(null);
  const [companionName, setCompanionName] = useState("");
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 4) {
      nameInputRef.current?.focus();
    }
  }, [step]);

  function handleNext() {
    if (step === 3 && !companion) return;
    setStep((prev) => prev + 1);
  }

  function handleBack() {
    setStep((prev) => Math.max(1, prev - 1));
  }

  function isNextDisabled(): boolean {
    if (step === 1) return !language;
    if (step === 2) return !currency;
    if (step === 3) return !companion;
    if (step === 4) return companionName.trim().length < 1;
    return false;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      i18n.changeLanguage(language);
      const { error: supabaseError } = await supabase.auth.updateUser({
        data: {
          companion,
          companion_name: companionName.trim(),
          base_currency: currency,
          has_completed_setup: true,
        },
      });
      if (supabaseError) throw supabaseError;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session lost after setup");
      await apiFetch(`${API_BASE}/settings/`, {
        method: "PUT",
        body: JSON.stringify({ base_currency: currency }),
      });
      toast.success(
        `Welcome! Your companion ${companionName.trim()} is ready.`,
      );
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong during setup.");
      return;
    } finally {
      setSaving(false);
    }
  }

  // ── Step content ────────────────────────────────────────────────────────────

  let stepContent: React.ReactNode;

  if (step === 1) {
    stepContent = (
      <div className="flex flex-col items-center gap-6">
        <PawPrint className="w-14 h-14 text-emerald-500 dark:text-[#e8643a]" />
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("setup.welcome")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            {t("setup.welcomeSub")}
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <ChoiceCard
            selected={language === "en"}
            onClick={() => setLanguage("en")}
          >
            <span className="text-4xl">🇬🇧</span>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              English
            </span>
          </ChoiceCard>
          <ChoiceCard
            selected={language === "vi"}
            onClick={() => setLanguage("vi")}
          >
            <span className="text-4xl">🇻🇳</span>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              Tiếng Việt
            </span>
          </ChoiceCard>
        </div>
      </div>
    );
  } else if (step === 2) {
    stepContent = (
      <div className="flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("setup.currency")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            {t("setup.currencySub")}
          </p>
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full border border-gray-200 dark:border-[var(--bd)] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a] transition-colors"
        >
          {CURRENCIES.map(({ code, name }) => (
            <option key={code} value={code}>
              {code} — {name}
            </option>
          ))}
        </select>
      </div>
    );
  } else if (step === 3) {
    stepContent = (
      <div className="flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("setup.companion")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            {t("setup.companionSub")}
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <ChoiceCard
            selected={companion === "cat"}
            onClick={() => setCompanion("cat")}
          >
            <span className="text-5xl">🐱</span>
            <span className="font-bold text-sm text-gray-900 dark:text-white">
              Cat
            </span>
            <span className="text-xs text-gray-400 dark:text-[#a0a0a0] text-center">
              {t("setup.catDesc")}
            </span>
          </ChoiceCard>
          <ChoiceCard
            selected={companion === "dog"}
            onClick={() => setCompanion("dog")}
          >
            <span className="text-5xl">🐶</span>
            <span className="font-bold text-sm text-gray-900 dark:text-white">
              Dog
            </span>
            <span className="text-xs text-gray-400 dark:text-[#a0a0a0] text-center">
              {t("setup.dogDesc")}
            </span>
          </ChoiceCard>
        </div>
      </div>
    );
  } else {
    const companionEmoji = companion === "cat" ? "🐱" : "🐶";
    const companionPlaceholder =
      companion === "cat"
        ? "e.g. Whiskers, Mochi, Luna..."
        : "e.g. Buddy, Max, Pochita...";

    stepContent = (
      <div className="flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("setup.companionName", { companion: companion ?? "" })}
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            {t("setup.companionNameSub")}
          </p>
        </div>
        <span className="text-6xl leading-none">{companionEmoji}</span>
        <div className="w-full space-y-1.5">
          <input
            ref={nameInputRef}
            type="text"
            value={companionName}
            onChange={(e) => setCompanionName(e.target.value)}
            placeholder={companionPlaceholder}
            maxLength={20}
            className="w-full border border-gray-200 dark:border-[var(--bd)] rounded-xl px-4 py-3 text-base text-center text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#888] bg-white dark:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a] transition-colors"
          />
          <p className="text-xs text-gray-400 dark:text-[#888] text-right">
            {companionName.length}/20
          </p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#0f0f0f] font-[Inter]">
      <div className="w-full max-w-md px-6 py-10 flex flex-col gap-8">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                s === step
                  ? "w-6 h-2.5 bg-emerald-500 dark:bg-[#e8643a]"
                  : s < step
                    ? "w-2.5 h-2.5 bg-emerald-500 dark:bg-[#e8643a]"
                    : "w-2.5 h-2.5 bg-gray-200 dark:bg-[var(--bd)]"
              }`}
            />
          ))}
        </div>

        {/* Step content — key forces remount → triggers .wizard-step animation */}
        <div key={step} className="wizard-step">
          {stepContent}
        </div>

        {/* Navigation */}
        <div
          className={`flex gap-3 ${step === 1 ? "justify-end" : "justify-between"}`}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-[var(--bd)] text-sm font-semibold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[var(--bg-muted)] transition-colors"
            >
              {t("setup.back")}
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isNextDisabled()}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("setup.continue")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isNextDisabled() || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("setup.finish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupWizard;
