import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction, ReactNode } from "react";
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
  MoreVertical,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDate, fetchBaseCurrency } from "../lib/utils";
import { apiFetch, API_BASE } from "../lib/api";
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

// ─── TransactionForm ─────────────────────────────────────────────────────────

type TransactionFormProps = {
  amount: string;
  setAmount: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  is_recurring: boolean;
  setIsRecurring: (v: boolean) => void;
  recurring_interval: string;
  setRecurringInterval: (v: string) => void;
  fieldErrors: FieldErrors;
  setFieldErrors: Dispatch<SetStateAction<FieldErrors>>;
  submitting: boolean;
  editId: number | null;
  categories: any[];
  onSubmit: () => void;
  onCancel: () => void;
  onAddCategory: (name: string, emoji: string) => Promise<void>;
  onDeleteCategory: (id: any) => Promise<void>;
  onUpdateCategoryEmoji: (id: number, emoji: string) => Promise<void>;
};

function TransactionForm({
  amount,
  setAmount,
  type,
  setType,
  category,
  setCategory,
  note,
  setNote,
  date,
  setDate,
  is_recurring,
  setIsRecurring,
  recurring_interval,
  setRecurringInterval,
  fieldErrors,
  setFieldErrors,
  submitting,
  editId,
  categories,
  onSubmit,
  onCancel,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategoryEmoji,
}: TransactionFormProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("💼");
  const [emojiEditingId, setEmojiEditingId] = useState<number | "new" | null>(
    null,
  );
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  const recurringDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCategoryDropdown(false);
        setShowAddCategory(false);
        setNewCategoryName("");
        setEmojiEditingId(null);
      }
      if (
        recurringDropdownRef.current &&
        !recurringDropdownRef.current.contains(e.target as Node)
      ) {
        setShowRecurringDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showAddCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [showAddCategory]);

  async function handleAddCategoryLocal() {
    if (!newCategoryName.trim()) return;
    setSubmittingCategory(true);
    try {
      await onAddCategory(newCategoryName.trim(), newCategoryEmoji);
      setNewCategoryName("");
      setNewCategoryEmoji("💼");
      setShowAddCategory(false);
      setShowCategoryDropdown(false);
    } catch {
      // error handled by parent
    } finally {
      setSubmittingCategory(false);
    }
  }

  async function handlePickEmoji(emoji: string) {
    if (emojiEditingId === "new") {
      setNewCategoryEmoji(emoji);
    } else if (typeof emojiEditingId === "number") {
      await onUpdateCategoryEmoji(emojiEditingId, emoji);
    }
    setEmojiEditingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-[#a0a0a0] mb-1.5 uppercase tracking-wide">
          {t("transactions.amountLabel")}
        </label>
        <input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setFieldErrors((p) => ({ ...p, amount: undefined }));
          }}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none transition-colors focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            fieldErrors.amount
              ? "border-red-400 dark:border-red-500/60 focus:ring-red-400/30 dark:focus:ring-red-500/20"
              : "border-gray-300 dark:border-[var(--bd)] focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a]"
          }`}
        />
        {fieldErrors.amount && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">
            {fieldErrors.amount}
          </p>
        )}
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-[#a0a0a0] mb-1.5 uppercase tracking-wide">
          {t("transactions.typeLabel")}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              type === "expense"
                ? "bg-red-500 text-white"
                : "bg-gray-100 dark:bg-[var(--bg-muted)] text-gray-500 dark:text-[#a0a0a0] hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)]"
            }`}
          >
            {t("transactions.expense")}
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              type === "income"
                ? "bg-emerald-500 dark:bg-emerald-600 text-white"
                : "bg-gray-100 dark:bg-[var(--bg-muted)] text-gray-500 dark:text-[#a0a0a0] hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)]"
            }`}
          >
            {t("transactions.income")}
          </button>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-[#a0a0a0] mb-1.5 uppercase tracking-wide">
          {t("transactions.categoryLabel")}
        </label>
        <div className="relative" ref={categoryDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowCategoryDropdown((p) => !p);
              setShowAddCategory(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-[var(--bg-page)] outline-none transition-colors ${
              fieldErrors.category
                ? "border-red-400 dark:border-red-500/60"
                : "border-gray-300 dark:border-[var(--bd)]"
            } ${
              category
                ? "text-gray-900 dark:text-white"
                : fieldErrors.category
                  ? "text-red-400"
                  : "text-gray-400 dark:text-[#555]"
            }`}
          >
            {category || t("transactions.selectCategory")}
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${showCategoryDropdown ? "rotate-180" : ""}`}
            />
          </button>
          {fieldErrors.category && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              {fieldErrors.category}
            </p>
          )}

          {showCategoryDropdown && (
            <div className="thin-scrollbar absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 overflow-hidden py-1">
              {emojiEditingId !== null ? (
                <div>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-[var(--bd)]">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#a0a0a0]">
                      {t("transactions.pickEmoji")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEmojiEditingId(null)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <EmojiPicker
                    width="100%"
                    height={300}
                    onEmojiClick={(d) => handlePickEmoji(d.emoji)}
                    theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                    lazyLoadEmojis
                  />
                </div>
              ) : (
                <>
                  {categories.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="group w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmojiEditingId(cat.id);
                            }}
                            className="w-7 h-7 shrink-0 rounded-md hover:bg-gray-200 dark:hover:bg-[var(--bg-muted)] flex items-center justify-center text-base leading-none select-none"
                            title="Change emoji"
                          >
                            {cat.emoji || "💼"}
                          </button>
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
                            className="flex-1 text-left flex items-center justify-between min-w-0"
                          >
                            <span className="truncate">{cat.name}</span>
                            {category === cat.name && (
                              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a] shrink-0 mr-1" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCategory(cat.id);
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
                      {t("transactions.noCategoriesYet")}
                    </p>
                  )}
                  <div className="h-px bg-gray-100 dark:bg-[var(--bg-muted)] mx-2 my-1" />
                  {!showAddCategory ? (
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-[#e8643a] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t("transactions.addNewCategory")}
                    </button>
                  ) : (
                    <div className="px-2 pb-2 pt-1">
                      <div className="flex gap-1.5 items-center">
                        <button
                          type="button"
                          onClick={() => setEmojiEditingId("new")}
                          className="w-7 h-7 shrink-0 rounded-md bg-gray-100 dark:bg-[var(--bg-muted)] hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] flex items-center justify-center text-base leading-none select-none"
                          title={t("transactions.pickEmoji")}
                        >
                          {newCategoryEmoji}
                        </button>
                        <input
                          ref={newCategoryInputRef}
                          type="text"
                          placeholder={t(
                            "transactions.categoryNamePlaceholder",
                          )}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddCategoryLocal();
                            if (e.key === "Escape") {
                              setShowAddCategory(false);
                              setNewCategoryName("");
                            }
                          }}
                          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a]"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategoryLocal}
                          disabled={
                            submittingCategory || !newCategoryName.trim()
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-xs font-semibold disabled:opacity-50 hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
                        >
                          {submittingCategory ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            t("common.add")
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
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-[#a0a0a0] mb-1.5 uppercase tracking-wide">
          {t("transactions.dateLabel")}
        </label>
        <div className="overflow-hidden rounded-xl border border-gray-300 dark:border-[var(--bd)] focus-within:ring-2 focus-within:ring-emerald-500/30 dark:focus-within:ring-[#e8643a]/30 focus-within:border-emerald-500 dark:focus-within:border-[#e8643a] transition-colors">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white outline-none dark:[color-scheme:dark]"
          />
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-[#a0a0a0] mb-1.5 uppercase tracking-wide">
          {t("transactions.noteLabel")}{" "}
          <span className="normal-case font-normal text-gray-400 dark:text-[#555]">
            {t("transactions.noteOptional")}
          </span>
        </label>
        <input
          type="text"
          placeholder={t("transactions.notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a] transition-colors"
        />
      </div>

      {/* Recurring */}
      <div className="relative" ref={recurringDropdownRef}>
        <label className="block text-xs font-semibold text-gray-500 dark:text-[#a0a0a0] mb-1.5 uppercase tracking-wide">
          {t("transactions.recurringLabel")}
        </label>
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
          className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm rounded-xl border transition-colors ${
            is_recurring
              ? "border-emerald-500 dark:border-[#e8643a] text-emerald-600 dark:text-[#e8643a] bg-emerald-50 dark:bg-[#e8643a]/10"
              : "border-gray-300 dark:border-[var(--bd)] text-gray-500 dark:text-[#a0a0a0] bg-white dark:bg-[var(--bg-page)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]"
          }`}
        >
          <RefreshCw
            className={`w-4 h-4 shrink-0 ${is_recurring ? "animate-spin-slow" : ""}`}
          />
          {is_recurring
            ? `${t("transactions.recurringLabel")} · ${recurring_interval}`
            : t("transactions.notRecurring")}
        </button>
        {showRecurringDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
            {["daily", "weekly", "monthly"].map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => {
                  setRecurringInterval(interval);
                  setShowRecurringDropdown(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors capitalize"
              >
                {interval}
                {recurring_interval === interval && (
                  <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a]" />
                )}
              </button>
            ))}
            <div className="h-px bg-gray-100 dark:bg-[var(--bg-muted)] mx-2 my-1" />
            <button
              type="button"
              onClick={() => {
                setIsRecurring(false);
                setShowRecurringDropdown(false);
              }}
              className="w-full px-3 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors text-left"
            >
              {t("transactions.turnOff")}
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 w-24 py-2.5 rounded-xl border border-gray-300 dark:border-[var(--bd)] text-sm font-semibold text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {submitting
            ? editId
              ? t("transactions.updatingBtn")
              : t("transactions.addingBtn")
            : editId
              ? t("transactions.updateBtn")
              : t("transactions.addBtn")}
        </button>
      </div>
    </div>
  );
}

