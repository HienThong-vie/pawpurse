import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function Advisor() {
  const { user } = useAuth();
  //backend
  const [grouped, setGrouped] = useState<boolean>(false); //GET method
  const [analysis, setAnalysis] = useState({
    spending_by_category: {},
    budget_analysis: [],
    advice: [],
  });
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
      setAnalysis(analysisData);
    }
    init();
  }, []);

  function handleSwitchMode() {
    setGrouped(!grouped);
  }

  return (
    <div>
      <h1 className="text-lg text-center">Advisor page</h1>
      <div>
        <h2>Advisor</h2>
        <button onClick={handleSwitchMode}>
          {grouped ? "Show Ungrouped" : "Show Grouped"}
        </button>

        {!grouped && (
          <div>
            {analysis.advice.length > 0 ? (
              analysis.advice.map((advice, index) => (
                <p key={index}>{advice}</p>
              ))
            ) : (
              <p>No budget data — set up budgets to see advice</p>
            )}
          </div>
        )}

        {/* Grouped view */}
        {grouped && (
          <div>
            {["exceeded", "warning", "caution", "acceptable"].map((status) => {
              const group = analysis.budget_analysis.filter(
                (b) => b.status === status,
              );
              if (group.length === 0) return null;
              return (
                <div key={status}>
                  <h3>{status.toUpperCase()}</h3>
                  {group.map((item) => (
                    <p key={item.category}>
                      {item.category} — ${item.spent} / ${item.limit} (
                      {item.used_percentage.toFixed(1)}%)
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
export default Advisor;
