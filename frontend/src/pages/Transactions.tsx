import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { formatCurrency, formatDate, fetchBaseCurrency } from "../lib/utils";
import { apiFetch } from "../lib/api";
import ErrorBanner from "../components/ErrorBanner";

type FieldErrors = {
  amount?: string;
  category?: string;
  date?: string;
};

type SortKey =
  | "newest"
  | "oldest"
  | "amount-high"
  | "amount-low"
  | "category-az";

// Frontend sort applies only to amount/category sorts.
// Newest/oldest are sorted by the backend via order_by(created_at).
function applySort(arr: any[], sortBy: SortKey): any[] {
  const sorted = [...arr];
  switch (sortBy) {
    case "amount-high":
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-low":
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case "category-az":
      sorted.sort((a, b) =>
        String(a.category).localeCompare(String(b.category)),
      );
      break;
    default:
      // newest/oldest: backend has already sorted; leave as-is
      break;
  }
  return sorted;
}

function Transactions() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  //form field
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [is_recurring, setIsRecurring] = useState(false);
  const [recurring_interval, setRecurringInterval] = useState("");
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  //category field
  const [name, setName] = useState("");
  const fetchTransactions = useCallback(
    async (sortDir: "newest" | "oldest" = "newest") => {
      try {
        const response = await apiFetch(
          `http://localhost:8000/transactions/?base_currency=${baseCurrency}&sort=${sortDir}`,
          { method: "GET" },
        );
        const data = await response.json();
        setTransactions(data);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [user?.id, baseCurrency],
  );

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

  useEffect(() => {
    async function init() {
      try {
        const currency = await fetchBaseCurrency();
        setBaseCurrency(currency);

        // Backend orders by created_at desc by default
        const transResponse = await apiFetch(
          `http://localhost:8000/transactions/?base_currency=${currency}&sort=newest`,
        );
        const transData = await transResponse.json();
        setTransactions(transData);

        fetchCategories();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user?.id, fetchCategories]);

  // Re-sort when sortBy changes — refetch from backend for date sorts,
  // sort client-side for amount/category. Skip on first render (init handles it).
  const initialSortMount = useRef(true);
  useEffect(() => {
    if (initialSortMount.current) {
      initialSortMount.current = false;
      return;
    }
    if (sortBy === "newest" || sortBy === "oldest") {
      fetchTransactions(sortBy);
    } else {
      setTransactions((prev) => applySort([...prev], sortBy));
    }
  }, [sortBy, fetchTransactions]);

  async function handleSubmit() {
    // Inline validation
    const errs: FieldErrors = {};
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      errs.amount = "Enter a positive amount";
    }
    if (!category) {
      errs.category = "Select a category";
    }
    // Default date to today if not provided
    let effectiveDate = date;
    if (!effectiveDate) {
      effectiveDate = new Date().toISOString().split("T")[0];
      setDate(effectiveDate);
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (editId == null) {
        await apiFetch(`http://localhost:8000/transactions/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            amount: amt,
            type,
            category,
            note,
            date: effectiveDate,
            is_recurring,
            recurring_interval,
            currency: baseCurrency,
          }),
        });
        toast.success("Transaction added");
      } else {
        await apiFetch(
          `http://localhost:8000/transactions/${editId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user?.id,
              amount: amt,
              type,
              category,
              note,
              date: effectiveDate,
            }),
          },
        );
        toast.success("Transaction updated");
      }
      fetchTransactions();
      setEditId(null);
      setAmount("");
      setType("expense");
      setCategory("");
      setNote("");
      setDate("");
      setIsRecurring(false);
      setFieldErrors({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(
        `http://localhost:8000/transactions/${id}`,
        { method: "DELETE" },
      );
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleEdit(transaction) {
    setEditId(transaction.id);
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setCategory(transaction.category);
    setNote(transaction.note || "");
    setDate(transaction.date?.split("T")[0] || "");
  }
  function handleCancelEdit() {
    setEditId(null);
    setAmount("");
    setType("expense");
    setCategory("");
    setNote("");
    setDate("");
    setIsRecurring(false);
    setRecurringInterval("");
  }
  async function handleAddCategory() {
    if (!name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    setSubmittingCategory(true);
    try {
      await apiFetch(`http://localhost:8000/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          name,
        }),
      });
      toast.success("Category added");
      fetchCategories();
      setName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingCategory(false);
    }
  }
  async function handleDeleteCategory(category_id) {
    const cat = categories.find((c) => c.id === category_id);
    if (!cat) return;

    try {
      const relatedTx = transactions.filter((t) => t.category === cat.name);

      const budgetsRes = await apiFetch(
        `http://localhost:8000/budgets/?base_currency=${baseCurrency}`,
      );
      const budgetsData = await budgetsRes.json();
      const relatedBudgets = budgetsData.filter(
        (b: any) => b.category === cat.name,
      );

    const txCount = relatedTx.length;
    const budgetCount = relatedBudgets.length;

    if (txCount > 0 || budgetCount > 0) {
      const txLabel = `${txCount} transaction${txCount !== 1 ? "s" : ""}`;
      const budgetLabel = `${budgetCount} budget${budgetCount !== 1 ? "s" : ""}`;
      const proceed = await confirm({
        title: `Delete "${cat.name}"?`,
        message: `This category has ${txLabel} and ${budgetLabel}. Deleting it will also remove them. This cannot be undone.`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (!proceed) return;

      // Cascade delete related transactions and budgets
      await Promise.all([
        ...relatedTx.map((t) =>
          apiFetch(
            `http://localhost:8000/transactions/${t.id}`,
            { method: "DELETE" },
          ),
        ),
        ...relatedBudgets.map((b: any) =>
          apiFetch(
            `http://localhost:8000/budgets/${b.id}`,
            { method: "DELETE" },
          ),
        ),
      ]);
    }

      await apiFetch(
        `http://localhost:8000/categories/${category_id}`,
        { method: "DELETE" },
      );
      toast.success(`Category "${cat.name}" deleted`);
      fetchCategories();
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    }
  }
  const inputClass =
    "border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] bg-white dark:bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]";

  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-40 bg-gray-200 dark:bg-[#222] rounded mb-2" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-[#222] rounded" />
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6 mb-6 h-40" />
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6 mb-6 h-32" />
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm h-64" />
      </div>
    );
  }

  const displayedTransactions = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inNote = (t.note ?? "").toLowerCase().includes(q);
      const inCategory = (t.category ?? "").toLowerCase().includes(q);
      if (!inNote && !inCategory) return false;
    }
    return true;
  });

  return (
    <div className="font-[Inter]">
      {/* Page header */}
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Transactions
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          Manage your income and expenses
        </p>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Add / Update Transaction */}
      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {editId ? "Update Transaction" : "Add Transaction"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div>
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputClass} w-full ${
                fieldErrors.amount
                  ? "border-red-500 dark:border-red-500"
                  : ""
              }`}
            />
            {fieldErrors.amount && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {fieldErrors.amount}
              </p>
            )}
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
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
              <option value="">Select category</option>
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
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRecurring(!is_recurring)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                is_recurring
                  ? "bg-[#e8643a] text-white border border-transparent hover:bg-[#d2552d]"
                  : "bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[#222]"
              }`}
            >
              {is_recurring ? "Recurring" : "Recurring"}
            </button>
            {is_recurring && (
              <select
                value={recurring_interval}
                onChange={(e) => setRecurringInterval(e.target.value)}
                className={inputClass}
              >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
            )}
          </div>
          <div className="flex gap-2 sm:justify-end">
            {editId !== null && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-sm font-semibold text-gray-700 dark:text-white bg-white dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? editId
                  ? "Updating..."
                  : "Adding..."
                : editId
                  ? "Update Transaction"
                  : "Add Transaction"}
            </button>
          </div>
        </div>
      </section>

      {/* Category Management */}
      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-white mb-3">
          Categories
        </h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="New category"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} flex-1`}
          />
          <button
            onClick={() => handleAddCategory()}
            disabled={submittingCategory}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submittingCategory ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add
          </button>
        </div>
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-sm text-gray-700 dark:text-[#e0e0e0]"
              >
                {cat.name}
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-gray-400 dark:text-[#666] hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label={`Delete ${cat.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            No categories yet — add one above.
          </p>
        )}
      </section>

      {/* Search + filter + sort */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-white mb-3">
        All Transactions
      </h2>
      <div className="flex flex-col gap-2 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#666]" />
          <input
            type="search"
            placeholder="Search by note or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex gap-1">
            {(
              [
                ["all", "All"],
                ["income", "Income"],
                ["expense", "Expense"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTypeFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === key
                    ? "bg-emerald-500 dark:bg-[#e8643a] text-white"
                    : "bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-50 dark:hover:bg-[#222]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#a0a0a0]">
            Sort by
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className={inputClass}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Amount High to Low</option>
              <option value="amount-low">Amount Low to High</option>
              <option value="category-az">Category A-Z</option>
            </select>
          </label>
        </div>
      </div>

      {/* Transactions table */}
      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm overflow-hidden">
        {displayedTransactions.length > 0 ? (
          <div className="overflow-auto max-h-[260px] thin-scrollbar">
            <table className="w-full text-sm min-w-[640px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-[#222] border-b border-gray-200 dark:border-[#2a2a2a]">
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-white">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-white">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-white">
                  Category
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-white">
                  Amount
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-white">
                  Note
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedTransactions.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-100 dark:border-[#222] last:border-b-0 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                >
                  <td className="px-4 py-3 text-gray-700 dark:text-[#e0e0e0] whitespace-nowrap">
                    {formatDate(t.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-[#e0e0e0]">
                    <span className="inline-flex items-center gap-2">
                      <span className="capitalize">{t.type}</span>
                      {t.is_recurring && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#e8643a] text-white text-xs font-medium">
                          Recurring
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-[#e0e0e0]">
                    {t.category}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      t.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(t.amount, baseCurrency)}
                  </td>
                  <td
                    className={`px-4 py-3 text-gray-500 dark:text-[#a0a0a0] ${
                      t.note && t.note.length > 30
                        ? "cursor-pointer hover:text-gray-700 dark:hover:text-white"
                        : ""
                    }`}
                    onClick={() => {
                      if (t.note && t.note.length > 30) {
                        setExpanded((prev) => ({
                          ...prev,
                          [t.id]: !prev[t.id],
                        }));
                      }
                    }}
                  >
                    {t.note && t.note.length > 30 && !expanded[t.id]
                      ? `${t.note.slice(0, 30)}...`
                      : t.note}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 dark:border-[#2a2a2a] text-xs font-medium text-gray-600 dark:text-[#e0e0e0] bg-white dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-[#0f0f0f] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
              {transactions.length === 0
                ? "No transactions yet — add your first one above."
                : "No transactions match your search or filter."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Transactions;
