import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import supabase from "../lib/supabaseClient";
import { useToast } from "../context/ToastContext";
import AuthLayout from "../components/auth/AuthLayout";
import GlassInput from "../components/auth/GlassInput";

type Mode = "login" | "forgot" | "forgot-sent";

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
          className={`animate-element ${FEATURE_DELAYS[i]} flex items-center gap-3 rounded-2xl bg-white/70 dark:bg-white/[0.05] backdrop-blur-xl border border-white/20 p-4 text-sm text-white`}
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{feature}</span>
        </div>
      ))}
    </div>
  );
}

const TITLES: Record<Mode, string> = {
  login: "Welcome back",
  forgot: "Reset your password",
  "forgot-sent": "Check your email",
};
const DESCRIPTIONS: Record<Mode, string> = {
  login: "Sign in to your account",
  forgot: "Enter your email and we'll send you a reset link.",
  "forgot-sent": "Check your email for a reset link.",
};

function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      toast.error("Please enter your email");
      return;
    }
    setForgotSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:5173",
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
      rightOverlay={<FeatureCards />}
    >
      {mode === "login" && (
        <div className="space-y-5">
          <GlassInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <GlassInput
            label="Password"
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
            {submitting ? "Signing in..." : "Sign in"}
          </button>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-sm font-semibold text-emerald-600 dark:text-[#e8643a] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-emerald-600 dark:text-[#e8643a] font-semibold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      )}

      {mode === "forgot" && (
        <div className="space-y-5">
          <GlassInput
            label="Email"
            type="email"
            placeholder="you@example.com"
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
            {forgotSubmitting ? "Sending..." : "Send reset link"}
          </button>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm font-semibold text-emerald-600 dark:text-[#e8643a] hover:underline"
            >
              Back to login
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
