import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function Budget() {
  const { user } = useAuth();
  //backend
  const [budgets, setBudgets] = useState<any[]>([]); //GET method
  const [categories, setCategories] = useState<any[]>([]); //GET method
  //form field
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState("");

  async function fetchBudgets() {
    const response = await fetch(
      `http://localhost:8000/budgets/?user_id=${user?.id}`,
      { method: "GET" },
    );
    const data = await response.json();
    setBudgets(data);
  }
  async function fetchCategories() {
    const respone = await fetch(
      `http://localhost:8000/categories/?user_id=${user?.id}`,
      { method: "GET" },
    );
    const data = await respone.json();
    setCategories(data);
  }

  useEffect(() => {
    if (user.id) {
      fetchBudgets();
      fetchCategories();
    }
  }, []);

  async function handleSubmit() {
    const response = await fetch(`http://localhost:8000/budgets/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user?.id,
        category,
        limit: parseFloat(limit),
        period,
      }),
    });
    fetchBudgets();
    setCategory("");
    setLimit("");
    setPeriod("");
  }
  async function handleDelete(budget_id) {
    const respone = await fetch(
      `http://localhost:8000/budgets/${budget_id}?user_id=${user?.id}`,
      { method: "DELETE" },
    );
    fetchBudgets();
  }
  return (
    <div>
      {/* form field */}
      <div>
        <h2>Add new Budget</h2>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {" "}
              {cat.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Amount"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="">Select Period</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>

        <button onClick={() => handleSubmit()}>Add Budget</button>
      </div>
      {/* cards field */}
      <div>
        {budgets.map((budget) => {
          const statusColor =
            {
              acceptable: "bg-green-500",
              caution: "bg-yellow-500",
              warning: "bg-orange-500",
              exceeded: "bg-red-500",
            }[budget.status] || "bg-gray-500";
          return (
            <div key={budget.id}>
              <p>
                {budget.category} - limit: ${budget.limit} / {budget.period}
              </p>

              {/* progress bars */}
              <div className="w-full bg-gray-200 rounded h-4">
                <div
                  className={`${statusColor} h-4 rounded`}
                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                ></div>
              </div>
              <p>
                Spent: ${budget.spent} ({budget.percentage?.toFixed(1)}%)
              </p>

              <button onClick={() => handleDelete(budget.id)}>Delete</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default Budget;
