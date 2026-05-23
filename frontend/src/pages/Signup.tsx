import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, User } from "lucide-react";
import supabase from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import { useToast } from "../context/ToastContext";
import AuthLayout from "../components/auth/AuthLayout";
import GlassInput from "../components/auth/GlassInput";
import PasswordStrength from "../components/auth/PasswordStrength";


function Signup() {
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  async function Signing() {
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 2 || trimmedUsername.length > 30) {
      toast.error(t("auth.errorUsernameTooShort"));
      return;
    }
    if (!/^[a-zA-Z0-9_ ]+$/.test(trimmedUsername)) {
      toast.error(t("auth.errorUsernameInvalid"));
      return;
    }
    if (confirmPassword !== password) {
      toast.error(t("auth.errorPasswordsNoMatch"));
      return;
    }
    setSubmitting(true);
    try {
      try { sessionStorage.setItem("smartfinance.newSignup", "1"); } catch { /* ignore */ }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: trimmedUsername } },
      });
      if (error) {
        toast.error(error.message);
      } else {
        // Sign out so no session exists yet — wizard fires on first login, not signup
        await supabase.auth.signOut();
        toast.success(t("auth.toastAccountCreated"));
        navigate("/login");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={t("auth.signupTitle")}
      description={t("auth.signupDesc")}
    >
      <div className="space-y-5">
        <GlassInput
          label={t("auth.usernameLabel")}
          type="text"
          placeholder={t("auth.usernamePlaceholder")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
        />
        <GlassInput
          label={t("auth.emailLabel")}
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
        />
        <div>
          <GlassInput
            label={t("auth.passwordLabel")}
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="p-1 text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />
          <PasswordStrength password={password} />
        </div>
        <GlassInput
          label={t("auth.confirmPasswordLabel")}
          type={showConfirmPw ? "text" : "password"}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              className="p-1 text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white transition-colors"
              aria-label={showConfirmPw ? "Hide password" : "Show password"}
            >
              {showConfirmPw ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
        />
        <button
          onClick={Signing}
          disabled={submitting}
          className="w-full rounded-2xl bg-emerald-500 dark:bg-[#e8643a] text-white py-4 text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? t("auth.creatingAccount") : t("auth.createAccountBtn")}
        </button>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link
            to="/login"
            className="text-emerald-600 dark:text-[#e8643a] font-semibold hover:underline"
          >
            {t("auth.logInLink")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Signup;
