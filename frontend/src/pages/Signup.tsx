import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import supabase from "../lib/supabaseClient";
import { useToast } from "../context/ToastContext";
import AuthLayout from "../components/auth/AuthLayout";
import GlassInput from "../components/auth/GlassInput";
import PasswordStrength from "../components/auth/PasswordStrength";

const FEATURES = [
  "Track income and expenses",
  "Set and monitor budgets",
  "Visualize spending patterns",
  "Set financial goals",
];

const FEATURE_DELAYS = [
  "animate-delay-500",
  "animate-delay-600",
  "animate-delay-700",
  "animate-delay-800",
];

function FeatureCards() {
  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 w-64">
      {FEATURES.map((feature, i) => (
        <div
          key={feature}
          className={`animate-element ${FEATURE_DELAYS[i]} flex items-center gap-3 rounded-2xl bg-white/40 dark:bg-white/[0.05] backdrop-blur-xl border border-white/20 p-4 text-sm text-white`}
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{feature}</span>
        </div>
      ))}
    </div>
  );
}

function Signup() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  async function Signing() {
    if (confirmPassword !== password) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Please log in.");
        navigate("/login");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Start tracking your finances in minutes."
      rightOverlay={<FeatureCards />}
    >
      <div className="space-y-5">
        <GlassInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
        />
        <div>
          <GlassInput
            label="Password"
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
          onClick={Signing}
          disabled={submitting}
          className="w-full rounded-2xl bg-emerald-500 dark:bg-[#e8643a] text-white py-4 text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Creating account..." : "Create account"}
        </button>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-emerald-600 dark:text-[#e8643a] font-semibold hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Signup;
