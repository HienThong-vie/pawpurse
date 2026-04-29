import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { PieChart, Pie, Cell } from "recharts";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
function Charts() {
  const { user } = useAuth();
  //backend
  const [transactions, setTransactions] = useState<any[]>([]); //GET method
  const [analysis, setAnalysis] = useState({
    spending_by_category: {},
    budget_analysis: [],
    advice: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeChart, setActiveChart] = useState<string>("donut");

  async function fetchChartsData() {
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
    fetchChartsData();
  }, []);
  const donutData = Object.entries(analysis.spending_by_category || {}).map(
    ([name, value]) => ({ name, value }),
  );
  const COLORS = [
    "#e8643a",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#ec4899",
  ];
  const monthlyData: Record<
    string,
    { month: string; income: number; expense: number }
  > = {};

  transactions.forEach((t) => {
    const month = t.date?.slice(0, 7); // extracts "YYYY-MM"
    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expense: 0 };
    }
    if (t.type === "income") {
      monthlyData[month].income += t.amount;
    } else {
      monthlyData[month].expense += t.amount;
    }
  });

  const barData = Object.values(monthlyData).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  if (loading) {
    return <p>Loading...</p>;
  } else {
    return (
      <div>
        <h1 className="text-lg text-center">Chart page</h1>
        {activeChart == "donut" && (
          <div>
            <PieChart width={400} height={400}>
              <Pie
                data={donutData}
                cx={200}
                cy={200}
                innerRadius={80}
                outerRadius={140}
                dataKey="value"
              >
                {donutData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        )}
        {activeChart === "bar" && (
          <div>
            <BarChart width={600} height={400} data={barData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" />
              <Bar dataKey="expense" fill="#e8643a" />
            </BarChart>
          </div>
        )}
        <div>
          <button onClick={() => setActiveChart("donut")}>
            Spending Breakdown
          </button>
          <button onClick={() => setActiveChart("bar")}>Monthly Trend</button>
        </div>
      </div>
    );
  }
}
export default Charts;
