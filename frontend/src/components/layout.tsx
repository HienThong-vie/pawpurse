import { useState } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  Lightbulb,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Bell,
  PawPrint,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import supabase from "../lib/supabaseClient";
import NotificationPanel from "./NotificationPanel";
import RatingPopup from "./RatingPopup";
import SleepingMascot from "./SleepingMascot";
import { MASCOT_HIDDEN_ROUTES, ROUTES_WITH_OWN_MOBILE_HEADER } from "../lib/routes";

const SIDEBAR_ROUTES: Record<string, string> = {
  "/dashboard": "sidebar.dashboard",
  "/transactions": "sidebar.transactions",
  "/budget": "sidebar.budget",
  "/goals": "sidebar.goals",
  "/companion": "sidebar.companion",
};

const SIDEBAR_SUBTITLES: Record<string, string> = {
  "/transactions": "transactions.subtitle",
  "/budget": "budget.subtitle",
  "/goals": "goals.subtitle",
};

export type LayoutOutletContext = { openSidebar: () => void };

function Layout() {
  const { user, username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const sidebarKey = SIDEBAR_ROUTES[location.pathname];
  const subtitleKey = SIDEBAR_SUBTITLES[location.pathname] ?? null;
  const showSidebar = Boolean(sidebarKey);
  const mascotVisible = !MASCOT_HIDDEN_ROUTES.includes(location.pathname);
  const hasOwnMobileHeader = ROUTES_WITH_OWN_MOBILE_HEADER.includes(
    location.pathname,
  );

  const rawAvatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  // Cache-bust with updated_at (bumped when the avatar is re-uploaded) rather
  // than Date.now(), which would be impure during render.
  const avatarVersion = user?.updated_at ?? "";
  const avatarUrl = rawAvatarUrl
    ? `${rawAvatarUrl}?t=${encodeURIComponent(avatarVersion)}`
    : null;
  const avatarInitial =
    user?.user_metadata?.username?.[0]?.toUpperCase() ?? "U";

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-emerald-50 dark:bg-[#e8643a]/10 text-emerald-600 dark:text-[#e8643a] font-semibold"
        : "text-gray-600 dark:text-[#a0a0a0] font-medium hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] hover:text-gray-900 dark:hover:text-white"
    }`;

  return (
    <div className="flex min-h-screen bg-white dark:bg-[var(--bg-page)] font-[Inter]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-50 flex flex-col w-64 h-screen bg-white dark:bg-[var(--bg-surface)] border-r border-gray-300 dark:border-[var(--bd)] px-4 py-6 transform transition-transform overflow-y-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          className="lg:hidden absolute top-3 right-3 p-1.5 rounded-md text-gray-500 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        <h1 className="flex items-center gap-2 whitespace-nowrap text-gray-900 dark:text-white font-bold text-base tracking-tight px-2 mb-8">
          <PawPrint className="inline-block w-auto h-auto text-emerald-500 dark:text-[#e8643a] shrink-0" />
          {t("common.appName")}
        </h1>

        <nav className="flex-1" onClick={closeSidebar}>
          <ul className="flex flex-col gap-0.5">
            <li>
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {t("sidebar.dashboard")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/transactions" className={navLinkClass}>
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                {t("sidebar.transactions")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/budget" className={navLinkClass}>
                <Wallet className="w-4 h-4 shrink-0" />
                {t("sidebar.budget")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/goals" className={navLinkClass}>
                <Target className="w-4 h-4 shrink-0" />
                {t("sidebar.goals")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/companion" className={navLinkClass}>
                <PawPrint className="w-4 h-4 shrink-0" />
                {t("sidebar.companion")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/advisor" className={navLinkClass}>
                <Lightbulb className="w-4 h-4 shrink-0" />
                {t("sidebar.advisor")}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="border-t border-gray-300 dark:border-[var(--bd)] pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-emerald-600 dark:text-[#e8643a]">
                  {avatarInitial}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                {username}
              </p>
              <p className="text-gray-500 dark:text-[#a0a0a0] text-xs truncate leading-tight">
                {user?.email}
              </p>
            </div>
          </div>
          <ul className="flex flex-col gap-0.5 mb-1" onClick={closeSidebar}>
            <li>
              <NavLink to="/settings" className={navLinkClass}>
                <SettingsIcon className="w-4 h-4 shrink-0" />
                {t("sidebar.settings")}
              </NavLink>
            </li>
          </ul>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-medium text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {t("sidebar.signOut")}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 bg-white dark:bg-[var(--bg-page)] lg:pl-64">
        {showSidebar ? (
          /* Global top bar (Dashboard / Transactions / Budget / Goals) */
          <div className="sticky top-0 z-30 bg-white dark:bg-[var(--bg-surface)] border-b border-gray-200 dark:border-[var(--bd)] h-[52px] px-4 lg:px-8 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-0 min-w-0 overflow-hidden">
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight shrink-0">
                {t(sidebarKey)}
              </h2>
              {subtitleKey && (
                <>
                  <span className="mx-1.5 text-gray-400 dark:text-[#555] shrink-0 select-none">·</span>
                  <p className="text-[13px] text-gray-500 dark:text-[#a0a0a0] truncate">
                    {t(subtitleKey)}
                  </p>
                </>
              )}
            </div>
            <div className="ml-auto flex items-center">
              <button
                type="button"
                onClick={() => setNotifOpen(true)}
                className="relative p-2 rounded-md text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors"
                aria-label={t("topbar.notifications")}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none tabular-nums">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : !hasOwnMobileHeader ? (
          /* Mobile-only fallback for pages without the global top bar */
          <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-[var(--bg-page)] border-b border-gray-300 dark:border-[var(--bd)] px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#e8643a]" />
              {t("common.appName")}
            </span>
          </div>
        ) : null}

        <div
          className={`p-4 lg:p-8 ${mascotVisible ? "pb-28 lg:pb-8" : ""}`}
        >
          <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
        </div>
      </main>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <RatingPopup />
      <SleepingMascot />
    </div>
  );
}

export default Layout;
