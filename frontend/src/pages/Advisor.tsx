import { useState, useEffect } from "react";
import { Lightbulb, Sparkles, Bot, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Status = "exceeded" | "warning" | "caution" | "acceptable";

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

  function adviceStatus(msg: string): Status {
    if (msg.includes("🔴")) return "exceeded";
    if (msg.includes("🟠")) return "warning";
    if (msg.includes("🟡")) return "caution";
    return "acceptable";
  }

  function stripEmoji(msg: string): string {
    return msg.replace(/^[🔴🟠🟡🟢]\s*/, "");
  }

  const statusBorder: Record<Status, string> = {
    exceeded: "border-l-[#ef4444]",
    warning: "border-l-[#f97316]",
    caution: "border-l-[#eab308]",
    acceptable: "border-l-[#10b981]",
  };

  const statusBadge: Record<Status, string> = {
    exceeded: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
    warning:
      "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400",
    caution:
      "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    acceptable:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  const statusDot: Record<Status, string> = {
    exceeded: "bg-[#ef4444]",
    warning: "bg-[#f97316]",
    caution: "bg-[#eab308]",
    acceptable: "bg-[#10b981]",
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active
        ? "bg-emerald-500 dark:bg-[#e8643a] text-white"
        : "bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-50 dark:hover:bg-[#222]"
    }`;

  const hasBudgets =
    (analysis.budget_analysis && analysis.budget_analysis.length > 0) ||
    (analysis.advice && analysis.advice.length > 0);

  return (
    <div className="font-[Inter]">
      {/* Page header */}
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Financial Advisor
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">
          Personalized budget insights
        </p>
      </header>

      {/* AI Chat (coming soon) */}
      <section className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-4 lg:p-6 mb-6 lg:mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-[#e8643a]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            AI Financial Advisor
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-4">
          Powered by AI — Coming Soon
        </p>

        {/* Messages area */}
        <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-[#0f0f0f] rounded-lg border border-gray-100 dark:border-[#222] p-4 mb-3">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-emerald-600 dark:text-[#e8643a]" />
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-sm border border-gray-100 dark:border-[#2a2a2a] px-3 py-2 max-w-md">
              <p className="text-xs font-semibold text-gray-700 dark:text-white mb-0.5">
                AI Advisor
              </p>
              <p className="text-sm text-gray-700 dark:text-[#e0e0e0] leading-relaxed">
                Hello! I'm your AI financial advisor. Soon I'll be able to
                answer questions about your finances, suggest savings
                strategies, and help you reach your goals faster. Stay tuned!
              </p>
            </div>
          </div>
        </div>

        {/* Input row */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask me anything about your finances..."
            disabled
            className="flex-1 border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666] bg-white dark:bg-[#0f0f0f] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            disabled
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold opacity-50 cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
        <span className="inline-block mt-3 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-xs font-medium text-gray-600 dark:text-[#a0a0a0]">
          AI features coming in a future update
        </span>
      </section>

      {/* Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => grouped && handleSwitchMode()}
          className={tabClass(!grouped)}
        >
          All Advice
        </button>
        <button
          onClick={() => !grouped && handleSwitchMode()}
          className={tabClass(grouped)}
        >
          Grouped View
        </button>
      </div>

      {/* Empty state */}
      {!hasBudgets && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-sm p-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-3">
            <Lightbulb className="w-6 h-6 text-emerald-600 dark:text-[#e8643a]" />
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            No advice yet
          </p>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
            Set up budgets to start receiving personalized insights.
          </p>
        </div>
      )}

      {/* Ungrouped view */}
      {hasBudgets && !grouped && (
        <div className="flex flex-col gap-3">
          {analysis.advice.map((advice, index) => {
            const status = adviceStatus(advice);
            return (
              <div
                key={index}
                className={`flex items-center justify-between gap-4 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] border-l-4 ${statusBorder[status]} shadow-sm p-4`}
              >
                <p className="text-sm text-gray-700 dark:text-[#e0e0e0] leading-relaxed">
                  {stripEmoji(advice)}
                </p>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[status]}`}
                >
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Grouped view */}
      {hasBudgets && grouped && (
        <div className="flex flex-col gap-6">
          {(["exceeded", "warning", "caution", "acceptable"] as Status[]).map(
            (status) => {
              const group = analysis.budget_analysis.filter(
                (b) => b.status === status,
              );
              if (group.length === 0) return null;
              return (
                <section key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${statusDot[status]}`}
                    />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                      {status}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-[#a0a0a0]">
                      ({group.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.map((item) => (
                      <div
                        key={item.category}
                        className={`bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-[#2a2a2a] border-l-4 ${statusBorder[status]} shadow-sm p-3 flex items-center justify-between`}
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.category}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-[#a0a0a0]">
                          ${item.spent} / ${item.limit}{" "}
                          <span className="text-gray-400 dark:text-[#666]">
                            ({item.used_percentage.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
export default Advisor;
