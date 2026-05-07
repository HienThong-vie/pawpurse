import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/utils";

function Dashboard() {
  const { user } = useAuth();
  //backend
  const [transactions, setTransactions] = useState<any[]>([]); //GET method
  const [analysis, setAnalysis] = useState({
    spending_by_category: [],
    budget_analysis: [],
    advice: [],
  }); //GET method
  const [loading, setLoading] = useState<boolean>(true);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  useEffect(() => {
    async function init() {
      // fetch settings first and get value directly
      const settingsRes = await fetch(
        `http://localhost:8000/settings/?user_id=${user?.id}`,
      );
      const settingsData = await settingsRes.json();
      setBaseCurrency(settingsData.base_currency);

      // use settingsData.base_currency directly, NOT baseCurrency state
      const analysisRes = await fetch(
        `http://localhost:8000/analysis/?user_id=${user?.id}&base_currency=${settingsData.base_currency}`,
      );
      const analysisData = await analysisRes.json();
      const transRes = await fetch(
        `http://localhost:8000/transactions/?user_id=${user?.id}&base_currency=${settingsData.base_currency}`,
      );
      const transData = await transRes.json();
      setTransactions(transData);
      setAnalysis(analysisData);
      setLoading(false);
    }
    init();
  }, []);
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((transaction) => {
    if (transaction.type == "income") {
      totalIncome += transaction.amount;
    } else if (transaction.type == "expense") {
      totalExpense += transaction.amount;
    }
  });

  const balance = totalIncome - totalExpense;
  if (loading) {
    return <p>loading...</p>;
  } else {
    return (
      <div>
        <h1 className="text-lg text-center">Dashboard page</h1>
        {/* summary cards */}
        <div>
          <p>Total Income</p>
          <p>{formatCurrency(totalIncome, baseCurrency)}</p>
        </div>

        <div>
          <p>Total Expense</p>
          <p>{formatCurrency(totalExpense, baseCurrency)}</p>
        </div>

        <div>
          <p>Balance</p>
          <p>{formatCurrency(balance, baseCurrency)}</p>
          <p></p>
        </div>

        <div>
          <h3>Spending By Category</h3>
          {Object.entries(analysis.spending_by_category || {}).map(
            ([cat, amount]) => (
              <div key={cat}>
                <span>{cat}</span>
                <span>{formatCurrency(amount as number, baseCurrency)}</span>
              </div>
            ),
          )}
        </div>

        <div>
          <h3>Smart Alert</h3>
          {analysis.advice && analysis.advice.length > 0 ? (
            analysis.advice.map((advice, index) => <p key={index}>{advice}</p>)
          ) : (
            <p>No alert - set up budgets to get advices</p>
          )}
        </div>
      </div>
    );
  }
}
export default Dashboard;
