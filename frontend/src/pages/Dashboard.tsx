import { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Target,
  ArrowRight,
  BarChart2,
  ChevronDown,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, fetchBaseCurrency, formatDate } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { useTranslation } from "react-i18next";
import ErrorBanner from "../components/ErrorBanner";
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

const COLORS = [
  "#e8643a",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ec4899",
];

type PeriodFilter = "week" | "month" | "all";

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const r = new Date(d);
  r.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

type BudgetSnapshotEntry = {
  period_start: string;
  spent: number;
  limit: number;
  currency: string;
};
type BudgetSnapshot = Record<string, BudgetSnapshotEntry>;

function Dashboard() {
  const { user } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const { t } = useTranslation();

  const PERIOD_LABELS: Record<PeriodFilter, string> = {
    week: t("dashboard.periodWeekly"),
    month: t("dashboard.periodMonthly"),
    all: t("dashboard.periodAllTime"),
  };
  const [transactions, setTransactions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("week");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const rolloverChecked = useRef(false);

  useEffect(() => {
    async function init() {
      try {
        const currency = await fetchBaseCurrency();
        setBaseCurrency(currency);
        const [transRes, goalsRes, catsRes, budgetsRes] = await Promise.all([
          apiFetch(
            `http://localhost:8000/transactions/?base_currency=${currency}`,
          ),
          apiFetch(`http://localhost:8000/goals/?base_currency=${currency}`),
          apiFetch(`http://localhost:8000/categories/`),
          apiFetch(`http://localhost:8000/budgets/?base_currency=${currency}`),
        ]);
        setTransactions(await transRes.json());
        setGoals(await goalsRes.json());
        setCategories(await catsRes.json());
        const fetchedBudgets = await budgetsRes.json();
        await detectBudgetRollover(fetchedBudgets, currency);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function detectBudgetRollover(
      fetchedBudgets: any[],
      currency: string,
    ) {
      if (rolloverChecked.current) return;
      rolloverChecked.current = true;
      if (!user?.id || !Array.isArray(fetchedBudgets)) return;

      const notifPrefs = user?.user_metadata?.notification_prefs ?? {};
      const budgetDefaults = user?.user_metadata?.budget_defaults ?? {};
      const budgetSavedEnabled =
        notifPrefs.budget_saved !== false &&
        budgetDefaults.auto_suggest_goals !== false;
      const budgetWarningEnabled = notifPrefs.budget_warning !== false;
      const warningThreshold = Number(notifPrefs.warning_threshold ?? 80);

      if (!budgetSavedEnabled && !budgetWarningEnabled) return;

      // Fetch existing notifications once for both dedup checks.
      let existingNotifs: any[] = [];
      try {
        const r = await apiFetch(`http://localhost:8000/notifications/`);
        existingNotifs = await r.json();
      } catch {
        // permissive — worst case we send a duplicate once
      }

      let createdAny = false;

      // ── budget_saved: detect period rollovers ──────────────────────
      if (budgetSavedEnabled) {
        const storageKey = `budget_snapshot_${user.id}`;
        const stored = localStorage.getItem(storageKey);
        const snapshot: BudgetSnapshot = stored ? JSON.parse(stored) : {};
        const nextSnapshot: BudgetSnapshot = {};

        for (const b of fetchedBudgets) {
          if (!b?.category || !b?.period_start) continue;
          const prior = snapshot[b.category];
          nextSnapshot[b.category] = {
            period_start: String(b.period_start),
            spent: Number(b.spent ?? 0),
            limit: Number(b.limit ?? 0),
            currency: b.currency || currency,
          };
          if (!prior) continue;
          if (prior.period_start === String(b.period_start)) continue;

          const saved = prior.limit - prior.spent;
          if (saved <= 0) continue;

          const duplicate = existingNotifs.some(
            (n: any) =>
              n.type === "budget_saved" &&
              n.data?.budget_category === b.category &&
              n.data?.period_start === prior.period_start,
          );
          if (duplicate) continue;

          try {
            await apiFetch(`http://localhost:8000/notifications/`, {
              method: "POST",
              body: JSON.stringify({
                type: "budget_saved",
                title: `You saved on ${b.category}!`,
                body: `You saved ${formatCurrency(saved, prior.currency)} on your ${b.category} budget last period. Add it to a goal?`,
                data: {
                  saved_amount: saved,
                  budget_category: b.category,
                  currency: prior.currency,
                  period_start: prior.period_start,
                  action: "navigate_goals",
                },
              }),
            });
            createdAny = true;

            // Award coins to the mascot — scales with how close to the limit
            // the user got (full budget = 10 coins). Fire-and-forget so a
            // mascot failure can't block notifications.
            const limit = Number(prior.limit) || 0;
            const coins = limit > 0 ? Math.floor((saved / limit) * 10) : 0;
            if (coins > 0) {
              apiFetch("http://localhost:8000/mascot/coins", {
                method: "PATCH",
                body: JSON.stringify({ coins }),
              }).catch((err) => {
                console.error("Failed to award mascot coins", err);
              });
            }
          } catch (err) {
            console.error("Failed to create budget_saved notification", err);
          }
        }

        localStorage.setItem(storageKey, JSON.stringify(nextSnapshot));
      }

      // ── budget_warning: alert when spending crosses the threshold ──
      if (budgetWarningEnabled) {
        for (const b of fetchedBudgets) {
          if (!b?.category || !b?.period_start || !(Number(b.limit) > 0))
            continue;
          const spentPct =
            (Number(b.spent ?? 0) / Number(b.limit)) * 100;
          if (spentPct < warningThreshold) continue;

          const duplicate = existingNotifs.some(
            (n: any) =>
              n.type === "budget_warning" &&
              n.data?.budget_category === b.category &&
              n.data?.period_start === String(b.period_start),
          );
          if (duplicate) continue;

          const remaining = Number(b.limit) - Number(b.spent ?? 0);
          try {
            await apiFetch(`http://localhost:8000/notifications/`, {
              method: "POST",
              body: JSON.stringify({
                type: "budget_warning",
                title: `${b.category} budget at risk`,
                body: `You've used ${spentPct.toFixed(0)}% of your ${b.category} budget. ${formatCurrency(remaining, b.currency || currency)} remaining.`,
                data: {
                  spent_pct: Math.round(spentPct),
                  budget_category: b.category,
                  currency: b.currency || currency,
                  period_start: String(b.period_start),
                },
              }),
            });
            createdAny = true;
          } catch (err) {
            console.error("Failed to create budget_warning notification", err);
          }
        }
      }

      if (createdAny) await refreshNotifications();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Close period dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        periodDropdownRef.current &&
        !periodDropdownRef.current.contains(e.target as Node)
      ) {
        setShowPeriodDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Category name (lowercased) -> emoji map
  const emojiByCategory = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      if (c?.name) map[c.name.toLowerCase()] = c.emoji || "💼";
    }
    return map;
  }, [categories]);

  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const balance = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Filter transactions by the active period (used by BOTH charts).
  const filteredTx = useMemo(() => {
    if (periodFilter === "all") return transactions;
    const now = new Date();
    if (periodFilter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return transactions.filter((t) => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d >= start && d < end;
      });
    }
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return transactions.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d >= start && d < end;
    });
  }, [transactions, periodFilter]);

  // Bucketed data for the line/area chart based on the active period.
  const barData = useMemo(() => {
    if (periodFilter === "week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const buckets = days.map((d) => ({ month: d, income: 0, expense: 0 }));
      filteredTx.forEach((t) => {
        if (!t.date) return;
        const d = new Date(t.date);
        const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        if (t.type === "income") buckets[idx].income += t.amount;
        else buckets[idx].expense += t.amount;
      });
      return buckets;
    }
    if (periodFilter === "month") {
      const now = new Date();
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const rawTicks = [1, 7, 14, 21, 28, lastDay];
      const ticks = rawTicks.filter((d, i, arr) => arr.indexOf(d) === i);
      const buckets = ticks.map((d) => ({
        month: String(d),
        income: 0,
        expense: 0,
      }));
      filteredTx.forEach((t) => {
        if (!t.date) return;
        const day = new Date(t.date).getDate();
        let idx = ticks.findIndex((tick) => day <= tick);
        if (idx === -1) idx = ticks.length - 1;
        if (t.type === "income") buckets[idx].income += t.amount;
        else buckets[idx].expense += t.amount;
      });
      return buckets;
    }
    // All time: monthly buckets across full history.
    const monthly: Record<
      string,
      { month: string; income: number; expense: number }
    > = {};
    filteredTx.forEach((t) => {
      const m = t.date?.slice(0, 7);
      if (!m) return;
      if (!monthly[m]) monthly[m] = { month: m, income: 0, expense: 0 };
      if (t.type === "income") monthly[m].income += t.amount;
      else monthly[m].expense += t.amount;
    });
    return Object.values(monthly).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }, [filteredTx, periodFilter]);

  const donutData = useMemo(() => {
    const byCat: Record<string, number> = {};
    filteredTx.forEach((t) => {
      if (t.type === "expense")
        byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
    });
    return Object.entries(byCat).map(([name, value]) => ({ name, value }));
  }, [filteredTx]);
  const totalSpending = donutData.reduce((s, d) => s + d.value, 0);

  const recentTx = useMemo(
    () =>
      [...transactions]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5),
    [transactions],
  );

  const tooltipFormatter = (value: any, name: any) => [
    formatCurrency(value as number, baseCurrency),
    String(name).charAt(0).toUpperCase() + String(name).slice(1),
  ];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        <div className="mb-3">
          <div className="h-7 w-28 bg-gray-200 dark:bg-[var(--bg-muted)] rounded mb-1.5" />
          <div className="h-3.5 w-44 bg-gray-200 dark:bg-[var(--bg-muted)] rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 w-14 bg-gray-200 dark:bg-[var(--bg-muted)] rounded" />
                <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-[var(--bg-muted)]" />
              </div>
              <div className="h-6 w-24 bg-gray-200 dark:bg-[var(--bg-muted)] rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 mb-3">
          <div className="lg:col-span-3 bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4 h-48" />
          <div className="lg:col-span-7 bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4 h-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-3 bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4 h-56" />
          <div className="lg:col-span-2 bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4 h-56" />
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div className="font-[Inter]">
      {/* Subtitle */}
      <header className="mb-3">
        <p className="text-xs text-gray-500 dark:text-[#a0a0a0]">{today}</p>
      </header>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {/* ── ROW 1: Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-[#a0a0a0] uppercase tracking-wide">
              {t("dashboard.balance")}
            </p>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {formatCurrency(balance, baseCurrency)}
          </p>
        </div>

        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-[#a0a0a0] uppercase tracking-wide">
              {t("dashboard.income")}
            </p>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(totalIncome, baseCurrency)}
          </p>
        </div>

        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-[#a0a0a0] uppercase tracking-wide">
              {t("dashboard.expenses")}
            </p>
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 tracking-tight">
            {formatCurrency(totalExpense, baseCurrency)}
          </p>
        </div>

        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-[#a0a0a0] uppercase tracking-wide">
              {t("dashboard.saved")}
            </p>
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <PiggyBank className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p
            className={`text-xl font-bold tracking-tight ${balance >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}
          >
            {formatCurrency(balance, baseCurrency)}
          </p>
          <p className="text-xs text-gray-500 dark:text-[#a0a0a0] mt-0.5">
            {totalIncome > 0
              ? t("dashboard.savingsRate", { rate: savingsRate.toFixed(1) })
              : t("dashboard.noIncome")}
          </p>
        </div>
      </div>

      {/* ── ROW 2: Goals Progress (30%) · Monthly Trend (70%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 mb-3">
        {/* Goals Progress */}
        <section className="lg:col-span-3 bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {t("dashboard.goalsProgress")}
            </h2>
            <Link
              to="/goals"
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-[#e8643a] hover:opacity-80 transition-opacity"
            >
              {t("dashboard.viewAll")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {goals.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {goals.slice(0, 3).map((goal) => {
                const pct =
                  goal.target_amount > 0
                    ? Math.min(
                        (goal.current_amount / goal.target_amount) * 100,
                        100,
                      )
                    : 0;
                return (
                  <li key={goal.id}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0] truncate max-w-[65%]">
                        {goal.name}
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white shrink-0">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-[var(--bg-muted)] rounded-full overflow-hidden mb-1">
                      <div
                        className="bg-emerald-500 dark:bg-[#e8643a] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-[#a0a0a0]">
                      <span>
                        {formatCurrency(goal.current_amount, baseCurrency)}
                      </span>
                      <span>
                        {formatCurrency(goal.target_amount, baseCurrency)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-2">
                <Target className="w-4 h-4 text-emerald-600 dark:text-[#e8643a]" />
              </div>
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-1.5">
                {t("dashboard.noGoalsYet")}
              </p>
              <Link
                to="/goals"
                className="text-xs font-medium text-emerald-600 dark:text-[#e8643a] hover:opacity-80 transition-opacity"
              >
                {t("dashboard.addAGoal")}
              </Link>
            </div>
          )}
        </section>

        {/* Monthly Trend */}
        <section className="lg:col-span-7 bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {t("dashboard.monthlyTrend")}
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-gray-500 dark:text-[#a0a0a0]">
                    {t("dashboard.incomeLabel")}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#e8643a]" />
                  <span className="text-gray-500 dark:text-[#a0a0a0]">
                    {t("dashboard.expenseLabel")}
                  </span>
                </span>
              </div>
            </div>

            {/* Shared period dropdown */}
            <div className="relative" ref={periodDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPeriodDropdown((p) => !p)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-[#a0a0a0] border border-gray-300 dark:border-[var(--bd)] rounded-md hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
              >
                {PERIOD_LABELS[periodFilter]}
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${showPeriodDropdown ? "rotate-180" : ""}`}
                />
              </button>
              {showPeriodDropdown && (
                <div className="absolute top-full right-0 mt-1.5 w-32 bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {(["week", "month", "all"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setPeriodFilter(key);
                        setShowPeriodDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors text-left"
                    >
                      {PERIOD_LABELS[key]}
                      {periodFilter === key && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={195}>
              <AreaChart
                data={barData}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="dashIncomeGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="dashExpenseGrad"
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
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    formatCurrency(v as number, baseCurrency)
                  }
                  width={72}
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
                  fill="url(#dashIncomeGrad)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#e8643a"
                  strokeWidth={2.5}
                  fill="url(#dashExpenseGrad)"
                  fillOpacity={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-2">
                <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-[#e8643a]" />
              </div>
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
                {t("dashboard.noDataPeriod")}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ── ROW 3: Recent Transactions (60%) · Spending Breakdown (40%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Recent Transactions */}
        <section className="lg:col-span-3 bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {t("dashboard.recentTransactions")}
            </h2>
            <Link
              to="/transactions"
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-[#e8643a] hover:opacity-80 transition-opacity"
            >
              {t("dashboard.viewAll")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentTx.length > 0 ? (
            <ul>
              {recentTx.map((t, i) => (
                <li
                  key={t.id}
                  className={`flex items-center justify-between py-2 gap-3 ${i < recentTx.length - 1 ? "border-b border-gray-100 dark:border-[var(--bd)]" : ""}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-gray-100 dark:bg-[var(--bg-muted)] flex items-center justify-center text-base leading-none select-none">
                      {emojiByCategory[t.category?.toLowerCase()] || "💼"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-[#e0e0e0] truncate">
                        {t.category}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-[#666]">
                        {formatDate(t.created_at)}
                        {t.note && (
                          <span className="ml-1.5 text-gray-400 dark:text-[#555]">
                            ·{" "}
                            {t.note.length > 24
                              ? `${t.note.slice(0, 24)}…`
                              : t.note}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {t.type === "expense" ? "−" : "+"}
                    {formatCurrency(t.amount, baseCurrency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0] py-6 text-center">
              {t("dashboard.noTransactionsYet")}
            </p>
          )}
        </section>

        {/* Spending Breakdown */}
        <section className="lg:col-span-2 bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {t("dashboard.spendingBreakdown")}
            </h2>
            <span className="text-xs text-gray-400 dark:text-[#555]">
              {PERIOD_LABELS[periodFilter]}
            </span>
          </div>

          {donutData.length > 0 ? (
            <>
              <div className="text-center mb-0.5">
                <p className="text-xs text-gray-500 dark:text-[#a0a0a0] font-medium uppercase tracking-wide">
                  {t("dashboard.total")}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  {formatCurrency(totalSpending, baseCurrency)}
                </p>
              </div>

              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={46}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donutData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [
                        formatCurrency(v as number, baseCurrency),
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

              <ul className="flex flex-col gap-1 pt-2 border-t border-gray-100 dark:border-[var(--bd)]">
                {donutData.map((entry, index) => {
                  const pct =
                    totalSpending > 0 ? (entry.value / totalSpending) * 100 : 0;
                  return (
                    <li
                      key={entry.name}
                      className="flex items-center justify-between text-xs gap-2"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-gray-700 dark:text-[#e0e0e0] truncate">
                          {entry.name}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-gray-500 dark:text-[#a0a0a0]">
                        {pct.toFixed(1)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-2">
                <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-[#e8643a]" />
              </div>
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
                {t("dashboard.noSpendingData")}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
