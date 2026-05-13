import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, fetchBaseCurrency } from "../lib/utils";
import { apiFetch } from "../lib/api";
import ErrorBanner from "../components/ErrorBanner";

function Dashboard() {
  const { user } = useAuth();
  //backend
  const [transactions, setTransactions] = useState<any[]>([]); //GET method
  const [analysis, setAnalysis] = useState({
    spending_by_category: [],
    budget_analysis: [],
    advice: [],
  }); //GET method
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function init() {
      try {
        const currency = await fetchBaseCurrency();
        setBaseCurrency(currency);

        // use currency directly in URLs, NOT baseCurrency state
        const analysisRes = await apiFetch(
          `http://localhost:8000/analysis/?base_currency=${currency}`,
        );
        const analysisData = await analysisRes.json();
        const transRes = await apiFetch(
          `http://localhost:8000/transactions/?base_currency=${currency}`,
        );
        const transData = await transRes.json();
        const budgetsRes = await apiFetch(
          `http://localhost:8000/budgets/?base_currency=${currency}`,
        );
        const budgetsData = await budgetsRes.json();
        setTransactions(transData);
        setAnalysis(analysisData);
        setBudgets(budgetsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);
  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );
  const balance = useMemo(
    () => totalIncome - totalExpense,
    [totalIncome, totalExpense],
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const spendingEntries = Object.entries(
    analysis.spending_by_category || {},
  ) as [string, number][];
  const totalSpent = spendingEntries.reduce((sum, [, amt]) => sum + amt, 0);

  function budgetBarStyle(category: string, spent: number) {
    const budget = budgets.find((b) => b.category === category);
    if (!budget || !budget.limit) {
      return {
        widthPct: 100,
        color: "bg-gray-300 dark:bg-[#3a3a3a]",
        hasBudget: false,
        pct: 0,
      };
    }
    const pct = (spent / budget.limit) * 100;
    let color = "bg-[#10b981]";
    if (pct >= 100) color = "bg-[#ef4444]";
    else if (pct >= 80) color = "bg-[#f97316]";
    else if (pct >= 60) color = "bg-[#eab308]";
    return {
      widthPct: Math.min(pct, 100),
      color,
      hasBudget: true,
      pct,
    };
  }

  function adviceStatus(msg: string): "red" | "orange" | "yellow" | "green" {
    if (msg.includes("🔴")) return "red";
    if (msg.includes("🟠")) return "orange";
    if (msg.includes("🟡")) return "yellow";
    return "green";
  }

  const adviceBorderColor: Record<string, string> = {
    red: "border-l-red-500",
    orange: "border-l-orange-500",
    yellow: "border-l-yellow-500",
    green: "border-l-emerald-500 dark:border-l-[#e8643a]",
  };

  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-32 bg-gray-200 dark:bg-[#222] rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-[#222] rounded" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-300 dark:border-[#2a2a2a] shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-gray-200 dark:bg-[#222] rounded" />
                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-[#222]" />
              </div>
              <div className="h-8 w-32 bg-gray-200 dark:bg-[#222] rounded" />
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-300 dark:border-[#2a2a2a] shadow-sm p-6">
            <div className="h-5 w-40 bg-gray-200 dark:bg-[#222] rounded mb-5" />
            <div className="flex flex-col gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-[#222] rounded" />
                    <div className="h-4 w-16 bg-gray-200 dark:bg-[#222] rounded" />
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-[#222] rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-300 dark:border-[#2a2a2a] shadow-sm p-6">
            <div className="h-5 w-32 bg-gray-200 dark:bg-[#222] rounded mb-5" />
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 dark:bg-[#222] rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-[Inter]">
      {/* Header */}
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          {today}
        </p>
      </header>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-300 dark:border-[#2a2a2a] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0] font-medium">
              Total Income
            </p>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(totalIncome, baseCurrency)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-300 dark:border-[#2a2a2a] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0] font-medium">
              Total Expense
            </p>
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 tracking-tight">
            {formatCurrency(totalExpense, baseCurrency)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-300 dark:border-[#2a2a2a] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0] font-medium">
              Balance
            </p>
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {formatCurrency(balance, baseCurrency)}
          </p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Spending by Category — wider */}
        <section className="col-span-2 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-300 dark:border-[#2a2a2a] shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
            Spending by Category
          </h2>
          {spendingEntries.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {spendingEntries.map(([cat, amount]) => {
                const bar = budgetBarStyle(cat, amount);
                return (
                  <li key={cat}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0]">
                        {cat}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(amount, baseCurrency)}
                        {bar.hasBudget && (
                          <span className="ml-2 text-xs font-medium text-gray-500 dark:text-[#a0a0a0]">
                            ({bar.pct.toFixed(0)}%)
                          </span>
                        )}
                        {!bar.hasBudget && (
                          <span className="ml-2 text-xs font-medium text-gray-400 dark:text-[#666]">
                            (no budget)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar.color} rounded-full`}
                        style={{ width: `${bar.widthPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
              No spending recorded yet.
            </p>
          )}
        </section>

        {/* Smart Alerts — narrower */}
        <section className="col-span-1 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-300 dark:border-[#2a2a2a] shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
            Smart Alerts
          </h2>
          {analysis.advice && analysis.advice.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {analysis.advice.map((advice, index) => {
                const status = adviceStatus(advice);
                return (
                  <li
                    key={index}
                    className={`bg-gray-50 dark:bg-[#222] rounded-lg border-l-4 ${adviceBorderColor[status]} p-3 text-sm text-gray-700 dark:text-[#e0e0e0] leading-relaxed`}
                  >
                    {advice}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
              No alerts — set up budgets to get advice.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
export default Dashboard;
