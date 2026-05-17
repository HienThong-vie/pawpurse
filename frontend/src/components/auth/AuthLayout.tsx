import type { ReactNode } from "react";
import FeatureCarousel from "../FeaturePreviews/FeatureCarousel";

type AuthLayoutProps = {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
};

function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen overflow-x-hidden font-[Inter] bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white">
      {/* Left: form column */}
      <section className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="animate-element animate-delay-100 flex items-center gap-2 mb-10">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 dark:bg-[#e8643a]" />
            <span className="text-sm font-semibold tracking-wide text-gray-700 dark:text-[#e0e0e0]">
              SMART FINANCE TRACKER
            </span>
          </div>
          <h1 className="animate-element animate-delay-200 text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-2">
            {title}
          </h1>
          <p className="animate-element animate-delay-300 text-sm text-gray-500 dark:text-[#a0a0a0] mb-8">
            {description}
          </p>
          <div className="animate-element animate-delay-400">{children}</div>
        </div>
      </section>

      {/* Right: carousel column (desktop only, ≥1024px) */}
      <section className="hidden lg:flex flex-1 flex-col items-center justify-center px-16 py-12 bg-gray-50 dark:bg-[#161616] border-l border-gray-100 dark:border-[#1f1f1f]">
        <div className="w-full max-w-md">
          <FeatureCarousel />
        </div>
        <p className="mt-8 text-xs text-gray-400 dark:text-[#555]">
          © {new Date().getFullYear()} Smart Finance Tracker
        </p>
      </section>
    </div>
  );
}

export default AuthLayout;
