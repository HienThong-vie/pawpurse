import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/utils";

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
  useEffect(() => {
    async function init() {
      // fetch settings first and get value directly
      const settingsRes = await fetch(
        `http://localhost:8000/settings/?user_id=${user?.id}`,
      );
      const settingsData = await settingsRes.json();
      setBaseCurrency(settingsData.base_currency);

      // use settingsData.base_currency directly, NOT baseCurrency state
      const analysisRes = await fetch(
        `http://localhost:8000/analysis/?user_id=${user?.id}&base_currency=${settingsData.base_currency}`,
      );
      const analysisData = await analysisRes.json();
      const transRes = await fetch(
        `http://localhost:8000/transactions/?user_id=${user?.id}&base_currency=${settingsData.base_currency}`,
      );
      const transData = await transRes.json();
      const budgetsRes = await fetch(
        `http://localhost:8000/budgets/?user_id=${user?.id}&base_currency=${settingsData.base_currency}`,
      );
      const budgetsData = await budgetsRes.json();
      setTransactions(transData);
      setAnalysis(analysisData);
      setBudgets(budgetsData);
      setLoading(false);
    }
    init();
  }, []);
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((transaction) => {
    if (transaction.type == "income") {
      totalIncome += transaction.amount;
    } else if (transaction.type == "expense") {
      totalExpense += transaction.amount;
    }
  });

  const balance = totalIncome - totalExpense;

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
      <p className="font-[Inter] text-gray-500 dark:text-[#a0a0a0]">
        loading...
      </p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6">
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

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6">
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

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6">
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
        <section className="col-span-2 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6">
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
        <section className="col-span-1 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6">
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
