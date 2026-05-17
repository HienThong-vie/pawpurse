import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Plus,
  Search,
  TrendingUp,
  AlertCircle,
  PiggyBank,
  ArrowUp,
  X,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
};

const PLACEHOLDER_RESPONSES: Record<string, string> = {
  "How's my spending going this month?":
    "I'm reviewing your spending patterns for this month. Full AI-powered insights are on the way — I'll soon show you a detailed breakdown of where your money is going and how it compares to previous months.",
  "Do I have any budget issues I should know about?":
    "I'm checking your budget allocations against recent transactions. AI-powered budget analysis is coming — I'll flag categories where you're overspending and suggest targeted adjustments.",
  "Where can I save more money based on my spending habits?":
    "I'm scanning your transaction history for savings opportunities. AI-powered recommendations are coming soon — I'll pinpoint your biggest discretionary expenses and suggest smart ways to cut back.",
};

function getDefaultResponse(content: string): string {
  return (
    PLACEHOLDER_RESPONSES[content] ??
    "Thanks for your question! AI-powered financial advice is coming soon. I'll give you personalized insights based on your transaction history, budgets, and goals."
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Shared input bar — identical visual in both states
function InputBar({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onSend,
  disabled,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl w-full mx-auto flex items-center gap-2 bg-gray-50 dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] rounded-2xl px-3 py-2">
      <Plus className="shrink-0 w-4 h-4 text-gray-400 dark:text-[#666]" />
      <input
        ref={inputRef}
        type="text"
        placeholder={t("advisor.writeMsgPlaceholder")}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666]"
      />
      <Clock className="shrink-0 w-4 h-4 text-gray-400 dark:text-[#666]" />
      <button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 dark:bg-[#e8643a] text-white flex items-center justify-center hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Send"
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Advisor() {
  const { t } = useTranslation();
  const { user, username } = useAuth();
  const STARTER_CARDS = [
    {
      icon: TrendingUp,
      title: t("advisor.starterCard1Title"),
      sub: t("advisor.starterCard1Sub"),
      prompt: "How's my spending going this month?",
    },
    {
      icon: AlertCircle,
      title: t("advisor.starterCard2Title"),
      sub: t("advisor.starterCard2Sub"),
      prompt: "Do I have any budget issues I should know about?",
    },
    {
      icon: PiggyBank,
      title: t("advisor.starterCard3Title"),
      sub: t("advisor.starterCard3Sub"),
      prompt: "Where can I save more money based on my spending habits?",
    },
  ];
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emptyInputRef = useRef<HTMLInputElement>(null);

  const storageKey = user?.id ? `advisor_chats_${user.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Chat[];
        setChats(
          parsed.map((c) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            messages: c.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          }))
        );
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(chats));
    } catch {}
  }, [chats, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, thinking, activeChatId]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const hasMessages = (activeChat?.messages.length ?? 0) > 0;

  function handleNewChat() {
    const newChat: Chat = {
      id: uid(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setSearchOpen(false);
    // Focus the empty-state input after transition completes
    setTimeout(() => emptyInputRef.current?.focus(), 250);
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || thinking) return;
    setInput("");
    setSearchOpen(false);

    let chatId = activeChatId;
    if (!chatId) {
      const newChat: Chat = {
        id: uid(),
        title: content.slice(0, 40),
        messages: [],
        createdAt: new Date(),
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      chatId = newChat.id;
    }

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        const isFirst = c.messages.length === 0;
        return {
          ...c,
          title: isFirst ? content.slice(0, 40) : c.title,
          messages: [...c.messages, userMsg],
        };
      })
    );

    setThinking(true);
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

    const assistantMsg: Message = {
      id: uid(),
      role: "assistant",
      content: getDefaultResponse(content),
      timestamp: new Date(),
    };

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, assistantMsg] }
          : c
      )
    );
    setThinking(false);
  }

  const inputProps = {
    value: input,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    onSend: () => handleSend(),
    disabled: thinking,
  };

  const filteredChats = chats.filter(
    (c) =>
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.messages.some((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <div className="-m-4 lg:-m-8 flex flex-col h-[calc(100dvh-2.75rem)] lg:h-dvh overflow-hidden font-[Inter]">

      {/* === Top bar === */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] relative">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500 dark:text-[#e8643a]" />
          <span className="font-bold text-gray-900 dark:text-white text-sm">
            {t("advisor.title")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSearchOpen((o) => !o);
              setSearchQuery("");
            }}
            className="p-2 rounded-lg text-gray-500 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Search chats"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-xs font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("advisor.newChat")}
          </button>
        </div>

        {/* Search popover */}
        {searchOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            <div className="absolute top-full right-4 mt-2 w-72 bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-[var(--bd)]">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder={t("advisor.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#666]"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredChats.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-center text-gray-400 dark:text-[#666]">
                    {t("advisor.noChatsFound")}
                  </p>
                ) : (
                  filteredChats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setActiveChatId(c.id); setSearchOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors ${
                        c.id === activeChatId
                          ? "bg-emerald-50 dark:bg-[#e8643a]/10 text-emerald-700 dark:text-[#e8643a]"
                          : "text-gray-700 dark:text-[#e0e0e0]"
                      }`}
                    >
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="text-xs text-gray-400 dark:text-[#666] mt-0.5">
                        {t("advisor.messages", { count: c.messages.length })}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* === Content area — two overlapping panels, opacity-crossfade === */}
      <div className="flex-1 relative overflow-hidden">

        {/* ── Empty state panel ──
            Vertically centered: icon → greeting → subtitle → cards → input
            The input floats directly below the starter cards (no bottom bar). */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-y-auto px-4 py-12 transition-opacity duration-200 ease-out ${
            hasMessages ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-5">
            <Sparkles className="w-7 h-7 text-emerald-500 dark:text-[#e8643a]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 text-center">
            {getGreeting()}, {username}
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-8 text-center max-w-xs">
            {t("advisor.greetingSubtitle")}
          </p>

          {/* Starter cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mb-5">
            {STARTER_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  onClick={() => handleSend(card.prompt)}
                  className="flex flex-col items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] hover:border-emerald-300 dark:hover:border-[#e8643a]/50 transition-all text-left shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-emerald-600 dark:text-[#e8643a]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                      {card.title}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-[#666] mt-0.5">
                      {card.sub}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Input — part of the centered group, not the bottom bar */}
          <InputBar {...inputProps} inputRef={emptyInputRef} />
        </div>

        {/* ── Active state panel ──
            Messages scroll in flex-1; input anchors at the bottom. */}
        <div
          className={`absolute inset-0 flex flex-col transition-opacity duration-200 ease-out ${
            hasMessages ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
              {activeChat?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-500 dark:text-[#e8643a]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-emerald-500 dark:bg-[#e8643a] text-white rounded-tr-sm"
                        : "bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] text-gray-800 dark:text-[#e0e0e0] rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {thinking && (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-500 dark:text-[#e8643a]" />
                  </div>
                  <div className="bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-[#666] animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-[#666] animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-[#666] animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input — bottom-anchored, no divider line */}
          <div className="shrink-0 px-4 py-3 bg-white dark:bg-[var(--bg-page)]">
            <InputBar {...inputProps} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Advisor;
