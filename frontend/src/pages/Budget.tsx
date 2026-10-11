import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import {
  Pencil,
  Trash2,
  Wallet,
  Loader2,
  Plus,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { useTheme } from "../context/ThemeContext";
import { formatCurrency, fetchBaseCurrency, errorMessage } from "../lib/utils";
import { apiFetch, API_BASE } from "../lib/api";
import { useModalTransition } from "../lib/useModalTransition";
import type { Budget as BudgetItem, Category, Transaction } from "../lib/types";
import ErrorBanner from "../components/ErrorBanner";

type BudgetFieldErrors = {
  category?: string;
  limit?: string;
  period?: string;
};

const statusPillClass: Record<string, string> = {
  acceptable:
    "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  caution:
    "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
  warning:
    "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400",
  exceeded: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400",
};

const statusBarColor: Record<string, string> = {
  acceptable: "bg-emerald-500",
  caution: "bg-amber-500",
  warning: "bg-orange-500",
  exceeded: "bg-red-500",
};

function formatDM(d: string | Date | undefined | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function formatPeriodRange(
  period: string,
  period_start?: string | null,
  period_end?: string | null,
): string {
  if (!period_start) return "";
  if (period === "day" || period === "daily") return formatDM(period_start);
  if (!period_end) return formatDM(period_start);
  // period_end is exclusive; the displayed range should be inclusive
  const end = new Date(period_end);
  end.setDate(end.getDate() - 1);
  return `${formatDM(period_start)} – ${formatDM(end)}`;
}

// Tracks viewport against the Tailwind `sm` breakpoint so the card-tap modal
// only wires up on mobile. matchMedia avoids a render storm on resize.
function useIsMobile(query = "(max-width: 1023px)") {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

// ─── BudgetDetailModal ────────────────────────────────────────────────────────

type BudgetDetailModalProps = {
  open: boolean;
  budget: BudgetItem | null;
  emoji: string;
  baseCurrency: string;
  statusLabel: string;
  statusPillClass: string;
  statusBarColor: string;
  periodLabel: string;
  periodRange: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function BudgetDetailModal({
  open,
  budget,
  emoji,
  baseCurrency,
  statusLabel,
  statusPillClass,
  statusBarColor,
  periodLabel,
  periodRange,
  onClose,
  onEdit,
  onDelete,
}: BudgetDetailModalProps) {
  const { t } = useTranslation();
  const { rendered, visible } = useModalTransition(open);
  const panelRef = useRef<HTMLDivElement>(null);
  // Hold onto the last non-null budget so closing animations still have data to render.
  const [lastBudget, setLastBudget] = useState<BudgetItem | null>(budget);
  if (budget && budget !== lastBudget) setLastBudget(budget);
  const display = budget ?? lastBudget;

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

  if (!rendered || !display) return null;

  const pct = Math.min(display.percentage ?? 0, 100);
  const saved = Math.max(0, (display.limit ?? 0) - (display.spent ?? 0));
  const isOver = (display.spent ?? 0) > (display.limit ?? 0);

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
        aria-label={t("budget.detail.title")}
        className={`relative w-full max-w-md bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-gray-200 dark:border-[var(--bd)] transition-all duration-200 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[var(--bd)] gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-100 dark:bg-[var(--bg-muted)] flex items-center justify-center text-2xl leading-none select-none">
              {emoji}
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white break-words">
              {display.category}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors"
            aria-label={t("budget.detail.closeAriaLabel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Period */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-[#666] mb-1 font-semibold">
              {t("budget.detail.periodLabel")}
            </p>
            <p className="text-sm text-gray-700 dark:text-[#e0e0e0]">
              {periodLabel}
              {periodRange && (
                <>
                  <span className="text-gray-300 dark:text-[#555] mx-2">·</span>
                  <span className="tabular-nums text-gray-500 dark:text-[#a0a0a0]">
                    {periodRange}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Status */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-[#666] mb-1 font-semibold">
              {t("budget.detail.statusLabel")}
            </p>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusPillClass}`}
            >
              {statusLabel}
            </span>
          </div>

          {/* Amounts */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-[#666] mb-1 font-semibold">
              {t("budget.detail.amountsLabel")}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {formatCurrency(display.spent, baseCurrency)}
              <span className="text-gray-400 dark:text-[#555] text-base mx-1.5 font-normal">
                /
              </span>
              <span className="text-gray-500 dark:text-[#a0a0a0] font-semibold">
                {formatCurrency(display.limit, baseCurrency)}
              </span>
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="w-full h-2 bg-gray-100 dark:bg-[var(--bg-muted)] rounded-full overflow-hidden">
              <div
                className={`${statusBarColor} h-full rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between items-baseline text-xs tabular-nums">
              <span
                className={`font-semibold ${
                  isOver
                    ? "text-red-500 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {t("budget.savedLabel")} {formatCurrency(saved, baseCurrency)}
              </span>
              <span className="text-gray-400 dark:text-[#555]">
                {display.percentage?.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={onEdit}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
            >
              <Pencil className="w-4 h-4" />
              {t("budget.detail.editBtn")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t("budget.detail.deleteBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BudgetFormModal ──────────────────────────────────────────────────────────

type BudgetFormModalProps = {
  open: boolean;
  onClose: () => void;
  editId: number | null;
  limit: string;
  setLimit: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  period: string;
  setPeriod: (v: string) => void;
  fieldErrors: BudgetFieldErrors;
  setFieldErrors: Dispatch<SetStateAction<BudgetFieldErrors>>;
  submitting: boolean;
  categories: Category[];
  emojiByCategory: Record<string, string>;
  periodLabel: Record<string, string>;
  onSubmit: () => void;
  onCancel: () => void;
  onAddCategory: (name: string, emoji: string) => Promise<void>;
};

function BudgetFormModal({
  open,
  onClose,
  editId,
  limit,
  setLimit,
  category,
  setCategory,
  period,
  setPeriod,
  fieldErrors,
  setFieldErrors,
  submitting,
  categories,
  emojiByCategory,
  periodLabel,
  onSubmit,
  onCancel,
  onAddCategory,
}: BudgetFormModalProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("💼");
  const [emojiPickingForNew, setEmojiPickingForNew] = useState(false);
  const [submittingCat, setSubmittingCat] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setRendered(false), 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  async function handleAddCat() {
    if (!newCatName.trim()) return;
    setSubmittingCat(true);
    try {
      await onAddCategory(newCatName.trim(), newCatEmoji);
      setCategory(newCatName.trim());
      setNewCatName("");
      setNewCatEmoji("💼");
      setEmojiPickingForNew(false);
      setAddingCat(false);
    } finally {
      setSubmittingCat(false);
    }
  }

  if (!rendered) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-md bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-gray-200 dark:border-[var(--bd)] transition-all duration-200 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[var(--bd)]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {editId != null
              ? `${t("budget.updateBtn")} ${t("budget.sectionBudget")}`
              : `${t("budget.addBtn")} ${t("budget.sectionBudget")}`}
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
        <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)] thin-scrollbar">
          {/* Limit */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#a0a0a0] mb-1.5">
              {t("budget.limitPlaceholder")} *
            </label>
            <input
              autoFocus
              type="number"
              placeholder={t("budget.limitPlaceholder")}
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setFieldErrors((p) => ({ ...p, limit: undefined }));
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                fieldErrors.limit
                  ? "border-red-400 dark:border-red-500/60"
                  : "border-gray-300 dark:border-[var(--bd)]"
              } bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            {fieldErrors.limit && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.limit}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#a0a0a0] mb-1.5">
              {t("budget.selectCategory")} *
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setFieldErrors((p) => ({ ...p, category: undefined }));
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                fieldErrors.category
                  ? "border-red-400 dark:border-red-500/60"
                  : "border-gray-300 dark:border-[var(--bd)]"
              } bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a] dark:[color-scheme:dark]`}
            >
              <option value="">{t("budget.selectCategory")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {emojiByCategory[cat.name.toLowerCase()] || "💼"} {cat.name}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.category}</p>
            )}
            {!addingCat ? (
              <button
                type="button"
                onClick={() => setAddingCat(true)}
                className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-[#e8643a] hover:text-emerald-700 dark:hover:text-[#d2552d] font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("transactions.addNewCategory")}
              </button>
            ) : (
              <div className="mt-2">
                <div className="flex gap-1.5 items-center">
                  <button
                    type="button"
                    onClick={() => setEmojiPickingForNew((p) => !p)}
                    className="w-7 h-7 shrink-0 rounded-md bg-gray-100 dark:bg-[var(--bg-muted)] hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] flex items-center justify-center text-base leading-none select-none"
                    title={t("transactions.pickEmoji")}
                  >
                    {newCatEmoji}
                  </button>
                  <input
                    autoFocus
                    type="text"
                    placeholder={t("transactions.categoryNamePlaceholder")}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCat();
                      if (e.key === "Escape") {
                        setAddingCat(false);
                        setNewCatName("");
                        setNewCatEmoji("💼");
                        setEmojiPickingForNew(false);
                      }
                    }}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCat}
                    disabled={submittingCat || !newCatName.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-xs font-semibold disabled:opacity-50 hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
                  >
                    {submittingCat ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      t("common.add")
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCat(false);
                      setNewCatName("");
                      setNewCatEmoji("💼");
                      setEmojiPickingForNew(false);
                    }}
                    className="px-2 py-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {emojiPickingForNew && (
                  <div className="mt-1.5">
                    <EmojiPicker
                      onEmojiClick={(e) => {
                        setNewCatEmoji(e.emoji);
                        setEmojiPickingForNew(false);
                      }}
                      theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                      width="100%"
                      height={300}
                      searchDisabled
                      skinTonesDisabled
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#a0a0a0] mb-1.5">
              {t("budget.selectPeriod")} *
            </label>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setFieldErrors((p) => ({ ...p, period: undefined }));
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                fieldErrors.period
                  ? "border-red-400 dark:border-red-500/60"
                  : "border-gray-300 dark:border-[var(--bd)]"
              } bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a] dark:[color-scheme:dark]`}
            >
              <option value="">{t("budget.selectPeriod")}</option>
              {["day", "week", "month"].map((p) => (
                <option key={p} value={p}>
                  {periodLabel[p] ?? p}
                </option>
              ))}
            </select>
            {fieldErrors.period && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.period}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {editId != null && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-[var(--bd)] text-sm font-semibold text-gray-600 dark:text-[#aaa] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
              >
                {t("common.cancel")}
              </button>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {submitting
                ? editId != null
                  ? t("budget.updatingBtn")
                  : t("budget.addingBtn")
                : editId != null
                  ? t("budget.updateBtn")
                  : t("budget.addBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Budget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const { confirm } = useConfirm();
  const statusLabel: Record<string, string> = {
    acceptable: t("budget.statusHealthy"),
    caution: t("budget.statusCaution"),
    warning: t("budget.statusWarning"),
    exceeded: t("budget.statusExceeded"),
  };
  const periodLabel: Record<string, string> = {
    day: t("budget.periodDaily"),
    daily: t("budget.periodDaily"),
    week: t("budget.periodWeekly"),
    weekly: t("budget.periodWeekly"),
    month: t("budget.periodMonthly"),
    monthly: t("budget.periodMonthly"),
  };
  const isMobile = useIsMobile();
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Form fields
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  // Pre-select the user's preferred default period (Settings → Budget & Goals).
  // Map the Settings vocab (daily/weekly/monthly) to the API vocab (day/week/month).
  const defaultPeriodPref =
    user?.user_metadata?.budget_defaults?.default_period;
  const defaultPeriod = (() => {
    if (defaultPeriodPref === "daily") return "day";
    if (defaultPeriodPref === "weekly") return "week";
    if (defaultPeriodPref === "monthly") return "month";
    return "";
  })();
  const [period, setPeriod] = useState(defaultPeriod);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<BudgetFieldErrors>({});
  const [loading, setLoading] = useState(true);
  // Category dropdown state
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("💼");
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [emojiEditingId, setEmojiEditingId] = useState<number | "new" | null>(
    null,
  );
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  // Period dropdown state
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  // Mobile modal
  const [showModal, setShowModal] = useState(false);

  // Map category name -> emoji for quick lookup on budget cards
  const emojiByCategory = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      if (c?.name) map[c.name.toLowerCase()] = c.emoji || "💼";
    }
    return map;
  }, [categories]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_BASE}/categories/`, {
        method: "GET",
      });
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  async function handleAddCategorySimple(name: string, emoji: string): Promise<void> {
    await apiFetch(`${API_BASE}/categories/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, emoji }),
    });
    await fetchCategories();
  }

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await apiFetch(
        `${API_BASE}/budgets/?base_currency=${baseCurrency}`,
        { method: "GET" },
      );
      const data = await response.json();
      setBudgets(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [baseCurrency]);

  useEffect(() => {
    async function init() {
      try {
        const currency = await fetchBaseCurrency();
        setBaseCurrency(currency);
        const budgetResponse = await apiFetch(
          `${API_BASE}/budgets/?base_currency=${currency}`,
        );
        const budgetRes = await budgetResponse.json();
        fetchCategories();
        setBudgets(budgetRes);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user?.id, fetchCategories]);

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
        setEmojiEditingId(null);
      }
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

  useEffect(() => {
    if (showAddCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [showAddCategory]);

  function resetForm() {
    setEditId(null);
    setLimit("");
    setCategory("");
    setPeriod(defaultPeriod);
    setFieldErrors({});
    setShowModal(false);
  }

  async function handleSubmit() {
    const errs: BudgetFieldErrors = {};
    if (!category) errs.category = "Select a category";
    const lim = Number(limit);
    if (!limit || isNaN(lim) || lim <= 0) errs.limit = "Enter a positive limit";
    if (!period) errs.period = "Select a period";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (editId == null) {
      const existing = budgets.find(
        (b) => b.category.toLowerCase() === category.toLowerCase(),
      );
      if (existing) {
        const proceed = await confirm({
          title: `"${existing.category}" already has a budget`,
          message: `You have a ${existing.period === "month" ? "monthly" : existing.period === "day" ? "daily" : "weekly"} budget for "${existing.category}" with a limit of ${formatCurrency(existing.limit, baseCurrency)}. Do you want to update it with the new values?`,
          confirmLabel: "Update",
          danger: false,
        });
        if (!proceed) return;
      }
    }

    setSubmitting(true);
    try {
      if (editId == null) {
        await apiFetch(`${API_BASE}/budgets/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            limit: lim,
            period,
            currency: baseCurrency,
          }),
        });
        toast.success(
          budgets.some(
            (b) => b.category.toLowerCase() === category.toLowerCase(),
          )
            ? t("budget.toastUpdated")
            : t("budget.toastAdded"),
        );
      } else {
        await apiFetch(`${API_BASE}/budgets/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            limit: lim,
            period,
            currency: baseCurrency,
          }),
        });
        toast.success(t("budget.toastUpdated"));
      }
      fetchBudgets();
      resetForm();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(budget_id: number) {
    try {
      await apiFetch(`${API_BASE}/budgets/${budget_id}`, {
        method: "DELETE",
      });
      fetchBudgets();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleEdit(budget: BudgetItem) {
    setEditId(budget.id);
    setCategory(budget.category);
    setLimit(String(budget.limit));
    setPeriod(budget.period);
    if (window.innerWidth < 1280) {
      setShowModal(true);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleModalEdit() {
    if (!selectedBudget) return;
    handleEdit(selectedBudget);
    setSelectedBudget(null);
  }

  async function handleModalDelete() {
    if (!selectedBudget) return;
    const ok = await confirm({
      title: t("budget.detail.deleteConfirmTitle"),
      message: t("budget.detail.deleteConfirmMessage", {
        category: selectedBudget.category,
      }),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    await handleDelete(selectedBudget.id);
    setSelectedBudget(null);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setSubmittingCategory(true);
    try {
      await apiFetch(`${API_BASE}/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          emoji: newCategoryEmoji,
        }),
      });
      toast.success("Category added");
      await fetchCategories();
      setCategory(newCategoryName.trim());
      setNewCategoryName("");
      setNewCategoryEmoji("💼");
      setShowAddCategory(false);
      setShowCategoryDropdown(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmittingCategory(false);
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
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setEmojiEditingId(null);
    }
  }

  async function handlePickEmoji(emoji: string) {
    if (emojiEditingId === "new") {
      setNewCategoryEmoji(emoji);
      setEmojiEditingId(null);
    } else if (typeof emojiEditingId === "number") {
      await handleUpdateCategoryEmoji(emojiEditingId, emoji);
    }
  }

  async function handleDeleteCategory(category_id: number) {
    const cat = categories.find((c) => c.id === category_id);
    if (!cat) return;

    try {
      const txRes = await apiFetch(
        `${API_BASE}/transactions/?base_currency=${baseCurrency}`,
      );
      const txData: Transaction[] = await txRes.json();
      const relatedTx = txData.filter((t) => t.category === cat.name);
      const relatedBudgets = budgets.filter((b) => b.category === cat.name);

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
          ...relatedBudgets.map((b) =>
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
      await fetchCategories();
      await fetchBudgets();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const Divider = () => (
    <div className="hidden sm:block w-px bg-gray-300 dark:bg-[var(--bd)] self-stretch my-2 shrink-0" />
  );

  const hasFieldError =
    fieldErrors.limit || fieldErrors.category || fieldErrors.period;

  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-32 bg-gray-200 dark:bg-[var(--bg-muted)] rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-[var(--bg-muted)] rounded" />
        </div>
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-6 mb-6 h-16" />
        <div className="space-y-3 mt-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 dark:border-[var(--bd)] dark:bg-[var(--bg-surface)] shadow-sm p-4 h-24"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="font-[Inter] overflow-x-clip">
      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {/* ── SECTION HEADING ── */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a0a0a0] mb-2">
        {t("budget.sectionBudget")}
      </p>

      {/* Mobile / tablet trigger — hidden at xl+ */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="xl:hidden w-full flex items-center justify-center gap-2 mb-4 px-4 py-3 rounded-xl bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
      >
        <Plus className="w-4 h-4" />
        {editId != null
          ? `${t("budget.updateBtn")} ${t("budget.sectionBudget")}`
          : `${t("budget.addBtn")} ${t("budget.sectionBudget")}`}
      </button>

      {/* ── UNIFIED INPUT BAR (xl+ only) ── */}
      <div className="hidden xl:block">
      <div className="mt-1">
        <div
          className={`
            flex flex-col sm:flex-row items-stretch sm:items-center
            border border-gray-300 dark:border-[var(--bd)]
            rounded-xl overflow-visible
            bg-white dark:bg-[var(--bg-surface)]
            shadow-sm transition-all duration-150
            ${hasFieldError ? "border-red-400 dark:border-red-500/60 ring-1 ring-red-400/30 dark:ring-red-500/20" : ""}
          `}
        >
          {/* ─── ROW 1: Amount · Category ─── */}
          <div className="flex flex-col items-stretch sm:flex-row sm:items-center flex-1 min-w-0">
            {/* Amount / Limit */}
            <input
              type="number"
              placeholder={t("budget.limitPlaceholder")}
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setFieldErrors((p) => ({ ...p, limit: undefined }));
              }}
              className={`
                w-full sm:flex-1 min-w-0 sm:min-w-[140px] px-3.5 py-2.5 text-sm
                bg-transparent border-none outline-none sm:text-left
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${
                  limit
                    ? "text-gray-900 dark:text-white"
                    : fieldErrors.limit
                      ? "text-red-400 placeholder-red-300"
                      : "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555]"
                }
              `}
            />

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
                {category ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-base leading-none">
                      {emojiByCategory[category.toLowerCase()] || "💼"}
                    </span>
                    {category}
                  </span>
                ) : (
                  t("budget.selectCategory")
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${showCategoryDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showCategoryDropdown && (
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-1.5 ${emojiEditingId !== null ? "w-[270px]" : "w-52"} bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 overflow-hidden`}
                >
                  {emojiEditingId !== null ? (
                    /* ── Emoji picker overlay ── */
                    <>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-[var(--bd)]">
                        <span className="text-xs font-semibold text-gray-500 dark:text-[#a0a0a0]">
                          {t("transactions.pickEmoji")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEmojiEditingId(null)}
                          className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <EmojiPicker
                        onEmojiClick={(emojiData) =>
                          handlePickEmoji(emojiData.emoji)
                        }
                        theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                        lazyLoadEmojis
                        width={268}
                        height={350}
                      />
                    </>
                  ) : (
                    /* ── Normal list ── */
                    <div className="py-1">
                      {categories.length > 0 ? (
                        <div className="thin-scrollbar max-h-48 overflow-y-auto">
                          {categories.map((cat) => (
                            <div
                              key={cat.id}
                              className="group flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              {/* Emoji button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmojiEditingId(cat.id);
                                }}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-base hover:bg-gray-200 dark:hover:bg-[var(--bg-muted)] transition-colors shrink-0"
                                title="Change emoji"
                              >
                                {cat.emoji || "💼"}
                              </button>
                              {/* Name */}
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
                                className="flex-1 text-sm text-gray-700 dark:text-[#e0e0e0] text-left py-0.5"
                              >
                                {cat.name}
                              </button>
                              {category === cat.name && (
                                <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a] shrink-0" />
                              )}
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
                              title="Pick emoji"
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
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── Cross-row separator ─── */}
          <div className="sm:hidden h-px bg-gray-300 dark:bg-[var(--bd)]" />
          <div className="hidden sm:block w-px bg-gray-300 dark:bg-[var(--bd)] self-stretch my-2 shrink-0" />

          {/* ─── ROW 2: Period · Actions ─── */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center">
            {/* Period custom dropdown */}
            <div
              className="relative shrink-0 w-full sm:w-auto"
              ref={periodDropdownRef}
            >
              <button
                type="button"
                onClick={() => setShowPeriodDropdown((p) => !p)}
                className={`
                  w-full sm:w-auto flex items-center gap-1.5 px-3 py-2.5 text-sm
                  justify-between text-center
                  bg-transparent border-none outline-none
                  transition-colors whitespace-nowrap
                  ${
                    period
                      ? "text-gray-900 dark:text-white"
                      : fieldErrors.period
                        ? "text-red-400"
                        : "text-gray-400 dark:text-[#555]"
                  }`}
              >
                {period
                  ? (periodLabel[period] ?? period)
                  : t("budget.selectPeriod")}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    showPeriodDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showPeriodDropdown && (
                <div className="absolute top-full left-0 mt-1.5 w-36 bg-white dark:bg-[var(--bg-surface)] border border-gray-300 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 overflow-hidden py-1">
                  {["day", "week", "month"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPeriod(p);
                        setShowPeriodDropdown(false);
                        setFieldErrors((prev) => ({
                          ...prev,
                          period: undefined,
                        }));
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors text-left"
                    >
                      <span>{periodLabel[p] ?? p}</span>
                      {period === p && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#e8643a]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Divider />

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
                  ? t("budget.updatingBtn")
                  : t("budget.addingBtn")
                : editId
                  ? t("budget.updateBtn")
                  : t("budget.addBtn")}
            </button>
          </div>
        </div>

        {/* Inline validation message */}
        {hasFieldError && (
          <p className="mt-1.5 ml-1 text-xs text-red-500 dark:text-red-400">
            {[fieldErrors.limit, fieldErrors.category, fieldErrors.period]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
      </div>{/* end hidden xl:block */}

      {/* ── SECTION HEADING ── */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a0a0a0] mt-5 mb-2">
        {t("budget.sectionYourBudgets")}
      </p>

      {/* ── BUDGET CARDS ── */}
      {budgets.length > 0 ? (
          <div className="grid grid-cols-1 min-[1400px]:grid-cols-2 gap-4 pb-1">
            {budgets.map((budget) => {
              const pct = Math.min(budget.percentage ?? 0, 100);
              const barColor = statusBarColor[budget.status] ?? "bg-gray-400";
              return (
                <div
                  key={budget.id}
                  onClick={
                    isMobile ? () => setSelectedBudget(budget) : undefined
                  }
                  onKeyDown={
                    isMobile
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedBudget(budget);
                          }
                        }
                      : undefined
                  }
                  role={isMobile ? "button" : undefined}
                  tabIndex={isMobile ? 0 : undefined}
                  aria-label={
                    isMobile
                      ? `${budget.category} – ${t("budget.detail.title")}`
                      : undefined
                  }
                  className={`bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-200 dark:border-[var(--bd)] shadow-sm p-3 ${
                    isMobile
                      ? "cursor-pointer active:bg-gray-50 dark:active:bg-[var(--bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:focus-visible:ring-[#e8643a]/40"
                      : ""
                  }`}
                >
                  {/* ── Single row: emoji · name/period · status · amounts · actions ── */}
                  <div className="flex items-center gap-1.5 lg:gap-2 min-w-0">
                    {/* Emoji icon (looked up from category) */}
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 dark:bg-[var(--bg-muted)] flex items-center justify-center text-xl leading-none select-none">
                      {emojiByCategory[budget.category?.toLowerCase()] || "💼"}
                    </div>

                    {/* Name + period (with date range) */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-snug max-w-[140px] lg:max-w-none">
                        {budget.category}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#a0a0a0] flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 whitespace-nowrap">
                          {periodLabel[budget.period] ?? budget.period}
                        </span>
                        {formatPeriodRange(
                          budget.period,
                          budget.period_start,
                          budget.period_end,
                        ) && (
                          <>
                            <span className="shrink-0 text-gray-300 dark:text-[#555]">
                              ·
                            </span>
                            <span className="min-w-0 truncate text-[11px] text-gray-400 dark:text-[#666] tabular-nums">
                              {formatPeriodRange(
                                budget.period,
                                budget.period_start,
                                budget.period_end,
                              )}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Status pill (desktop only — mobile copy lives in the bottom row) */}
                    <span
                      className={`hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                        statusPillClass[budget.status] ??
                        "bg-gray-100 dark:bg-[var(--bg-muted)] text-gray-600 dark:text-[#a0a0a0]"
                      }`}
                    >
                      {statusLabel[budget.status] ?? budget.status}
                    </span>

                    {/* Amounts */}
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-xs lg:text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(budget.spent, baseCurrency)}
                      </span>
                      <span className="text-gray-400 dark:text-[#555] text-[10px] lg:text-xs">
                        /
                      </span>
                      <span className="text-[11px] lg:text-xs text-gray-500 dark:text-[#a0a0a0] tabular-nums">
                        {formatCurrency(budget.limit, baseCurrency)}
                      </span>
                    </div>

                    {/* Actions (desktop only — mobile moves these into the detail modal) */}
                    <div className="hidden lg:flex gap-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(budget);
                        }}
                        className="p-1 lg:p-1.5 rounded-md text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors"
                        aria-label="Edit budget"
                      >
                        <Pencil className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(budget.id);
                        }}
                        className="p-1 lg:p-1.5 rounded-md text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        aria-label="Delete budget"
                      >
                        <Trash2 className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ── Progress bar ── */}
                  <div className="mt-1.5 w-full h-1.5 bg-gray-100 dark:bg-[var(--bg-muted)] rounded-full overflow-hidden">
                    <div
                      className={`${barColor} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Status pill (mobile) · Percentage + saved label */}
                  <div className="mt-0.5 flex justify-end items-baseline gap-1.5">
                    {/* Status pill — mobile only, pinned to the left */}
                    <span
                      className={`lg:hidden mr-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        statusPillClass[budget.status] ??
                        "bg-gray-100 dark:bg-[var(--bg-muted)] text-gray-600 dark:text-[#a0a0a0]"
                      }`}
                    >
                      {statusLabel[budget.status] ?? budget.status}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-[#555] tabular-nums">
                      {budget.percentage?.toFixed(1)}%
                    </span>
                    <span className="text-gray-300 dark:text-[#555] text-xs">
                      ·
                    </span>
                    {(() => {
                      const saved = Math.max(
                        0,
                        (budget.limit ?? 0) - (budget.spent ?? 0),
                      );
                      const savedFormatted = new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: baseCurrency,
                      }).format(saved);
                      const isZero = saved <= 0;
                      return (
                        <span className="text-xs text-gray-400 dark:text-[#555] tabular-nums">
                          {t("budget.savedLabel")}{" "}
                          <span
                            className={`font-semibold ${
                              isZero
                                ? "text-red-500 dark:text-red-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {savedFormatted}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-12 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-3">
              <Wallet className="w-6 h-6 text-emerald-600 dark:text-[#e8643a]" />
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {t("budget.noBudgetsTitle")}
            </p>
            <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
              {t("budget.noBudgetsDesc")}
            </p>
          </div>
        )}

      {/* Budget form modal (mobile/tablet) */}
      <BudgetFormModal
        open={showModal}
        onClose={resetForm}
        editId={editId}
        limit={limit}
        setLimit={setLimit}
        category={category}
        setCategory={setCategory}
        period={period}
        setPeriod={setPeriod}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        submitting={submitting}
        categories={categories}
        emojiByCategory={emojiByCategory}
        periodLabel={periodLabel}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        onAddCategory={handleAddCategorySimple}
      />

      {/* Mobile-only budget detail modal */}
      <BudgetDetailModal
        open={selectedBudget !== null}
        budget={selectedBudget}
        emoji={
          selectedBudget
            ? emojiByCategory[selectedBudget.category?.toLowerCase()] || "💼"
            : "💼"
        }
        baseCurrency={baseCurrency}
        statusLabel={
          selectedBudget
            ? (statusLabel[selectedBudget.status] ?? selectedBudget.status)
            : ""
        }
        statusPillClass={
          selectedBudget
            ? (statusPillClass[selectedBudget.status] ??
              "bg-gray-100 dark:bg-[var(--bg-muted)] text-gray-600 dark:text-[#a0a0a0]")
            : ""
        }
        statusBarColor={
          selectedBudget
            ? (statusBarColor[selectedBudget.status] ?? "bg-gray-400")
            : "bg-gray-400"
        }
        periodLabel={
          selectedBudget
            ? (periodLabel[selectedBudget.period] ?? selectedBudget.period)
            : ""
        }
        periodRange={
          selectedBudget
            ? formatPeriodRange(
                selectedBudget.period,
                selectedBudget.period_start,
                selectedBudget.period_end,
              )
            : ""
        }
        onClose={() => setSelectedBudget(null)}
        onEdit={handleModalEdit}
        onDelete={handleModalDelete}
      />
    </div>
  );
}

export default Budget;
