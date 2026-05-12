import type { ReactNode } from "react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=2160&q=80";

type AuthLayoutProps = {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  rightOverlay?: ReactNode;
};

function AuthLayout({
  title,
  description,
  children,
  rightOverlay,
}: AuthLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen font-[Inter] bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white">
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

      {/* Right: hero column (desktop only) */}
      <section className="hidden md:block flex-1 relative p-4">
        <div
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        {rightOverlay}
        <p className="absolute bottom-6 left-8 text-xs text-white/80">
          © {new Date().getFullYear()} Smart Finance Tracker
        </p>
      </section>
    </div>
  );
}

export default AuthLayout;
