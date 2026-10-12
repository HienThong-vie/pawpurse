import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import supabase from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import { useToast } from "../context/ToastContext";
import AuthLayout from "../components/auth/AuthLayout";
import GlassInput from "../components/auth/GlassInput";

type Mode = "login" | "forgot" | "forgot-sent";


function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const TITLES: Record<Mode, string> = {
    login: t("auth.loginTitle"),
    forgot: t("auth.forgotTitle"),
    "forgot-sent": t("auth.forgotSentTitle"),
  };
  const DESCRIPTIONS: Record<Mode, string> = {
    login: t("auth.loginDesc"),
    forgot: t("auth.forgotDesc"),
    "forgot-sent": t("auth.forgotSentDesc"),
  };

  async function Logging() {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/dashboard");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function sendResetEmail() {
    if (!email) {
      toast.error(t("auth.errorEnterEmail"));
      return;
    }
    setForgotSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setMode("forgot-sent");
      }
    } finally {
      setForgotSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={TITLES[mode]}
      description={DESCRIPTIONS[mode]}
    >
      {mode === "login" && (
        <div className="space-y-5">
          <GlassInput
            label={t("auth.emailLabel")}
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <GlassInput
            label={t("auth.passwordLabel")}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />
          <button
            onClick={Logging}
            disabled={submitting}
            className="w-full rounded-2xl bg-emerald-500 dark:bg-[#e8643a] text-white py-4 text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? t("auth.signingIn") : t("auth.signInBtn")}
          </button>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-sm font-semibold text-emerald-600 dark:text-[#e8643a] hover:underline"
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center">
            {t("auth.noAccount")}{" "}
            <Link
              to="/signup"
              className="text-emerald-600 dark:text-[#e8643a] font-semibold hover:underline"
            >
              {t("auth.signUpLink")}
            </Link>
          </p>
        </div>
      )}

      {mode === "forgot" && (
        <div className="space-y-5">
          <GlassInput
            label={t("auth.emailLabel")}
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <button
            onClick={sendResetEmail}
            disabled={forgotSubmitting}
            className="w-full rounded-2xl bg-emerald-500 dark:bg-[#e8643a] text-white py-4 text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {forgotSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {forgotSubmitting ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
          </button>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm font-semibold text-emerald-600 dark:text-[#e8643a] hover:underline"
            >
              {t("auth.backToLogin")}
            </button>
          </div>
        </div>
      )}

      {mode === "forgot-sent" && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setMode("login")}
            className="text-sm font-semibold text-emerald-600 dark:text-[#e8643a] hover:underline"
          >
            Back to login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

export default Login;
