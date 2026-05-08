import { useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  BarChart2,
  Lightbulb,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";

function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        : "text-gray-600 dark:text-[#a0a0a0] font-medium hover:bg-gray-50 dark:hover:bg-[#222] hover:text-gray-900 dark:hover:text-white"
    }`;

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0f0f0f] font-[Inter]">
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
        className={`fixed lg:static z-50 flex flex-col w-64 min-h-screen bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-[#2a2a2a] px-4 py-6 transform transition-transform lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          className="lg:hidden absolute top-3 right-3 p-1.5 rounded-md text-gray-500 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#222]"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        <h1 className="flex items-center gap-2 whitespace-nowrap text-gray-900 dark:text-white font-bold text-base tracking-tight px-2 mb-8">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-[#e8643a] shrink-0" />
          Smart Finance Tracker
        </h1>

        <nav className="flex-1" onClick={closeSidebar}>
          <ul className="flex flex-col gap-0.5">
            <li>
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/transactions" className={navLinkClass}>
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                Transaction
              </NavLink>
            </li>
            <li>
              <NavLink to="/budget" className={navLinkClass}>
                <Wallet className="w-4 h-4 shrink-0" />
                Budget
              </NavLink>
            </li>
            <li>
              <NavLink to="/goals" className={navLinkClass}>
                <Target className="w-4 h-4 shrink-0" />
                Goals
              </NavLink>
            </li>
            <li>
              <NavLink to="/charts" className={navLinkClass}>
                <BarChart2 className="w-4 h-4 shrink-0" />
                Chart
              </NavLink>
            </li>
            <li>
              <NavLink to="/advisor" className={navLinkClass}>
                <Lightbulb className="w-4 h-4 shrink-0" />
                Advice
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="border-t border-gray-200 dark:border-[#2a2a2a] pt-4 mt-4">
          <p className="text-gray-500 dark:text-[#a0a0a0] text-xs px-2 mb-2 truncate">
            {user?.email}
          </p>
          <ul className="flex flex-col gap-0.5 mb-1" onClick={closeSidebar}>
            <li>
              <NavLink to="/settings" className={navLinkClass}>
                <SettingsIcon className="w-4 h-4 shrink-0" />
                Settings
              </NavLink>
            </li>
          </ul>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-medium text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 bg-white dark:bg-[#0f0f0f]">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-[#2a2a2a] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#e8643a]" />
            Smart Finance Tracker
          </span>
        </div>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
