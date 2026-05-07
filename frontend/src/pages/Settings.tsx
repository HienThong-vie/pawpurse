import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function Settings() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState("");
  async function fetchSettings() {
    const response = await fetch(
      `http://localhost:8000/settings/?user_id=${user?.id}`,
    );
    const data = await response.json();
    setCurrency(data.base_currency);
  }

  async function handleEditCurrency() {
    const response = await fetch(
      `http://localhost:8000/settings/?user_id=${user?.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          base_currency: currency,
        }),
      },
    );
  }
  useEffect(() => {
    fetchSettings();
  }, []);
  return (
    <div>
      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
        <option value="JPY">JPY</option>
        <option value="AUD">AUD</option>
        <option value="VND">VND</option>
      </select>
      <button onClick={(e) => handleEditCurrency()}>Submit</button>
    </div>
  );
}
export default Settings;
