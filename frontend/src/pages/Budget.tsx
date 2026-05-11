import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Wallet, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency, fetchBaseCurrency } from "../lib/utils";
import { apiFetch } from "../lib/api";
import ErrorBanner from "../components/ErrorBanner";

type BudgetFieldErrors = {
  category?: string;
  limit?: string;
  period?: string;
};

function Budget() {
  const { user } = useAuth();
  const toast = useToast();
  const [editId, setEditId] = useState<number | null>(null);
  //backend
  const [budgets, setBudgets] = useState<any[]>([]); //GET method
  const [categories, setCategories] = useState<any[]>([]); //GET method
  //form field
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState("");
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<BudgetFieldErrors>({});
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiFetch(
        `http://localhost:8000/categories/`,
        { method: "GET" },
      );
      const data = await response.json();
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [user?.id]);
  const fetchBudgets = useCallback(async () => {
    try {
      const response = await apiFetch(
        `http://localhost:8000/budgets/?base_currency=${baseCurrency}`,
        { method: "GET" },
      );
      const data = await response.json();
      setBudgets(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [user?.id, baseCurrency]);

  useEffect(() => {
    async function init() {
      try {
        const currency = await fetchBaseCurrency();
        setBaseCurrency(currency);

        const budgetResponse = await apiFetch(
          `http://localhost:8000/budgets/?base_currency=${currency}`,
        );
        const budgetRes = await budgetResponse.json();
        fetchCategories();
        setBudgets(budgetRes);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user?.id, fetchCategories]);

  async function handleSubmit() {
    // Inline validation
    const errs: BudgetFieldErrors = {};
    if (!category) errs.category = "Select a category";
    const lim = Number(limit);
    if (!limit || isNaN(lim) || lim <= 0)
      errs.limit = "Enter a positive limit";
    if (!period) errs.period = "Select a period";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (editId == null) {
        await apiFetch(`http://localhost:8000/budgets/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            category,
            limit: lim,
            period,
            currency: baseCurrency,
          }),
        });
        toast.success("Budget added");
      } else {
        await apiFetch(
          `http://localhost:8000/budgets/${editId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: user?.id,
              category,
              limit: lim,
              period,
              currency: baseCurrency,
            }),
          },
        );
        toast.success("Budget updated");
      }
      fetchBudgets();
      setCategory("");
      setLimit("");
      setPeriod("");
      setEditId(null);
      setFieldErrors({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }
  async function handleDelete(budget_id) {
    try {
      await apiFetch(
        `http://localhost:8000/budgets/${budget_id}`,
        { method: "DELETE" },
      );
      fetchBudgets();
    } catch (err: any) {
      setError(err.message);
    }
  }
  async function handleEdit(budget) {
    setEditId(budget.id);
    setCategory(budget.category);
    setLimit(String(budget.limit));
    setPeriod(budget.period);
  }

  const inputClass =
    "border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] bg-white dark:bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]";

  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-32 bg-gray-200 dark:bg-[#222] rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-[#222] rounded" />
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6 mb-6 h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-5 h-32"
            />
          ))}
        </div>
      </div>
    );
  }

  const statusBarColor: Record<string, string> = {
    acceptable: "bg-emerald-500",
    caution: "bg-yellow-500",
    warning: "bg-orange-500",
    exceeded: "bg-red-500",
  };

  return (
    <div className="font-[Inter]">
      {/* Page header */}
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Budget
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          Track your spending limits
        </p>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Add / Update Budget */}
      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {editId ? "Update Budget" : "Add Budget"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3">
          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${inputClass} w-full ${
                fieldErrors.category
                  ? "border-red-500 dark:border-red-500"
                  : ""
              }`}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {fieldErrors.category}
              </p>
            )}
          </div>
          <div>
            <input
              type="number"
              placeholder="Amount"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={`${inputClass} w-full ${
                fieldErrors.limit
                  ? "border-red-500 dark:border-red-500"
                  : ""
              }`}
            />
            {fieldErrors.limit && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {fieldErrors.limit}
              </p>
            )}
          </div>
          <div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={`${inputClass} w-full ${
                fieldErrors.period
                  ? "border-red-500 dark:border-red-500"
                  : ""
              }`}
            >
              <option value="">Select Period</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
            {fieldErrors.period && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {fieldErrors.period}
              </p>
            )}
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting
              ? editId
                ? "Updating..."
                : "Adding..."
              : editId
                ? "Update Budget"
                : "Add Budget"}
          </button>
        </div>
      </section>

      {/* Budget cards grid */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => {
            const barColor = statusBarColor[budget.status] || "bg-gray-400";
            const pct = Math.min(budget.percentage ?? 0, 100);
            return (
              <div
                key={budget.id}
                className="relative bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-5"
              >
                {/* Top right actions */}
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={() => handleEdit(budget)}
                    className="p-1.5 rounded-md text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                    aria-label="Edit budget"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="p-1.5 rounded-md text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    aria-label="Delete budget"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Header */}
                <div className="flex items-center gap-2 mb-4 pr-16">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {budget.category}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-xs font-medium text-gray-600 dark:text-[#a0a0a0] capitalize">
                    {budget.period}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden mb-2">
                  <div
                    className={`${barColor} h-full rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Spent / limit + percentage */}
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-gray-600 dark:text-[#a0a0a0]">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(budget.spent, baseCurrency)}
                    </span>{" "}
                    / {formatCurrency(budget.limit, baseCurrency)}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-[#e0e0e0]">
                    {budget.percentage?.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-3">
            <Wallet className="w-6 h-6 text-emerald-600 dark:text-[#e8643a]" />
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            No budgets yet
          </p>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            Add your first budget above to start tracking spending limits.
          </p>
        </div>
      )}
    </div>
  );
}
export default Budget;
