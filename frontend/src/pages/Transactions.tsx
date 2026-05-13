import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  RefreshCw,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);

  // Form fields
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [is_recurring, setIsRecurring] = useState(false);
  const [recurring_interval, setRecurringInterval] = useState("monthly");
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");

  // Category dropdown state
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  // Recurring dropdown state
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const recurringDropdownRef = useRef<HTMLDivElement>(null);

  // Sort dropdown state
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const initialSortMount = useRef(true);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCategoryDropdown(false);
        setShowAddCategory(false);
        setNewCategoryName("");
      }
      if (
        recurringDropdownRef.current &&
        !recurringDropdownRef.current.contains(e.target as Node)
      ) {
        setShowRecurringDropdown(false);
      }
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus new category input when shown
  useEffect(() => {
    if (showAddCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [showAddCategory]);

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
      const response = await apiFetch(`http://localhost:8000/categories/`, {
        method: "GET",
      });
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

  function resetForm() {
    setEditId(null);
    setAmount("");
    setType("expense");
    setCategory("");
    setNote("");
    setDate("");
    setIsRecurring(false);
    setRecurringInterval("monthly");
    setFieldErrors({});
  }

  async function handleSubmit() {
    const errs: FieldErrors = {};
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0)
      errs.amount = "Enter a positive amount";
    if (!category) errs.category = "Select a category";
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
        await apiFetch(`http://localhost:8000/transactions/${editId}`, {
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
        });
        toast.success("Transaction updated");
      }
      fetchTransactions();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const proceed = await confirm({
      title: "Delete transaction?",
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!proceed) return;
    try {
      await apiFetch(`http://localhost:8000/transactions/${id}`, {
        method: "DELETE",
      });
      fetchTransactions();
      toast.success("Transaction deleted");
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleEdit(transaction: any) {
    setEditId(transaction.id);
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setCategory(transaction.category);
    setNote(transaction.note || "");
    setDate(transaction.date?.split("T")[0] || "");
    setIsRecurring(transaction.is_recurring || false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setSubmittingCategory(true);
    try {
      await apiFetch(`http://localhost:8000/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          name: newCategoryName.trim(),
        }),
      });
      toast.success("Category added");
      await fetchCategories();
      setCategory(newCategoryName.trim());
      setNewCategoryName("");
      setShowAddCategory(false);
      setShowCategoryDropdown(false);
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
            apiFetch(`http://localhost:8000/transactions/${t.id}`, {
              method: "DELETE",
            }),
          ),
          ...relatedBudgets.map((b: any) =>
            apiFetch(`http://localhost:8000/budgets/${b.id}`, {
              method: "DELETE",
            }),
          ),
        ]);
      }

      await apiFetch(`http://localhost:8000/categories/${category_id}`, {
        method: "DELETE",
      });
      toast.success(`Category "${cat.name}" deleted`);
      fetchCategories();
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Divider between segments
  const Divider = () => (
    <div className="w-px bg-gray-200 dark:bg-[#2a2a2a] self-stretch my-2 shrink-0" />
  );

  const sortLabels: Record<SortKey, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    "amount-high": "Amount ↓",
    "amount-low": "Amount ↑",
    "category-az": "Category A–Z",
  };

  const hasFieldError = fieldErrors.amount || fieldErrors.category;

  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-40 bg-gray-200 dark:bg-[#222] rounded mb-2" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-[#222] rounded" />
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6 mb-6 h-16" />
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm h-64 mt-6" />
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

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {/* ── UNIFIED INPUT BAR ── */}
      <div className="mb-1">
        <div
          className={`
            flex items-center
            border border-gray-200 dark:border-[#2a2a2a]
            rounded-xl overflow-visible
            bg-white dark:bg-[#0f0f0f]
            shadow-sm
            transition-all duration-150
            ${hasFieldError ? "border-red-400 dark:border-red-500/60 ring-1 ring-red-400/30 dark:ring-red-500/20" : ""}
          `}
        >
          {/* Amount */}
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setFieldErrors((p) => ({ ...p, amount: undefined }));
            }}
            className={`
              flex-1 min-w-24 shrink-0 px-3.5 py-2.5 text-sm
              bg-transparent border-none outline-none
              text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-[#555]
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            `}
          />

          <Divider />

          {/* Type toggle — Expense / Income */}
          <div className="flex items-center gap-1 px-2 shrink-0">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                type === "expense"
                  ? "bg-red-500 text-white"
                  : "text-gray-500 dark:text-[#666] hover:text-gray-700 dark:hover:text-[#aaa]"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                type === "income"
                  ? "bg-emerald-500 dark:bg-emerald-600 text-white"
                  : "text-gray-500 dark:text-[#666] hover:text-gray-700 dark:hover:text-[#aaa]"
              }`}
            >
              Income
            </button>
          </div>

          <Divider />

          {/* Category custom dropdown */}
          <div className="relative shrink-0" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowCategoryDropdown((p) => !p);
                setShowAddCategory(false);
              }}
              className={`
                flex items-center gap-1.5 px-3 py-2.5 text-sm
                bg-transparent border-none outline-none
                transition-colors whitespace-nowrap
                ${
                  category
                    ? "text-gray-900 dark:text-white"
                    : fieldErrors.category
                      ? "text-red-400"
                      : "text-gray-400 dark:text-[#555]"
                }
              `}
            >
              {category || "Select category"}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${showCategoryDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown panel */}
            {showCategoryDropdown && (
              <div className="thin-scrollbar absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-lg z-50 overflow-hidden py-1">
                {/* Category list */}
                {categories.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="group w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                      >
                        {/* Selection Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setCategory(cat.name);
                            setShowCategoryDropdown(false);
                            setFieldErrors((p) => ({
                              ...p,
                              category: undefined,
                            }));
                          }}
                          className="flex-1 text-left flex items-center justify-between"
                        >
                          {cat.name}
                          {category === cat.name && (
                            <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a] mr-2" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents selecting the category when deleting
                            handleDeleteCategory(cat.id); // Replace with your actual delete function
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-2 text-xs text-gray-400 dark:text-[#555]">
                    No categories yet
                  </p>
                )}

                {/* Divider */}
                <div className="h-px bg-gray-100 dark:bg-[#2a2a2a] mx-2 my-1" />

                {/* Add new category */}
                {!showAddCategory ? (
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-[#e8643a] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add new category
                  </button>
                ) : (
                  <div className="px-2 pb-2 pt-1">
                    <div className="flex gap-1.5">
                      <input
                        ref={newCategoryInputRef}
                        type="text"
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCategory();
                          if (e.key === "Escape") {
                            setShowAddCategory(false);
                            setNewCategoryName("");
                          }
                        }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={submittingCategory || !newCategoryName.trim()}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-xs font-semibold disabled:opacity-50 hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
                      >
                        {submittingCategory ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategory(false);
                          setNewCategoryName("");
                        }}
                        className="px-2 py-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Divider />

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-36 shrink-0 px-3 py-2.5 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white dark:[color-scheme:dark]"
          />

          <Divider />

          {/* Note */}
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-40 min-w-0 px-3.5 py-2.5 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555]"
          />

          <Divider />

          {/* Recurring toggle */}
          <div className="relative shrink-0" ref={recurringDropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (!is_recurring) {
                  setIsRecurring(true);
                  setShowRecurringDropdown(true);
                } else {
                  setShowRecurringDropdown((p) => !p);
                }
              }}
              title="Recurring transaction"
              className={`flex items-center gap-1.5 px-3 py-2.5 transition-colors text-sm font-medium ${
                is_recurring
                  ? "text-emerald-600 dark:text-[#e8643a]"
                  : "text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#aaa]"
              }`}
            >
              <RefreshCw
                className={`w-4 h-4 ${is_recurring ? "animate-spin-slow" : ""}`}
              />
              {is_recurring && (
                <span className="text-xs">{recurring_interval}</span>
              )}
            </button>

            {/* Recurring interval dropdown */}
            {showRecurringDropdown && (
              <div className="absolute top-full right-0 mt-1.5 w-36 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                {["daily", "weekly", "monthly"].map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => {
                      setRecurringInterval(interval);
                      setShowRecurringDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors capitalize"
                  >
                    {interval}
                    {recurring_interval === interval && (
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a]" />
                    )}
                  </button>
                ))}
                <div className="h-px bg-gray-100 dark:bg-[#2a2a2a] mx-2 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsRecurring(false);
                    setShowRecurringDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors text-left"
                >
                  Turn off
                </button>
              </div>
            )}
          </div>

          <Divider />

          {/* Submit button */}

          {editId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="mr-1 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 dark:text-[#aaa] hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 p-l mr-3.5 px-4 py-1.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {submitting
              ? editId
                ? "Updating..."
                : "Adding..."
              : editId
                ? "Update"
                : "Add"}
          </button>
        </div>

        {/* Inline validation message */}
        {hasFieldError && (
          <p className="mt-1.5 ml-1 text-xs text-red-500 dark:text-red-400">
            {[fieldErrors.amount, fieldErrors.category]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      {/* ── SEARCH / FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-5 mb-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#555] pointer-events-none" />
          <input
            type="search"
            placeholder="Search by note or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a]"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1 shrink-0">
          {(["all", "income", "expense"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTypeFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                typeFilter === key
                  ? "bg-emerald-500 dark:bg-[#e8643a] text-white"
                  : "bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-50 dark:hover:bg-[#222]"
              }`}
            >
              {key === "all" ? "All" : key}
            </button>
          ))}
        </div>

        {/* Sort — custom dropdown */}
        <div className="relative shrink-0" ref={sortDropdownRef}>
          <button
            type="button"
            onClick={() => setShowSortDropdown((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-sm text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors whitespace-nowrap"
          >
            {sortLabels[sortBy]}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${showSortDropdown ? "rotate-180" : ""}`}
            />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full right-0 mt-1.5 w-44 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSortBy(key);
                    setShowSortDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors text-left"
                >
                  {sortLabels[key]}
                  {sortBy === key && (
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TRANSACTION TABLE ── */}
      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm overflow-hidden">
        {displayedTransactions.length > 0 ? (
          <div
            className="overflow-auto thin-scrollbar"
            style={{ maxHeight: "calc(100vh - 340px)", minHeight: "200px" }}
          >
            <table className="w-full text-sm min-w-[600px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-[#222] border-b border-gray-200 dark:border-[#2a2a2a]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#666]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#666]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#666]">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#666]">
                    Note
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#666]">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#666]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b border-gray-100 dark:border-[#1f1f1f] last:border-b-0 hover:bg-gray-50/80 dark:hover:bg-[#222]/60 transition-colors ${
                      editId === t.id
                        ? "bg-emerald-50/40 dark:bg-[#e8643a]/5"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500 dark:text-[#666] whitespace-nowrap text-xs">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${
                          t.type === "income"
                            ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {t.type === "income" ? "Income" : "Expense"}
                        {t.is_recurring && (
                          <RefreshCw className="w-2.5 h-2.5 opacity-70" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-[#e0e0e0] text-sm">
                      {t.category}
                    </td>
                    <td
                      className={`px-4 py-3 text-gray-500 dark:text-[#a0a0a0] text-sm ${
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
                        ? `${t.note.slice(0, 30)}…`
                        : t.note || (
                            <span className="text-gray-300 dark:text-[#444]">
                              —
                            </span>
                          )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold tabular-nums ${
                        t.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {t.type === "expense" ? "-" : "+"}
                      {formatCurrency(t.amount, baseCurrency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 dark:border-[#2a2a2a] text-xs font-medium text-gray-600 dark:text-[#e0e0e0] bg-white dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-[#0f0f0f] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#222] flex items-center justify-center mx-auto mb-3">
              <Search className="w-4 h-4 text-gray-400 dark:text-[#555]" />
            </div>
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
