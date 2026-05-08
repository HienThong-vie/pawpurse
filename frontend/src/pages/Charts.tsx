import { useState, useEffect } from "react";
import { BarChart2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

function Charts() {
  const { user } = useAuth();
  //backend
  const [transactions, setTransactions] = useState<any[]>([]); //GET method
  const [analysis, setAnalysis] = useState({
    spending_by_category: {},
    budget_analysis: [],
    advice: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "all">("all");
  useEffect(() => {
    async function init() {
      const response = await fetch(
        `http://localhost:8000/settings/?user_id=${user?.id}`,
      );
      const data = await response.json();
      setBaseCurrency(data.base_currency);

      // use data.base_currency directly here, not the state variable
      const transResponse = await fetch(
        `http://localhost:8000/transactions/?user_id=${user?.id}&base_currency=${data.base_currency}`,
      );
      const analysisResponse = await fetch(
        `http://localhost:8000/analysis/?user_id=${user?.id}&base_currency=${data.base_currency}`,
      );
      const transRes = await transResponse.json();
      const analysisRes = await analysisResponse.json();
      setTransactions(transRes);
      setAnalysis(analysisRes);
      setLoading(false);
    }
    init();
  }, []);
  function startOfFilter(filter: string): Date | null {
    if (filter === "all") return null;
    const now = new Date();
    if (filter === "month") {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (filter === "week") {
      const d = new Date(now);
      const day = d.getDay(); // 0 Sun .. 6 Sat
      const diff = day === 0 ? -6 : 1 - day; // shift to Monday
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  }

  const filterStart = startOfFilter(timeFilter);
  const filteredTransactions = filterStart
    ? transactions.filter((t) => t.date && new Date(t.date) >= filterStart)
    : transactions;

  // Donut: use backend analysis when "all"; derive client-side when filtered
  let donutData: { name: string; value: number }[] = Object.entries(
    analysis.spending_by_category || {},
  ).map(([name, value]) => ({ name, value: value as number }));
  if (timeFilter !== "all") {
    const byCategory: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      if (t.type === "expense") {
        byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
      }
    });
    donutData = Object.entries(byCategory).map(([name, value]) => ({
      name,
      value,
    }));
  }
  const COLORS = [
    "#e8643a",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#ec4899",
  ];
  const monthlyData: Record<
    string,
    { month: string; income: number; expense: number }
  > = {};

  filteredTransactions.forEach((t) => {
    const month = t.date?.slice(0, 7); // extracts "YYYY-MM"
    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expense: 0 };
    }
    if (t.type === "income") {
      monthlyData[month].income += t.amount;
    } else {
      monthlyData[month].expense += t.amount;
    }
  });

  const barData = Object.values(monthlyData).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  const totalSpending = donutData.reduce(
    (sum, d) => sum + (d.value as number),
    0,
  );

  const tooltipFormatter = (value: any, name: any) => [
    formatCurrency(value as number, baseCurrency),
    String(name).charAt(0).toUpperCase() + String(name).slice(1),
  ];

  const emptyState = (msg: string) => (
    <div className="flex flex-col items-center text-center py-12">
      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-3">
        <BarChart2 className="w-6 h-6 text-emerald-600 dark:text-[#e8643a]" />
      </div>
      <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        No data to chart
      </p>
      <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">{msg}</p>
    </div>
  );

  if (loading) {
    return (
      <p className="font-[Inter] text-gray-500 dark:text-[#a0a0a0]">
        Loading...
      </p>
    );
  }

  return (
    <div className="font-[Inter]">
      {/* Page header */}
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Charts
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          Visualize your financial data
        </p>
      </header>

      {/* Time filter */}
      <div className="flex gap-2 mb-6">
        {(
          [
            ["week", "This Week"],
            ["month", "This Month"],
            ["all", "All Time"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTimeFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeFilter === key
                ? "bg-emerald-500 dark:bg-[#e8643a] text-white"
                : "bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-50 dark:hover:bg-[#222]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Two-column grid: 60/40 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Monthly Trend — 60% */}
        <section className="lg:col-span-3 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Monthly Trend
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-6">
            Income vs expenses over time, grouped by month.
          </p>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart
                data={barData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="incomeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="expenseGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#e8643a" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#e8643a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="#e5e7eb"
                  className="dark:opacity-30"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    formatCurrency(value as number, baseCurrency)
                  }
                  width={80}
                />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#incomeGradient)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#e8643a"
                  strokeWidth={2.5}
                  fill="url(#expenseGradient)"
                  fillOpacity={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            emptyState("Add transactions to see monthly trends.")
          )}

          {/* Custom legend below chart */}
          {barData.length > 0 && (
            <div className="flex items-center gap-5 mt-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-gray-600 dark:text-[#a0a0a0]">
                  Income
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e8643a]" />
                <span className="text-gray-600 dark:text-[#a0a0a0]">
                  Expense
                </span>
              </span>
            </div>
          )}
        </section>

        {/* Spending Breakdown — 40% */}
        <section className="lg:col-span-2 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Spending Breakdown
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
            Expenses by category.
          </p>
          {donutData.length > 0 ? (
            <>
              {/* Total above */}
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 dark:text-[#a0a0a0] font-medium uppercase tracking-wide">
                  Total Spending
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {formatCurrency(totalSpending, baseCurrency)}
                </p>
              </div>

              {/* Donut */}
              <div className="w-full" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(value as number, baseCurrency),
                        "",
                      ]}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend list below */}
              <ul className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-[#222]">
                {donutData.map((entry, index) => {
                  const pct =
                    totalSpending > 0
                      ? ((entry.value as number) / totalSpending) * 100
                      : 0;
                  return (
                    <li
                      key={entry.name}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            background: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-gray-700 dark:text-[#e0e0e0] truncate">
                          {entry.name}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(
                            entry.value as number,
                            baseCurrency,
                          )}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-[#a0a0a0] tabular-nums w-10 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            emptyState(
              "Add expense transactions to see your spending breakdown.",
            )
          )}
        </section>
      </div>
    </div>
  );
}
export default Charts;
