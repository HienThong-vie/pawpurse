import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import supabase from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuthLayout from "../components/auth/AuthLayout";
import GlassInput from "../components/auth/GlassInput";
import PasswordStrength from "../components/auth/PasswordStrength";


function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { isRecovering, setIsRecovering } = useAuth();
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const busy = submitting || cancelling;

  if (!isRecovering) {
    return <Navigate to="/" replace />;
  }

  async function updatePassword() {
    if (!newPassword || !confirmPassword) {
      toast.error(t("auth.errorFillBothFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("auth.errorPasswordsNoMatch"));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t("auth.toastPasswordUpdated"));
        setIsRecovering(false);
        navigate("/login");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRecovery() {
    setCancelling(true);
    try {
      // Signing out fires SIGNED_OUT, which clears isRecovering in AuthContext.
      // The page's gate (above) then redirects to / → /login on next render.
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <AuthLayout
      title={t("auth.resetTitle")}
      description={t("auth.resetDesc")}
    >
      <div className="space-y-5">
        <div>
          <GlassInput
            label={t("auth.newPasswordLabel")}
            type={showNewPw ? "text" : "password"}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="p-1 text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white transition-colors"
                aria-label={showNewPw ? "Hide password" : "Show password"}
              >
                {showNewPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />
          <PasswordStrength password={newPassword} />
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
          onClick={updatePassword}
          disabled={busy}
          className="w-full rounded-2xl bg-emerald-500 dark:bg-[#e8643a] text-white py-4 text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? t("auth.updatingPassword") : t("auth.updatePasswordBtn")}
        </button>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={cancelRecovery}
            disabled={busy}
            className="text-sm text-gray-500 dark:text-[#a0a0a0] hover:text-gray-700 dark:hover:text-white hover:underline transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {cancelling ? t("auth.signingOut") : t("auth.cancelSignOut")}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default ResetPassword;
