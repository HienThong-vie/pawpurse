import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, Mail, Lock, Loader2 } from "lucide-react";
import supabase from "../lib/supabaseClient";
import { useToast } from "../context/ToastContext";

type Mode = "login" | "forgot" | "forgot-sent";

function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  //asign the async allow function to use await
  async function Logging() {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      }); // await till the supabase get user email and password, otherwise they are empty
      if (error) {
        toast.error(error.message);
      } else if (!error) {
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

  const features = [
    "Track income and expenses",
    "Set and monitor budgets",
    "Visualize spending patterns",
    "Set financial goals",
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-[Inter]">
      {/* right panel — compact strip on mobile, full panel on desktop */}
      <div className="md:w-2/5 bg-emerald-500 text-white p-4 md:p-12 flex md:flex-col items-center md:items-stretch md:justify-between">
        <div className="flex md:block items-center gap-2 w-full">
          <div className="flex items-center gap-2 md:mb-12">
            <span className="inline-block w-3 h-3 rounded-full bg-white" />
            <span className="text-sm font-semibold tracking-wide">
              SMART FINANCE TRACKER
            </span>
          </div>
          <div className="hidden md:block align-middle">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
              Take control of your finances
            </h1>
            <p className="text-emerald-50 text-base mb-10">
              Everything you need to track, plan, and grow your money — in one
              clean dashboard.
            </p>
            <ul className="flex flex-col gap-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 shrink-0 text-white" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="hidden md:block text-xs text-emerald-100">
          © {new Date().getFullYear()} Smart Finance Tracker
        </p>
      </div>

      {/* left panel */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0f0f0f] p-6 md:p-8">
        <div className="w-full max-w-sm">
          {mode === "login" && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                Welcome back
              </h2>
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-8">
                Sign in to your account
              </p>

              <div className="flex flex-col gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0] mb-1.5 block">
                    Email
                  </span>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#666]" />
                    <input
                      type="text"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-gray-200 dark:border-[#2a2a2a] rounded-lg pl-10 pr-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] bg-white dark:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0] mb-1.5 block">
                    Password
                  </span>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#666]" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 dark:border-[#2a2a2a] rounded-lg pl-10 pr-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] bg-white dark:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]"
                    />
                  </div>
                </label>

                <button
                  onClick={() => Logging()}
                  disabled={submitting}
                  className="w-full mt-2 px-4 py-2.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Signing in..." : "Sign in"}
                </button>

                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-emerald-600 dark:text-[#e8643a] font-semibold hover:underline text-center"
                >
                  Forgot password?
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center mt-6">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-emerald-600 dark:text-[#e8643a] font-semibold hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                Reset your password
              </h2>
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-8">
                Enter your email and we'll send you a reset link
              </p>

              <div className="flex flex-col gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0] mb-1.5 block">
                    Email
                  </span>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#666]" />
                    <input
                      type="text"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-gray-200 dark:border-[#2a2a2a] rounded-lg pl-10 pr-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] bg-white dark:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]"
                    />
                  </div>
                </label>

                <button
                  onClick={() => sendResetEmail()}
                  disabled={forgotSubmitting}
                  className="w-full mt-2 px-4 py-2.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {forgotSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {forgotSubmitting ? "Sending..." : "Send reset link"}
                </button>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-emerald-600 dark:text-[#e8643a] font-semibold hover:underline text-center"
                >
                  Back to login
                </button>
              </div>
            </>
          )}

          {mode === "forgot-sent" && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                Check your email
              </h2>
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-8">
                Check your email for a reset link.
              </p>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-emerald-600 dark:text-[#e8643a] font-semibold hover:underline"
              >
                Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