// ─── TransactionModal ─────────────────────────────────────────────────────────

type TransactionModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

function TransactionModal({
  open,
  onClose,
  title,
  children,
}: TransactionModalProps) {
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const t = setTimeout(() => setRendered(false), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!visible || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [visible]);

  if (!rendered) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full max-w-md bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-gray-200 dark:border-[var(--bd)] transition-all duration-200 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[var(--bd)]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 overflow-y-auto max-h-[calc(100vh-8rem)] thin-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function Transactions() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const emojiByCategory = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c: any) => {
      if (c?.name && c?.emoji) map[c.name.toLowerCase()] = c.emoji;
    });
    return map;
  }, [categories]);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form fields
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [is_recurring, setIsRecurring] = useState(false);
  const [recurring_interval, setRecurringInterval] = useState(
    t("budget.periodMonthly"),
  );
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");

  // Inline bar dropdown state (xl+ only)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("💼");
  const [emojiEditingId, setEmojiEditingId] = useState<number | "new" | null>(
    null,
  );
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const recurringDropdownRef = useRef<HTMLDivElement>(null);

  // Sort / type-filter dropdown state
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [showTypeFilterDropdown, setShowTypeFilterDropdown] = useState(false);
  const typeFilterDropdownRef = useRef<HTMLDivElement>(null);

  const initialSortMount = useRef(true);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  // Close inline-bar dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCategoryDropdown(false);
        setShowAddCategory(false);
        setNewCategoryName("");
        setEmojiEditingId(null);
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
      if (
        typeFilterDropdownRef.current &&
        !typeFilterDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTypeFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showAddCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [showAddCategory]);

  const fetchTransactions = useCallback(
    async (sortDir: "newest" | "oldest" = "newest") => {
      try {
        const response = await apiFetch(
          `${API_BASE}/transactions/?base_currency=${baseCurrency}&sort=${sortDir}`,
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
      const response = await apiFetch(`${API_BASE}/categories/`, {
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
          `${API_BASE}/transactions/?base_currency=${currency}&sort=newest`,
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

  // Per-card kebab menu (mobile/tablet) uses fixed positioning so it escapes
  // the card list's overflow-y-auto clipping. Anchor coords come from the
  // button's getBoundingClientRect at open time. Menu width is 128px (w-32).
  function openTxMenu(e: React.MouseEvent, txId: number) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 128 });
    setOpenMenuId(txId);
  }

  function closeTxMenu() {
    setOpenMenuId(null);
    setMenuPos(null);
  }

  useEffect(() => {
    if (openMenuId === null) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Clicks on any kebab button are handled by its onClick (toggle/switch);
      // don't close here or we'd cancel the toggle.
      if (target.closest("[data-tx-kebab]")) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        closeTxMenu();
      }
    }
    function onScroll() {
      closeTxMenu();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    // capture: true so scroll on inner overflow containers also dismisses.
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openMenuId]);

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

  function closeModal() {
    setShowModal(false);
    resetForm();
    setTimeout(() => addBtnRef.current?.focus(), 250);
  }

  async function handleSubmit() {
    const errs: FieldErrors = {};
    const amt = Number(amount);
    const now = new Date();
    const currentTime = now.toTimeString().split(" ")[0];
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
        await apiFetch(`${API_BASE}/transactions/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            amount: amt,
            type,
            category,
            note,
            date: `${effectiveDate}T${currentTime}`,
            is_recurring,
            recurring_interval,
            currency: baseCurrency,
          }),
        });
        toast.success(t("transactions.toastAdded"));
      } else {
        await apiFetch(`${API_BASE}/transactions/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            amount: amt,
            type,
            category,
            note,
            date: `${effectiveDate}T${currentTime}`,
            is_recurring,
            recurring_interval,
          }),
        });
        toast.success(t("transactions.toastUpdated"));
      }
      fetchTransactions();
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const proceed = await confirm({
      title: t("transactions.deleteTitle"),
      message: t("transactions.deleteMsg"),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (!proceed) return;
    try {
      await apiFetch(`${API_BASE}/transactions/${id}`, {
        method: "DELETE",
      });
      fetchTransactions();
      toast.success(t("transactions.toastDeleted"));
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
    if (window.innerWidth < 1280) {
      setShowModal(true);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function addCategory(name: string, emoji: string = "💼") {
    try {
      await apiFetch(`${API_BASE}/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, name, emoji }),
      });
      toast.success("Category added");
      await fetchCategories();
      setCategory(name);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }

  async function handleUpdateCategoryEmoji(id: number, emoji: string) {
    try {
      await apiFetch(`${API_BASE}/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      await fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setSubmittingCategory(true);
    try {
      await addCategory(newCategoryName.trim(), newCategoryEmoji);
      setNewCategoryName("");
      setNewCategoryEmoji("💼");
      setShowAddCategory(false);
      setShowCategoryDropdown(false);
    } catch {
      // error handled in addCategory
    } finally {
      setSubmittingCategory(false);
    }
  }

  async function handlePickEmojiInline(emoji: string) {
    if (emojiEditingId === "new") {
      setNewCategoryEmoji(emoji);
    } else if (typeof emojiEditingId === "number") {
      await handleUpdateCategoryEmoji(emojiEditingId, emoji);
    }
    setEmojiEditingId(null);
  }

  async function handleDeleteCategory(category_id: any) {
    const cat = categories.find((c) => c.id === category_id);
    if (!cat) return;

    try {
      const relatedTx = transactions.filter((t) => t.category === cat.name);

      const budgetsRes = await apiFetch(
        `${API_BASE}/budgets/?base_currency=${baseCurrency}`,
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

        await Promise.all([
          ...relatedTx.map((t) =>
            apiFetch(`${API_BASE}/transactions/${t.id}`, {
              method: "DELETE",
            }),
          ),
          ...relatedBudgets.map((b: any) =>
            apiFetch(`${API_BASE}/budgets/${b.id}`, {
              method: "DELETE",
            }),
          ),
        ]);
      }

      await apiFetch(`${API_BASE}/categories/${category_id}`, {
        method: "DELETE",
      });
      toast.success(`Category "${cat.name}" deleted`);
      fetchCategories();
      fetchTransactions();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const Divider = () => (
    <div className="hidden sm:block w-px bg-gray-300 dark:bg-[var(--bd)] self-stretch my-2 shrink-0" />
  );

  const sortLabels: Record<SortKey, string> = {
    newest: t("transactions.sortNewest"),
    oldest: t("transactions.sortOldest"),
    "amount-high": t("transactions.sortAmountHigh"),
    "amount-low": t("transactions.sortAmountLow"),
    "category-az": t("transactions.sortCategoryAZ"),
  };

  const sortShort: Record<SortKey, string> = {
    newest: t("transactions.sortNewestShort"),
    oldest: t("transactions.sortOldestShort"),
    "amount-high": t("transactions.sortAmountHighShort"),
    "amount-low": t("transactions.sortAmountLowShort"),
    "category-az": t("transactions.sortCategoryAZShort"),
  };

  const hasFieldError = fieldErrors.amount || fieldErrors.category;

  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-40 bg-gray-200 dark:bg-[var(--bg-muted)] rounded mb-2" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-[var(--bg-muted)] rounded" />
        </div>
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-6 mb-6 h-16" />
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm h-64 mt-6" />
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
      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {/* ── SECTION HEADING ── */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a0a0a0] mb-2">
        {t("transactions.sectionAdd")}
      </p>

      {/* Mobile / tablet trigger button — hidden at xl+ */}
      <button
        ref={addBtnRef}
        type="button"
        onClick={() => setShowModal(true)}
        className="xl:hidden w-full flex items-center justify-center gap-2 mb-4 px-4 py-3 rounded-xl bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t("transactions.addBtn")}
      </button>

      {/* ── UNIFIED INPUT BAR (xl+ only) ── */}
      <div className="mb-1 hidden xl:block">
        <div
          className={`
            flex flex-col sm:flex-row items-stretch sm:items-center
            border border-gray-300 dark:border-[var(--bd)]
            rounded-xl overflow-visible
            bg-white dark:bg-[var(--bg-surface)]
            shadow-sm
            transition-all duration-150
            ${hasFieldError ? "border-red-400 dark:border-red-500/60 ring-1 ring-red-400/30 dark:ring-red-500/20" : ""}
          `}
        >
          {/* ─── ROW 1: Amount · Type · Category ─── */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center flex-1 min-w-0">
            {/* Amount */}
            <input
              type="number"
              placeholder={t("transactions.amountLabel")}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFieldErrors((p) => ({ ...p, amount: undefined }));
              }}
              className={`
                w-full sm:flex-1 min-w-[200px] px-3.5 py-2.5 text-sm
                bg-transparent border-none outline-none
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-[#555]
                sm:text-left
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              `}
            />

            <Divider />

            {/* Type toggle — Expense / Income */}
            <div className="flex w-full justify-between items-center px-3 py-2 sm:w-auto sm:py-0 sm:px-2 sm:shrink-0">
              <span className="sm:hidden text-sm font-medium text-gray-500 dark:text-[#a0a0a0]">
                Type
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    type === "expense"
                      ? "bg-red-500 text-white"
                      : "text-gray-500 dark:text-[#666] hover:text-gray-700 dark:hover:text-[#aaa]"
                  }`}
                >
                  {t("transactions.expense")}
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
                  {t("transactions.income")}
                </button>
              </div>
            </div>

            <Divider />

            {/* Category custom dropdown */}
            <div
              className="relative shrink-0 w-full sm:w-auto"
              ref={categoryDropdownRef}
            >
              <button
                type="button"
                onClick={() => {
                  setShowCategoryDropdown((p) => !p);
                  setShowAddCategory(false);
                }}
                className={`
                  w-full sm:w-auto flex items-center gap-1.5 px-3 py-2.5 text-sm
                  justify-between text-center
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
                {category || t("transactions.selectCategory")}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${showCategoryDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showCategoryDropdown && (
                <div className="thin-scrollbar absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-64 bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 overflow-hidden py-1">
                  {emojiEditingId !== null ? (
                    <div>
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-[var(--bd)]">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#a0a0a0]">
                          {t("transactions.pickEmoji")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEmojiEditingId(null)}
                          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <EmojiPicker
                        width="100%"
                        height={300}
                        onEmojiClick={(d) => handlePickEmojiInline(d.emoji)}
                        theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                        lazyLoadEmojis
                      />
                    </div>
                  ) : (
                    <>
                      {categories.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {categories.map((cat) => (
                            <div
                              key={cat.id}
                              className="group w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmojiEditingId(cat.id);
                                }}
                                className="w-7 h-7 shrink-0 rounded-md hover:bg-gray-200 dark:hover:bg-[var(--bg-muted)] flex items-center justify-center text-base leading-none select-none"
                                title="Change emoji"
                              >
                                {cat.emoji || "💼"}
                              </button>
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
                                className="flex-1 text-left flex items-center justify-between min-w-0"
                              >
                                <span className="truncate">{cat.name}</span>
                                {category === cat.name && (
                                  <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a] shrink-0 mr-1" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat.id);
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
                          {t("transactions.noCategoriesYet")}
                        </p>
                      )}
                      <div className="h-px bg-gray-100 dark:bg-[var(--bg-muted)] mx-2 my-1" />
                      {!showAddCategory ? (
                        <button
                          type="button"
                          onClick={() => setShowAddCategory(true)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-[#e8643a] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors font-medium"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {t("transactions.addNewCategory")}
                        </button>
                      ) : (
                        <div className="px-2 pb-2 pt-1">
                          <div className="flex gap-1.5 items-center">
                            <button
                              type="button"
                              onClick={() => setEmojiEditingId("new")}
                              className="w-7 h-7 shrink-0 rounded-md bg-gray-100 dark:bg-[var(--bg-muted)] hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] flex items-center justify-center text-base leading-none select-none"
                              title={t("transactions.pickEmoji")}
                            >
                              {newCategoryEmoji}
                            </button>
                            <input
                              ref={newCategoryInputRef}
                              type="text"
                              placeholder={t(
                                "transactions.categoryNamePlaceholder",
                              )}
                              value={newCategoryName}
                              onChange={(e) =>
                                setNewCategoryName(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddCategory();
                                if (e.key === "Escape") {
                                  setShowAddCategory(false);
                                  setNewCategoryName("");
                                }
                              }}
                              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a]"
                            />
                            <button
                              type="button"
                              onClick={handleAddCategory}
                              disabled={
                                submittingCategory || !newCategoryName.trim()
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-xs font-semibold disabled:opacity-50 hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
                            >
                              {submittingCategory ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                t("common.add")
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── Cross-row separator ─── */}
          <div className="sm:hidden h-px bg-gray-300 dark:bg-[var(--bd)]" />
          <div className="hidden sm:block w-px bg-gray-300 dark:bg-[var(--bd)] self-stretch my-2 shrink-0" />

          {/* ─── ROW 2: Date · Note · Recurring · Actions ─── */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center">
            {/* Date */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="
              w-full min-w-0 max-w-full
              sm:w-40 sm:max-w-none sm:mx-0
              px-3 py-2.5
              text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white dark:[color-scheme:dark]"
            />

            <Divider />

            {/* Note */}
            <input
              type="text"
              placeholder={`${t("transactions.noteLabel")} ${t("transactions.noteOptional")}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full sm:w-40 min-w-0 px-3.5 py-2.5 text-sm lg:text-left bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555]"
            />

            <Divider />

            {/* Recurring toggle */}
            <div
              className="relative w-full flex justify-between items-center sm:w-auto sm:shrink-0"
              ref={recurringDropdownRef}
            >
              <span className="sm:hidden text-sm font-medium text-gray-500 dark:text-[#a0a0a0] pl-3">
                Recurring
              </span>
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

              {showRecurringDropdown && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-36 bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {[
                    t("budget.periodDaily"),
                    t("budget.periodWeekly"),
                    t("budget.periodMonthly"),
                  ].map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      onClick={() => {
                        setRecurringInterval(interval);
                        setShowRecurringDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors capitalize"
                    >
                      {interval}
                      {recurring_interval === interval && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a]" />
                      )}
                    </button>
                  ))}
                  <div className="h-px bg-gray-100 dark:bg-[var(--bg-muted)] mx-2 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecurring(false);
                      setShowRecurringDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors text-left"
                  >
                    {t("transactions.turnOff")}
                  </button>
                </div>
              )}
            </div>

            <Divider />

            {/* Submit section */}
            {editId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="hidden sm:block mr-1 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 dark:text-[#aaa] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors"
              >
                {t("common.cancel")}
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 w-[calc(100%-1.5rem)] sm:w-auto mx-3 mb-3 mt-3 sm:mt-0 sm:mx-0 sm:mb-0 sm:mr-3.5 px-4 py-2.5 sm:py-1.5 rounded-lg bg-emerald-500 sm:bg-transparent dark:bg-[#e8643a] sm:dark:bg-transparent text-white hover:text-white sm:text-gray-600 sm:dark:text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {submitting
                ? editId
                  ? t("transactions.updatingBtn")
                  : t("transactions.addingBtn")
                : editId
                  ? t("transactions.updateBtn")
                  : t("common.add")}
            </button>
          </div>
        </div>

        {/* Inline validation message */}
        {hasFieldError && (
          <p className="mt-1.5 ml-1 text-xs text-center sm:text-left text-red-500 dark:text-red-400">
            {[fieldErrors.amount, fieldErrors.category]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      {/* ── MODAL (below xl) ── */}
      <TransactionModal
        open={showModal}
        onClose={closeModal}
        title={
          editId
            ? t("transactions.editModalTitle")
            : t("transactions.addModalTitle")
        }
      >
        <TransactionForm
          amount={amount}
          setAmount={setAmount}
          type={type}
          setType={setType}
          category={category}
          setCategory={setCategory}
          note={note}
          setNote={setNote}
          date={date}
          setDate={setDate}
          is_recurring={is_recurring}
          setIsRecurring={setIsRecurring}
          recurring_interval={recurring_interval}
          setRecurringInterval={setRecurringInterval}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          submitting={submitting}
          editId={editId}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          onAddCategory={addCategory}
          onDeleteCategory={handleDeleteCategory}
          onUpdateCategoryEmoji={handleUpdateCategoryEmoji}
        />
      </TransactionModal>

      {/* ── SECTION HEADING ── */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a0a0a0] mt-5 mb-2">
        {t("transactions.sectionHistory")}
      </p>

      {/* ── TRANSACTION TABLE ── */}
      <section className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm">
        {/* Table toolbar */}
        <div className="px-3 py-1 border-b border-gray-200 dark:border-[var(--bd)] flex items-center gap-3">
          <div className="flex flex-1 min-w-0 items-center">
            {/* Type filter pill */}
            <div className="relative shrink-0" ref={typeFilterDropdownRef}>
              <button
                type="button"
                onClick={() => setShowTypeFilterDropdown((p) => !p)}
                className="flex items-center gap-1 pl-2.5 pr-2 py-1.5 text-xs font-semibold text-gray-
          -500 dark:text-[#a0a0a0] border-r border-gray-200 dark:border-[var(--bd)] hover:text-gray-900 dark:hove
          -r:text-white transition-colors whitespace-nowrap capitalize"
              >
                {typeFilter === "all" ? "All" : typeFilter}
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${showTypeFilterDropdown ? "rotate-180" : ""}`}
                />
              </button>
              {showTypeFilterDropdown && (
                <div className="absolute top-full left-0 mt-1.5 w-28 bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {(["all", "income", "expense"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setTypeFilter(key);
                        setShowTypeFilterDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors text-left capitalize"
                    >
                      {key === "all"
                        ? t(`transactions.filterAll`)
                        : t(
                            `transactions.filter${key.charAt(0).toUpperCase() + key.slice(1)}`,
                          )}
                      {typeFilter ===
                        t(
                          `transactions.filter${key.charAt(0).toUpperCase() + key.slice(1)}`,
                        ) && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#555] pointer-events-none" />
              <input
                type="search"
                placeholder={t("transactions.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555]"
              />
            </div>

            {/* Sort pill */}
            <div className="relative shrink-0" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setShowSortDropdown((p) => !p)}
                className="flex items-center gap-1 pl-2 pr-2.5 py-1.5 text-xs font-semibold text-gray-
          -500 dark:text-[#a0a0a0] border-l border-gray-200 dark:border-[var(--bd)] hover:text-gray-900 dark:hove
          -r:text-white transition-colors whitespace-nowrap"
              >
                {sortShort[sortBy]}
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${showSortDropdown ? "rotate-180" : ""}`}
                />
              </button>
              {showSortDropdown && (
                <div className="absolute top-full right-0 mt-1.5 w-44 bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSortBy(key);
                        setShowSortDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors text-left"
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
        </div>

        {displayedTransactions.length > 0 ? (
          <>
            {/* ── Desktop: table view ── */}
            <div
              className="hidden lg:block overflow-auto thin-scrollbar"
              style={{ maxHeight: "calc(100vh - 360px)", minHeight: "200px" }}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-[var(--bg-muted)] border-b border-gray-200 dark:border-[var(--bd)]">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      {t("transactions.tableDate")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      {t("transactions.tableType")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      {t("transactions.tableCategory")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      {t("transactions.tableNote")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      {t("transactions.tableAmount")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      {t("transactions.tableActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`border-b border-gray-100 dark:border-[var(--bd)] last:border-b-0 hover:bg-gray-50/80 dark:hover:bg-[var(--bg-hover)] transition-colors ${
                        editId === tx.id
                          ? "bg-emerald-50/40 dark:bg-[#e8643a]/5"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-500 dark:text-[#e0e0e0] whitespace-nowrap text-xs">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${
                            tx.type === "income"
                              ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {tx.type === "income"
                            ? t("transactions.income")
                            : t("transactions.expense")}
                          {tx.is_recurring && (
                            <RefreshCw className="w-2.5 h-2.5 opacity-70" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-[#e0e0e0] text-sm">
                        {tx.category}
                      </td>
                      <td
                        className={`px-4 py-3 text-gray-500 dark:text-[#a0a0a0] text-sm ${
                          tx.note && tx.note.length > 30
                            ? "cursor-pointer hover:text-gray-700 dark:hover:text-white"
                            : ""
                        }`}
                        onClick={() => {
                          if (tx.note && tx.note.length > 30) {
                            setExpanded((prev) => ({
                              ...prev,
                              [tx.id]: !prev[tx.id],
                            }));
                          }
                        }}
                      >
                        {tx.note && tx.note.length > 30 && !expanded[tx.id]
                          ? `${tx.note.slice(0, 30)}…`
                          : tx.note || (
                              <span className="text-gray-300 dark:text-[#444]">
                                —
                              </span>
                            )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          tx.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {tx.type === "expense" ? "-" : "+"}
                        {formatCurrency(tx.amount, baseCurrency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-300 dark:border-[var(--bd)] text-xs font-medium text-gray-600 dark:text-[#e0e0e0] bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
                          >
                            <Pencil className="w-3 h-3" /> {t("common.edit")}
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-[var(--bg-surface)] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> {t("common.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile / tablet: card view ── */}
            <div
              className="lg:hidden flex flex-col gap-2 overflow-y-auto thin-scrollbar"
              style={{ maxHeight: "calc(100vh - 360px)", minHeight: "200px" }}
            >
              {displayedTransactions.map((tx) => {
                const emoji =
                  emojiByCategory[String(tx.category).toLowerCase()] ||
                  (tx.type === "income" ? "💰" : "💳");
                return (
                  <div
                    key={tx.id}
                    className={`rounded-2xl bg-gray-50 dark:bg-[var(--bg-muted)] px-3.5 py-3 ${
                      editId === tx.id
                        ? "ring-2 ring-emerald-500/40 dark:ring-[#e8643a]/40"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Category emoji icon */}
                      <div
                        className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl ${
                          tx.type === "income"
                            ? "bg-emerald-100 dark:bg-emerald-500/15"
                            : "bg-white dark:bg-[var(--bg-surface)]"
                        }`}
                      >
                        <span aria-hidden="true">{emoji}</span>
                      </div>

                      {/* Title + date */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {tx.category}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[#a0a0a0] flex items-center gap-1 mt-0.5">
                          <span className="truncate">
                            {formatDate(tx.date)}
                          </span>
                          {tx.is_recurring && (
                            <RefreshCw className="w-3 h-3 opacity-70 shrink-0" />
                          )}
                        </p>
                      </div>

                      {/* Amount + kebab */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                            tx.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.type === "expense" ? "-" : "+"}
                          {formatCurrency(tx.amount, baseCurrency)}
                        </span>
                        <button
                          type="button"
                          data-tx-kebab
                          onClick={(e) =>
                            openMenuId === tx.id
                              ? closeTxMenu()
                              : openTxMenu(e, tx.id)
                          }
                          className="p-1 rounded-md text-gray-400 dark:text-[#666] hover:text-gray-600 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-[var(--bg-hover)] transition-colors"
                          aria-label="Transaction options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Note (full, wraps below) */}
                    {tx.note && (
                      <p className="mt-2 ml-14 text-xs text-gray-500 dark:text-[#a0a0a0] break-words leading-relaxed">
                        {tx.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Fixed-position kebab menu (mobile/tablet) — rendered outside
                the scroll container so it can't be clipped. */}
            {openMenuId !== null && menuPos && (
              <div
                ref={menuRef}
                className="lg:hidden fixed z-50 w-32 bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] rounded-xl shadow-lg overflow-hidden py-1"
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                {(() => {
                  const tx = displayedTransactions.find(
                    (t: any) => t.id === openMenuId,
                  );
                  if (!tx) return null;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleEdit(tx);
                          closeTxMenu();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors text-left"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(tx.id);
                          closeTxMenu();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("common.delete")}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </>
        ) : (
          <div className="py-14 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-3">
              <Search className="w-4 h-4 text-gray-400 dark:text-[#555]" />
            </div>
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
              {transactions.length === 0
                ? t("transactions.noTransactions")
                : t("transactions.noTransactionsFilter")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Transactions;
