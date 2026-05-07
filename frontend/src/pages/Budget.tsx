import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/utils";

function Budget() {
  const { user } = useAuth();
  const [editId, setEditId] = useState<number | null>(null);
  //backend
  const [budgets, setBudgets] = useState<any[]>([]); //GET method
  const [categories, setCategories] = useState<any[]>([]); //GET method
  //form field
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState("");
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");

  async function fetchCategories() {
    const respone = await fetch(
      `http://localhost:8000/categories/?user_id=${user?.id}`,
      { method: "GET" },
    );
    const data = await respone.json();
    setCategories(data);
  }
  async function fetchBudgets() {
    const response = await fetch(
      `http://localhost:8000/budgets/?user_id=${user?.id}&base_currency=${baseCurrency}`,
      { method: "GET" },
    );
    const data = await response.json();
    setBudgets(data);
  }

  useEffect(() => {
    async function init() {
      const response = await fetch(
        `http://localhost:8000/settings/?user_id=${user?.id}`,
      );
      const data = await response.json();
      setBaseCurrency(data.base_currency);

      const budgetResponse = await fetch(
        `http://localhost:8000/budgets/?user_id=${user?.id}&base_currency=${data.base_currency}`,
      );
      const budgetRes = await budgetResponse.json();
      fetchCategories();
      setBudgets(budgetRes);
    }
    init();
  }, []);

  async function handleSubmit() {
    if (!category || !limit || !period) {
      alert("please fill in all fields");
      return;
    }
    if (editId == null) {
      const response = await fetch(`http://localhost:8000/budgets/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          category,
          limit: parseFloat(limit),
          period,
          currency: baseCurrency,
        }),
      });
    } else {
      const response = await fetch(
        `http://localhost:8000/budgets/${editId}?user_id=${user?.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user?.id,
            category,
            limit: parseFloat(limit),
            period,
            currency: baseCurrency,
          }),
        },
      );
    }
    fetchBudgets();
    setCategory("");
    setLimit("");
    setPeriod("");
    setEditId(null);
  }
  async function handleDelete(budget_id) {
    const respone = await fetch(
      `http://localhost:8000/budgets/${budget_id}?user_id=${user?.id}`,
      { method: "DELETE" },
    );
    fetchBudgets();
  }
  async function handleEdit(budget) {
    setEditId(budget.id);
    setCategory(budget.category);
    setLimit(String(budget.limit));
    setPeriod(budget.period);
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

        <button onClick={() => handleSubmit()}>
          {editId ? "Update Budget" : "Add Budget"}
        </button>
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
                {budget.category} - limit:{" "}
                {formatCurrency(budget.limit, baseCurrency)} / {budget.period}
              </p>

              {/* progress bars */}
              <div className="w-full bg-gray-200 rounded h-4">
                <div
                  className={`${statusColor} h-4 rounded`}
                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                ></div>
              </div>
              <p>
                Spent: {formatCurrency(budget.spent, baseCurrency)} (
                {budget.percentage?.toFixed(1)}%)
              </p>

              <button onClick={() => handleDelete(budget.id)}>Delete</button>
              <button onClick={() => handleEdit(budget)}>Edit</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default Budget;
