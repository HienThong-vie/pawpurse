import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/utils";

function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  //form field
  const [name, setName] = useState("");
  const [target_amount, setTargetAmount] = useState("");
  const [current_amount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [progressInput, setProgressInput] = useState({});
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
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
    if (editId == null) {
      const response = await fetch(`http://localhost:8000/goals/`, {
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
    } else {
      const response = await fetch(
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
    }
    initPage();
    setEditId(null);
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
  }
  function handleEdit(goal) {
    setEditId(goal.id);
    setName(goal.name);
    setCurrentAmount(String(goal.current_amount));
    setTargetAmount(String(goal.target_amount));
    setDeadline(goal.deadline?.split("T")[0] || "");
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
    const newAmount = Number(goal.current_amount) + added;

    await fetch(`http://localhost:8000/goals/${goal.id}?user_id=${user?.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_amount: newAmount }),
    });

    initPage();
    setProgressInput({ ...progressInput, [goal.id]: "" });
  }
  return (
    <div>
      <div>
        {/*form field */}
        <input
          type="text"
          placeholder="goal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="target amount"
          value={target_amount}
          onChange={(e) => setTargetAmount(e.target.value)}
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <button onClick={() => handleSubmit()}>
          {editId ? "Update Goal" : "Add Goal"}
        </button>
      </div>
      <div>
        {/*goal cards sections */}
        {goals.map((goal) => {
          const percentage =
            goal.target_amount > 0
              ? (goal.current_amount / goal.target_amount) * 100
              : 0;
          return (
            <div key={goal.id}>
              <p>
                {goal.name} - Target:{" "}
                {formatCurrency(goal.target_amount, baseCurrency)} (
                {goal.currency})
              </p>
              <div className="w-full bg-gray-200 rounded h-4">
                <div
                  className="bg-orange-500 h-4 rounded"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>

              <p>
                {formatCurrency(goal.current_amount, baseCurrency)} /{" "}
                {formatCurrency(goal.target_amount, baseCurrency)} (
                {percentage.toFixed(1)}%)
              </p>

              <p>
                Deadline:{" "}
                {goal.deadline
                  ? new Date(goal.deadline).toLocaleDateString()
                  : "No deadline"}
              </p>

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
              />

              <button onClick={() => handleAddProgress(goal)}>
                Add Progress
              </button>
              <button onClick={() => handleEdit(goal)}>Edit</button>

              <button onClick={() => handleDelete(goal.id)}>Delete</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default Goals;
