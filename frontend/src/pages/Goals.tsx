import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Target, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency } from "../lib/utils";

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
  async function initPage() {
    const response = await fetch(
      `http://localhost:8000/settings/?user_id=${user?.id}`,
    );
    const data = await response.json();
    setBaseCurrency(data.base_currency);

    const goalsResponse = await fetch(
      `http://localhost:8000/goals/?user_id=${user?.id}&base_currency=${data.base_currency}`,
    );
    const goalsData = await goalsResponse.json();
    setGoals(goalsData);
  }
  useEffect(() => {
    initPage();
  }, []);
  async function handleSubmit() {
    if (!name.trim() || !target_amount) {
      toast.error("Please fill in name and target amount");
      return;
    }
    setSubmitting(true);
    try {
      if (editId == null) {
        await fetch(`http://localhost:8000/goals/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            name,
            target_amount: parseFloat(target_amount),
            current_amount: parseFloat(current_amount) || 0,
            deadline: deadline || null,
          }),
        });
        toast.success("Goal added");
      } else {
        await fetch(
          `http://localhost:8000/goals/${editId}?user_id=${user?.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user?.id,
              name,
              target_amount: parseFloat(target_amount),
              current_amount: parseFloat(current_amount) || 0,
              deadline: deadline || null,
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
    const response = await fetch(
      `http://localhost:8000/goals/${id}?user_id=${user?.id}`,
      { method: "DELETE" },
    );
    initPage();
  }
  async function handleAddProgress(goal) {
    const added = parseFloat(progressInput[goal.id] || "0");
    if (!added || added <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    const newAmount = Number(goal.current_amount) + added;
    setProgressSubmittingId(goal.id);
    try {
      await fetch(
        `http://localhost:8000/goals/${goal.id}?user_id=${user?.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_amount: newAmount }),
        },
      );
      toast.success(`Added ${formatCurrency(added, baseCurrency)} to ${goal.name}`);
      initPage();
      setProgressInput({ ...progressInput, [goal.id]: "" });
    } finally {
      setProgressSubmittingId(null);
    }
  }

  const inputClass =
    "border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] bg-white dark:bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-[#e8643a]/40 focus:border-emerald-500 dark:focus:border-[#e8643a]";

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

      {/* Add / Update Goal */}
      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {editId ? "Update Goal" : "Add Goal"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto] gap-3">
          <input
            type="text"
            placeholder="Goal name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Target amount"
            value={target_amount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
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
