import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import supabase from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuthLayout from "../components/auth/AuthLayout";
import GlassInput from "../components/auth/GlassInput";
import PasswordStrength from "../components/auth/PasswordStrength";

function ReassuranceCard() {
  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 w-64 animate-element animate-delay-500 flex items-start gap-3 rounded-2xl bg-white/40 dark:bg-white/[0.05] backdrop-blur-xl border border-white/20 p-4 text-sm text-white">
      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
      <p>
        Pick a password you haven't used elsewhere. We'll log you in
        automatically after the reset.
      </p>
    </div>
  );
}

function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isRecovering, setIsRecovering } = useAuth();
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  if (!isRecovering) {
    return <Navigate to="/" replace />;
  }

  async function updatePassword() {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
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
        toast.success("Password updated");
        setIsRecovering(false);
        navigate("/login");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      description="Almost there — choose a strong password to keep your account secure."
      rightOverlay={<ReassuranceCard />}
    >
      <div className="space-y-5">
        <div>
          <GlassInput
            label="New password"
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
          label="Confirm password"
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
          disabled={submitting}
          className="w-full rounded-2xl bg-emerald-500 dark:bg-[#e8643a] text-white py-4 text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Updating..." : "Update password"}
        </button>
      </div>
    </AuthLayout>
  );
}

export default ResetPassword;
