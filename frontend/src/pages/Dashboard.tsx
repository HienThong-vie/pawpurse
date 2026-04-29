import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

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

  async function fetchDashboardData() {
    const [transData, analysisData] = await Promise.all([
      fetch(`http://localhost:8000/transactions/?user_id=${user?.id}`).then(
        (r) => r.json(),
      ),
      fetch(`http://localhost:8000/analysis/?user_id=${user?.id}`).then((r) =>
        r.json(),
      ),
    ]);
    setTransactions(transData);
    setAnalysis(analysisData);
    setLoading(false);
  }

  useEffect(() => {
    fetchDashboardData();
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
          <p>${totalIncome.toFixed(2)}</p>
        </div>

        <div>
          <p>Total Expense</p>
          <p>${totalExpense.toFixed(2)}</p>
        </div>

        <div>
          <p>Balance</p>
          <p>${balance.toFixed(2)}</p>
          <p></p>
        </div>

        <div>
          <h3>Spending By Category</h3>
          {Object.entries(analysis.spending_by_category || {}).map(
            ([cat, amount]) => (
              <div key={cat}>
                <span>{cat}</span>
                <span>${(amount as number).toFixed(2)}</span>
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
