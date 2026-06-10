import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Target,
  Loader2,
  RotateCcw,
  MoreVertical,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency, fetchBaseCurrency } from "../lib/utils";
import { apiFetch, API_BASE } from "../lib/api";
import ErrorBanner from "../components/ErrorBanner";

type GoalFieldErrors = {
  name?: string;
  target_amount?: string;
  deadline?: string;
};

const NO_DECIMAL_CURRENCIES = new Set([
  "VND",
  "JPY",
  "KRW",
  "IDR",
  "HUF",
  "CLP",
  "TWD",
]);

function roundForCurrency(amount: number, currency: string): number {
  return NO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100) / 100;
}

// ─── GoalFormModal ────────────────────────────────────────────────────────────

type GoalFormModalProps = {
  open: boolean;
  onClose: () => void;
  editId: number | null;
  name: string;
  setName: (v: string) => void;
  target_amount: string;
  setTargetAmount: (v: string) => void;
  deadline: string;
  setDeadline: (v: string) => void;
  fieldErrors: GoalFieldErrors;
  setFieldErrors: Dispatch<SetStateAction<GoalFieldErrors>>;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

function GoalFormModal({
  open,
  onClose,
  editId,
  name,
  setName,
  target_amount,
  setTargetAmount,
  deadline,
  setDeadline,
  fieldErrors,
  setFieldErrors,
  submitting,
  onSubmit,
  onCancel,
}: GoalFormModalProps) {
  const { t } = useTranslation();
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
            {editId != null ? t("goals.updateGoalBtn") : t("goals.addGoalBtn")}
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
          {/* Goal name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#a0a0a0] mb-1.5">
              {t("goals.goalNamePlaceholder")} *
            </label>
            <input
              autoFocus
              type="text"
              placeholder={t("goals.goalNamePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((p) => ({ ...p, name: undefined }));
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                fieldErrors.name
                  ? "border-red-400 dark:border-red-500/60"
                  : "border-gray-300 dark:border-[var(--bd)]"
              } bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a]`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          {/* Target amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#a0a0a0] mb-1.5">
              {t("goals.targetAmountPlaceholder")} *
            </label>
            <input
              type="number"
              placeholder={t("goals.targetAmountPlaceholder")}
              value={target_amount}
              onChange={(e) => {
                setTargetAmount(e.target.value);
                setFieldErrors((p) => ({ ...p, target_amount: undefined }));
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                fieldErrors.target_amount
                  ? "border-red-400 dark:border-red-500/60"
                  : "border-gray-300 dark:border-[var(--bd)]"
              } bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            {fieldErrors.target_amount && (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.target_amount}
              </p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-[#a0a0a0] mb-1.5">
              {t("goals.deadlineLabel")}{" "}
              <span className="font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                setFieldErrors((p) => ({ ...p, deadline: undefined }));
              }}
              className="w-full min-w-0 px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a] dark:[color-scheme:dark]"
            />
            {fieldErrors.deadline && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.deadline}</p>
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
                  ? t("goals.updatingBtn")
                  : t("goals.addingBtn")
                : editId != null
                  ? t("goals.updateGoalBtn")
                  : t("goals.addGoalBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Goals() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  // Form fields
  const [name, setName] = useState("");
  const [target_amount, setTargetAmount] = useState("");
  const [current_amount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  // Card-level state
  const [progressInput, setProgressInput] = useState<Record<number, string>>(
    {},
  );
  const [previousAmounts, setPreviousAmounts] = useState<
    Record<number, number>
  >({});
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [progressSubmittingId, setProgressSubmittingId] = useState<
    number | null
  >(null);
  const [quickAddSubmittingId, setQuickAddSubmittingId] = useState<
    number | null
  >(null);
  const [undoSubmittingId, setUndoSubmittingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<GoalFieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const initPage = useCallback(async () => {
    try {
      const currency = await fetchBaseCurrency();
      setBaseCurrency(currency);
      const goalsResponse = await apiFetch(
        `${API_BASE}/goals/?base_currency=${currency}`,
      );
      const goalsData = await goalsResponse.json();
      setGoals(goalsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  // Converts a base-currency amount into the goal's storage currency for PUT.
  async function resolveNewStored(goal: any, newBase: number): Promise<number> {
    const goalCurrency = goal.currency || "USD";
    if (goalCurrency === baseCurrency) return newBase;
    const ratesRes = await apiFetch(
      `${API_BASE}/currency/rates?base=${baseCurrency}`,
    );
    const ratesData = await ratesRes.json();
    const rates = ratesData.rates || {};
    const baseRate = rates[baseCurrency] ?? 1;
    const goalRate = rates[goalCurrency];
    if (!goalRate) return newBase;
    return (newBase / baseRate) * goalRate;
  }

  async function handleSubmit() {
    const errs: GoalFieldErrors = {};
    if (!name.trim()) errs.name = "Name is required";
    const target = Number(target_amount);
    if (!target_amount || isNaN(target) || target <= 0)
      errs.target_amount = "Enter a positive target";
    if (deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(deadline);
      if (d < today) errs.deadline = "Deadline must be a future date";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (editId == null) {
        await apiFetch(`${API_BASE}/goals/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            name,
            target_amount: parseFloat(target_amount),
            current_amount: parseFloat(current_amount) || 0,
            deadline: deadline || null,
            currency: baseCurrency,
          }),
        });
        toast.success(t("goals.toastAdded"));
      } else {
        await apiFetch(`${API_BASE}/goals/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            name,
            target_amount: parseFloat(target_amount),
            current_amount: parseFloat(current_amount) || 0,
            deadline: deadline || null,
            currency: baseCurrency,
          }),
        });
        toast.success(t("goals.toastUpdated"));
      }
      initPage();
      setEditId(null);
      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setDeadline("");
      setFieldErrors({});
      setShowModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(goal: any) {
    setEditId(goal.id);
    setName(goal.name);
    setCurrentAmount(String(goal.current_amount));
    setTargetAmount(String(goal.target_amount));
    setDeadline(goal.deadline?.split("T")[0] || "");
    if (window.innerWidth < 1280) {
      setShowModal(true);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleCancelEdit() {
    setEditId(null);
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
    setShowModal(false);
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`${API_BASE}/goals/${id}`, { method: "DELETE" });
      initPage();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddProgress(goal: any) {
    const added = parseFloat(progressInput[goal.id] || "0");
    if (!added || added <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    setProgressSubmittingId(goal.id);
    try {
      const newBase = (goal.current_amount ?? 0) + added;
      const newStored = await resolveNewStored(goal, newBase);
      await apiFetch(`${API_BASE}/goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_amount: newStored }),
      });
      toast.success(
        `Added ${formatCurrency(added, baseCurrency)} to ${goal.name}`,
      );
      setPreviousAmounts((prev) => ({
        ...prev,
        [goal.id]: goal.current_amount ?? 0,
      }));
      initPage();
      setProgressInput((prev) => ({ ...prev, [goal.id]: "" }));
    } catch (err: any) {
      toast.error(err.message || "Failed to update goal");
    } finally {
      setProgressSubmittingId(null);
    }
  }

  async function handleQuickAdd(goal: any, pct: number) {
    const delta = roundForCurrency(
      (goal.target_amount * pct) / 100,
      baseCurrency,
    );
    const newBase = Math.max(0, (goal.current_amount ?? 0) + delta);
    setQuickAddSubmittingId(goal.id);
    try {
      const newStored = await resolveNewStored(goal, newBase);
      await apiFetch(`${API_BASE}/goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_amount: newStored }),
      });
      const sign = pct > 0 ? "+" : "";
      toast.success(`${sign}${pct}% applied to ${goal.name}`);
      setPreviousAmounts((prev) => ({
        ...prev,
        [goal.id]: goal.current_amount ?? 0,
      }));
      initPage();
    } catch (err: any) {
      toast.error(err.message || "Failed to update goal");
    } finally {
      setQuickAddSubmittingId(null);
    }
  }

  async function handleUndoProgress(goal: any) {
    const prevBase = previousAmounts[goal.id];
    if (prevBase === undefined) return;
    setUndoSubmittingId(goal.id);
    try {
      const prevStored = await resolveNewStored(goal, prevBase);
      await apiFetch(`${API_BASE}/goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_amount: prevStored }),
      });
      toast.success(`Reverted progress for ${goal.name}`);
      setPreviousAmounts((prev) => {
        const next = { ...prev };
        delete next[goal.id];
        return next;
      });
      initPage();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUndoSubmittingId(null);
    }
  }

  const Divider = () => (
    <div className="hidden sm:block w-px bg-gray-300 dark:bg-[var(--bd)] self-stretch my-2 shrink-0" />
  );

  const hasFieldError = fieldErrors.name || fieldErrors.target_amount;

  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-32 bg-gray-200 dark:bg-[var(--bg-muted)] rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-[var(--bg-muted)] rounded" />
        </div>
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-6 mb-6 h-16" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-200 dark:border-[var(--bd)] shadow-sm p-4 h-36"
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
        {t("goals.sectionGoal")}
      </p>

      {/* Mobile / tablet trigger — hidden at xl+ */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="xl:hidden w-full flex items-center justify-center gap-2 mb-4 px-4 py-3 rounded-xl bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
      >
        <Plus className="w-4 h-4" />
        {editId != null ? t("goals.updateGoalBtn") : t("goals.addGoalBtn")}
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
          {/* ─── ROW 1: Goal name · Target amount ─── */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center flex-1 min-w-0">
            <input
              type="text"
              placeholder={t("goals.goalNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`
                w-full sm:flex-1 min-w-0 px-3.5 py-2.5 text-sm
                bg-transparent border-none outline-none
                ${name ? "text-gray-900 dark:text-white" : fieldErrors.name ? "text-red-400" : "text-gray-400 dark:text-[#555]"}
              `}
            />
            <Divider />
            <input
              type="number"
              placeholder={t("goals.targetAmountPlaceholder")}
              value={target_amount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className={`
                w-full sm:w-40 shrink-0 px-3.5 py-2.5 text-sm
                bg-transparent border-none outline-none
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${target_amount ? "text-gray-900 dark:text-white" : fieldErrors.target_amount ? "text-red-400" : "text-gray-400 dark:text-[#555]"}
              `}
            />
          </div>

          {/* ─── Cross-row separator ─── */}
          <div className="sm:hidden h-px bg-gray-300 dark:bg-[var(--bd)]" />
          <div className="hidden sm:block w-px bg-gray-300 dark:bg-[var(--bd)] self-stretch my-2 shrink-0" />

          {/* ─── ROW 2: Deadline · Actions ─── */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full min-w-0 sm:w-36 shrink-0 px-3 py-2.5 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white dark:[color-scheme:dark]"
            />
            <Divider />
            {editId !== null && (
              <button
                type="button"
                onClick={handleCancelEdit}
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
                  ? t("goals.updatingBtn")
                  : t("goals.addingBtn")
                : editId
                  ? t("goals.updateGoalBtn")
                  : t("goals.addGoalBtn")}
            </button>
          </div>
        </div>

        {hasFieldError && (
          <p className="mt-1.5 ml-1 text-xs text-red-500 dark:text-red-400">
            {[fieldErrors.name, fieldErrors.target_amount]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
      </div>{/* end hidden xl:block */}

      {/* ── SECTION HEADING ── */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a0a0a0] mt-5 mb-2">
        {t("goals.sectionYourGoals")}
      </p>

      {/* ── GOAL CARDS ── */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 min-[1400px]:grid-cols-2 gap-4 pb-1">
          {goals.map((goal) => {
            const pct =
              goal.target_amount > 0
                ? (goal.current_amount / goal.target_amount) * 100
                : 0;
            const pctClamped = Math.min(pct, 100);
            const isComplete = pct >= 100;
            const deadlineLabel = goal.deadline
              ? goal.deadline.split("T")[0]
              : t("goals.noDeadline");
            const anySubmitting =
              progressSubmittingId === goal.id ||
              quickAddSubmittingId === goal.id;

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-200 dark:border-[var(--bd)] shadow-sm p-4"
              >
                {/* ── TOP SECTION ── */}
                <div className="flex items-start gap-2.5">
                  {/* Icon */}
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mt-0.5">
                    <span role="img" aria-label="bullseye">
                      🎯
                    </span>
                  </div>

                  {/* Name block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      {/* Left: name + deadline + mobile amounts */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-snug">
                          {goal.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[#a0a0a0] mt-0.5">
                          {t("goals.deadlineLabel")} · {deadlineLabel}
                        </p>
                        {/* Mobile: percentage + amounts shown inline below deadline */}
                        <div className="sm:hidden flex items-baseline gap-2 mt-1.5 flex-wrap">
                          <span
                            className={`text-base font-bold ${isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}
                          >
                            {Math.round(pct)}%
                          </span>
                          <span className="text-xs text-gray-500 dark:text-[#a0a0a0] tabular-nums">
                            {formatCurrency(goal.current_amount, baseCurrency)}{" "}
                            / {formatCurrency(goal.target_amount, baseCurrency)}
                          </span>
                        </div>
                      </div>

                      {/* Right: desktop percentage + amounts + three-dot menu */}
                      <div className="flex items-start gap-1.5 shrink-0">
                        {/* Desktop: percentage + amounts */}
                        <div className="hidden sm:block text-right">
                          <p
                            className={`text-base font-bold leading-snug ${isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}
                          >
                            {Math.round(pct)}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-[#a0a0a0] tabular-nums mt-0.5">
                            {formatCurrency(goal.current_amount, baseCurrency)}{" "}
                            / {formatCurrency(goal.target_amount, baseCurrency)}
                          </p>
                        </div>

                        {/* Three-dot dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === goal.id ? null : goal.id,
                              )
                            }
                            className="p-1 rounded-md text-gray-400 dark:text-[#666] hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors"
                            aria-label="Goal options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === goal.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 overflow-hidden py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEdit(goal);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors text-left"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  {t("goals.menuEdit")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDelete(goal.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {t("goals.menuDelete")}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PROGRESS BAR ── */}
                <div className="mt-3 w-full h-1.5 bg-gray-100 dark:bg-[var(--bg-muted)] rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pctClamped}%` }}
                  />
                </div>

                {/* ── BOTTOM SECTION: amount input + quick-add buttons ── */}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  {/* Custom amount input */}
                  <div className="flex gap-1.5 flex-1 min-w-0">
                    <input
                      type="number"
                      placeholder={t("goals.addAmountPlaceholder")}
                      min="0"
                      value={progressInput[goal.id] ?? ""}
                      onChange={(e) =>
                        setProgressInput((prev) => ({
                          ...prev,
                          [goal.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddProgress(goal);
                      }}
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/30 focus:border-emerald-500 dark:focus:border-[#e8643a] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => handleAddProgress(goal)}
                      disabled={anySubmitting}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-xs font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {progressSubmittingId === goal.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      {t("goals.addBtn")}
                    </button>
                  </div>

                  {/* Percentage quick-add buttons */}
                  <div className="flex gap-1.5">
                    {([-1, 1, 5] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleQuickAdd(goal, p)}
                        disabled={anySubmitting}
                        className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[var(--bd)] text-xs font-medium text-gray-600 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {p > 0 ? `+${p}%` : `${p}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Undo last addition */}
                {previousAmounts[goal.id] !== undefined && (
                  <button
                    onClick={() => handleUndoProgress(goal)}
                    disabled={undoSubmittingId === goal.id}
                    className="mt-2 flex items-center gap-1 text-xs text-gray-400 dark:text-[#666] hover:text-gray-600 dark:hover:text-[#a0a0a0] transition-colors disabled:opacity-50"
                  >
                    {undoSubmittingId === goal.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    {t("goals.undoLastAddition")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-3">
            <Target className="w-6 h-6 text-emerald-600 dark:text-[#e8643a]" />
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {t("goals.noGoalsTitle")}
          </p>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            {t("goals.noGoalsDesc")}
          </p>
        </div>
      )}
      <GoalFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editId={editId}
        name={name}
        setName={setName}
        target_amount={target_amount}
        setTargetAmount={setTargetAmount}
        deadline={deadline}
        setDeadline={setDeadline}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
      />
    </div>
  );
}

export default Goals;
