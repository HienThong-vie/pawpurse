import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Plus, Target, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency, fetchBaseCurrency } from "../lib/utils";
import { apiFetch } from "../lib/api";
import ErrorBanner from "../components/ErrorBanner";

type GoalFieldErrors = {
  name?: string;
  target_amount?: string;
  deadline?: string;
};

function Goals() {
  const { user } = useAuth();
  const toast = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  //form field
  const [name, setName] = useState("");
  const [target_amount, setTargetAmount] = useState("");
  const [current_amount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [progressInput, setProgressInput] = useState({});
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [progressSubmittingId, setProgressSubmittingId] = useState<
    number | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<GoalFieldErrors>({});
  const [loading, setLoading] = useState(true);
  const initPage = useCallback(async () => {
    try {
      const currency = await fetchBaseCurrency();
      setBaseCurrency(currency);

      const goalsResponse = await apiFetch(
        `http://localhost:8000/goals/?base_currency=${currency}`,
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
  async function handleSubmit() {
    // Inline validation
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
        await apiFetch(`http://localhost:8000/goals/`, {
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
        toast.success("Goal added");
      } else {
        await apiFetch(
          `http://localhost:8000/goals/${editId}`,
          {
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
          },
        );
        toast.success("Goal updated");
      }
      initPage();
      setEditId(null);
      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setDeadline("");
      setFieldErrors({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }
  function handleEdit(goal) {
    setEditId(goal.id);
    setName(goal.name);
    setCurrentAmount(String(goal.current_amount));
    setTargetAmount(String(goal.target_amount));
    setDeadline(goal.deadline?.split("T")[0] || "");
  }
  function handleCancelEdit() {
    setEditId(null);
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
  }
  async function handleDelete(id) {
    try {
      await apiFetch(`http://localhost:8000/goals/${id}`, {
        method: "DELETE",
      });
      initPage();
    } catch (err: any) {
      setError(err.message);
    }
  }
  async function handleAddProgress(goal) {
    const added = parseFloat(progressInput[goal.id] || "0");
    if (!added || added <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    setProgressSubmittingId(goal.id);
    try {
      const goalCurrency = goal.currency || "USD";
      // current_amount the frontend sees is already converted to baseCurrency.
      // We need to send the new STORED value (in goalCurrency) back.
      let newStored: number;
      if (goalCurrency === baseCurrency) {
        newStored = Number(goal.current_amount || 0) + added;
      } else {
        const ratesRes = await apiFetch(
          `http://localhost:8000/currency/rates?base=${baseCurrency}`,
        );
        const ratesData = await ratesRes.json();
        const rates = ratesData.rates || {};
        const baseRate = rates[baseCurrency];
        const goalRate = rates[goalCurrency];
        if (!baseRate || !goalRate) {
          // Rates unavailable — fall back to plain addition (no conversion)
          newStored = Number(goal.current_amount || 0) + added;
        } else {
          // Convert displayed total back to goal's stored currency:
          //   stored = displayed / rates[base] * rates[goal]
          newStored =
            (((Number(goal.current_amount) || 0) + added) / baseRate) *
            goalRate;
        }
      }

      await apiFetch(
        `http://localhost:8000/goals/${goal.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_amount: newStored }),
        },
      );
      toast.success(
        `Added ${formatCurrency(added, baseCurrency)} to ${goal.name}`,
      );
      initPage();
      setProgressInput({ ...progressInput, [goal.id]: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProgressSubmittingId(null);
    }
  }

  const inputClass =
    "border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] bg-white dark:bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]";

  if (loading) {
    return (
      <div className="font-[Inter] animate-pulse">
        <div className="mb-6 lg:mb-8">
          <div className="h-8 w-24 bg-gray-200 dark:bg-[#222] rounded mb-2" />
          <div className="h-4 w-44 bg-gray-200 dark:bg-[#222] rounded" />
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-6 mb-6 h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-5 h-44"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="font-[Inter]">
      {/* Page header */}
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Goals
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          Track your financial goals
        </p>
      </header>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {/* Add / Update Goal */}
      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {editId ? "Update Goal" : "Add Goal"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto] gap-3">
          <div>
            <input
              type="text"
              placeholder="Goal name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass} w-full ${
                fieldErrors.name ? "border-red-500 dark:border-red-500" : ""
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <input
              type="number"
              placeholder="Target amount"
              value={target_amount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className={`${inputClass} w-full ${
                fieldErrors.target_amount
                  ? "border-red-500 dark:border-red-500"
                  : ""
              }`}
            />
            {fieldErrors.target_amount && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {fieldErrors.target_amount}
              </p>
            )}
          </div>
          <div>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={`${inputClass} w-full ${
                fieldErrors.deadline ? "border-red-500 dark:border-red-500" : ""
              }`}
            />
            {fieldErrors.deadline && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {fieldErrors.deadline}
              </p>
            )}
          </div>
          <div className="flex gap-2">
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
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? editId
                  ? "Updating..."
                  : "Adding..."
                : editId
                  ? "Update Goal"
                  : "Add Goal"}
            </button>
          </div>
        </div>
      </section>

      {/* Goals grid */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percentage =
              goal.target_amount > 0
                ? (goal.current_amount / goal.target_amount) * 100
                : 0;
            const deadlineLabel = goal.deadline
              ? new Date(goal.deadline).toLocaleDateString()
              : "No deadline";
            return (
              <div
                key={goal.id}
                className="relative bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-5"
              >
                {/* Top right actions */}
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={() => handleEdit(goal)}
                    className="p-1.5 rounded-md text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                    aria-label="Edit goal"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1.5 rounded-md text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Header */}
                <div className="flex items-center gap-2 mb-4 pr-16 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {goal.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-xs font-medium text-gray-600 dark:text-[#a0a0a0]">
                    {deadlineLabel}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-gray-100 dark:bg-[#2a2a2a] rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-emerald-500 dark:bg-[#e8643a] h-full rounded-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {/* Current / target + percentage */}
                <div className="flex items-baseline justify-between text-sm mb-4">
                  <span className="text-gray-600 dark:text-[#a0a0a0]">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(goal.current_amount, baseCurrency)}
                    </span>{" "}
                    / {formatCurrency(goal.target_amount, baseCurrency)}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-[#e0e0e0]">
                    {percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Add progress */}
                <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-[#222]">
                  <input
                    type="number"
                    placeholder="Add amount"
                    value={progressInput[goal.id] ?? ""}
                    onChange={(e) =>
                      setProgressInput({
                        ...progressInput,
                        [goal.id]: e.target.value,
                      })
                    }
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    onClick={() => handleAddProgress(goal)}
                    disabled={progressSubmittingId === goal.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {progressSubmittingId === goal.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-3">
            <Target className="w-6 h-6 text-emerald-600 dark:text-[#e8643a]" />
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            No goals yet
          </p>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            Add your first goal above to start tracking progress.
          </p>
        </div>
      )}
    </div>
  );
}
export default Goals;
