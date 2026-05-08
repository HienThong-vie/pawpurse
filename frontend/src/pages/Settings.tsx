import { useState, useEffect } from "react";
import { Coins, Download, Sun, Moon, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";

function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [currency, setCurrency] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchSettings() {
    const response = await fetch(
      `http://localhost:8000/settings/?user_id=${user?.id}`,
    );
    const data = await response.json();
    setCurrency(data.base_currency);
  }

  async function handleEditCurrency() {
    setSaving(true);
    try {
      await fetch(
        `http://localhost:8000/settings/?user_id=${user?.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            base_currency: currency,
          }),
        },
      );
      toast.success("Settings saved");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadCSV() {
    const response = await fetch(
      `http://localhost:8000/export/csv?user_id=${user?.id}`,
      { method: "GET" },
    );
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transaction.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleDownloadPDF() {
    const response = await fetch(
      `http://localhost:8000/export/pdf?user_id=${user?.id}`,
      { method: "GET" },
    );
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transaction.pdf";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  const inputClass =
    "w-full border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]";

  return (
    <div className="font-[Inter]">
      {/* Page header */}
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          Manage your preferences
        </p>
      </header>

      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6 max-w-2xl">
        {/* Currency Preferences */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Currency Preferences
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            Select your base currency for displaying all amounts
          </p>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputClass}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            <option value="AUD">AUD</option>
            <option value="VND">VND</option>
          </select>

          <div className="flex items-center justify-end mt-4 gap-3">
            <button
              onClick={(e) => handleEditCurrency()}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-[#2a2a2a] my-6" />

        {/* Appearance */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            ) : (
              <Sun className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            )}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Appearance
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            Switch between light and dark mode
          </p>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
          >
            {theme === "dark" ? (
              <>
                <Moon className="w-4 h-4" /> Dark mode
              </>
            ) : (
              <>
                <Sun className="w-4 h-4" /> Light mode
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-[#2a2a2a] my-6" />

        {/* Data Export */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Data Export
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            Download your transaction history
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleDownloadCSV()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => handleDownloadPDF()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
            >
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
export default Settings;
