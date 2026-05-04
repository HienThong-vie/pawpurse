import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  //form field
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [is_recurring, setIsRecurring] = useState(false);
  const [recurring_interval, setRecurringInterval] = useState("");
  //category field
  const [name, setName] = useState("");
  async function fetchTransactions() {
    const respone = await fetch(
      `http://localhost:8000/transactions/?user_id=${user?.id}`,
      { method: "GET" },
    );
    const data = await respone.json();
    setTransactions(data);
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
    fetchTransactions();
    fetchCategories();
  }, []);

  async function handleSubmit() {
    if (editId == null) {
      const respone = await fetch(`http://localhost:8000/transactions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          amount: parseFloat(amount),
          type,
          category,
          note,
          date,
          is_recurring,
          recurring_interval,
        }),
      });
    } else {
      const respone = await fetch(
        `http://localhost:8000/transactions/${editId}?user_id=${user?.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.id,
            amount: parseFloat(amount),
            type,
            category,
            note,
            date,
          }),
        },
      );
    }
    fetchTransactions();
    setEditId(null);
    setAmount("");
    setType("expense");
    setCategory("");
    setNote("");
    setDate("");
    setIsRecurring(false);
  }

  async function handleDelete(id) {
    const respone = await fetch(
      `http://localhost:8000/transactions/${id}?user_id=${user?.id}`,
      { method: "DELETE" },
    );
    fetchTransactions();
  }

  async function handleEdit(transaction) {
    setEditId(transaction.id);
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setCategory(transaction.category);
    setNote(transaction.note || "");
    setDate(transaction.date?.split("T")[0] || "");
  }
  async function handleAddCategory() {
    const response = await fetch(`http://localhost:8000/categories/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user?.id,
        name,
      }),
    });
    fetchCategories();
    setName("");
  }
  async function handleDeleteCategory(category_id) {
    const respone = await fetch(
      `http://localhost:8000/categories/{category_id}?id=${category_id}&user_id=${user?.id}`,
      { method: "DELETE" },
    );
    fetchCategories();
  }
  return (
    <div>
      <div>
        {/* form field */}
        <h2>{editId ? "Update Transactions" : "Add Transaction"}</h2>
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          type="text"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={is_recurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          Recurring Transaction
        </label>
        {is_recurring && (
          <select
            value={recurring_interval}
            onChange={(e) => setRecurringInterval(e.target.value)}
          >
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
        )}

        <button onClick={() => handleSubmit()}>
          {editId ? "Update Transaction" : "Add Transaction"}
        </button>
      </div>

      <div>
        <h2>Category Management</h2>
        <input
          type="text"
          placeholder="New category"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={() => handleAddCategory()}>Add cateogry</button>
        <table>
          <thead>
            <tr>
              <th>Categories</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>
                  <button onClick={() => handleDeleteCategory(cat.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.date?.split("T")[0]}</td>
              <td>{t.type}</td>
              <td>{t.category}</td>
              <td>{t.amount}</td>
              <td>{t.note}</td>
              <button onClick={() => handleEdit(t)}>Edit</button>
              <button onClick={() => handleDelete(t.id)}>Delete</button>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Transactions;
