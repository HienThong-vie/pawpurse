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
import { useToast } from "../context/ToastContext";
import { apiFetch } from "../lib/api";
import supabase from "../lib/supabaseClient";

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

type Usage = {
  uses_this_week: number;
  limit: number;
  resets_at: string;
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function InputBar({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onSend,
  disabled,
  placeholder,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <div className="max-w-2xl w-full mx-auto flex items-center gap-2 bg-gray-50 dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] rounded-2xl px-3 py-2">
      <Plus className="shrink-0 w-4 h-4 text-gray-400 dark:text-[#888]" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#888] disabled:opacity-60"
      />
      <Clock className="shrink-0 w-4 h-4 text-gray-400 dark:text-[#888]" />
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
  const toast = useToast();

  const companionType =
    (user?.user_metadata?.companion as string | undefined) ??
    (user?.user_metadata?.companion_type as string | undefined) ??
    null;
  const companionName =
    (user?.user_metadata?.companion_name as string | undefined) ?? username;
  const companionEmoji = companionType === "cat" ? "🐱" : companionType === "dog" ? "🐶" : null;

  const STARTER_CARDS = [
    {
      icon: TrendingUp,
      title: t("advisor.starterCard1Title"),
      sub: t("advisor.starterCard1Sub"),
      prompt: "Give me a summary of my spending patterns and top categories",
    },
    {
      icon: AlertCircle,
      title: t("advisor.starterCard2Title"),
      sub: t("advisor.starterCard2Sub"),
      prompt:
        "Are there any budgets I'm at risk of exceeding or have already exceeded?",
    },
    {
      icon: PiggyBank,
      title: t("advisor.starterCard3Title"),
      sub: t("advisor.starterCard3Sub"),
      prompt: "Where can I cut expenses and increase my savings rate?",
    },
  ];

  const storageKey = user?.id ? `advisor_chats_${user.id}` : null;

  const [chats, setChats] = useState<Chat[]>(() => {
    if (!storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Chat[];
      return parsed.map((c) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        messages: c.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      }));
    } catch {
      return [];
    }
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    if (!user?.id) return null;
    try {
      return localStorage.getItem(`advisor_active_chat_${user.id}`) ?? null;
    } catch {
      return null;
    }
  });

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emptyInputRef = useRef<HTMLInputElement>(null);

  // Persist chats
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(chats));
    } catch {
      /* ignore quota errors */
    }
  }, [chats, storageKey]);

  // Persist active chat id
  useEffect(() => {
    if (!user?.id) return;
    try {
      if (activeChatId) {
        localStorage.setItem(`advisor_active_chat_${user.id}`, activeChatId);
      } else {
        localStorage.removeItem(`advisor_active_chat_${user.id}`);
      }
    } catch {
      /* ignore */
    }
  }, [activeChatId, user?.id]);

  // Fetch usage once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) return;
        const r = await apiFetch("http://localhost:8000/advisor/usage");
        const data = await r.json();
        if (!cancelled) setUsage(data);
      } catch {
        // Silent — UI will simply omit the counter
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, thinking, activeChatId]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const hasMessages = (activeChat?.messages.length ?? 0) > 0;

  const used = usage?.uses_this_week ?? 0;
  const limit = usage?.limit ?? 10;
  const limitReached = used >= limit;
  const resetsAt = usage?.resets_at
    ? new Date(usage.resets_at).toLocaleDateString()
    : "";

  let usageBannerClass = "text-gray-400 dark:text-[#666]";
  let usageMessage = t("advisor.usageCounter", { used, limit });
  if (limitReached) {
    usageBannerClass = "text-red-600 dark:text-red-400";
    usageMessage = t("advisor.limitReached", { date: resetsAt });
  } else if (used >= 8) {
    usageBannerClass = "text-orange-600 dark:text-orange-400";
    usageMessage = t("advisor.warningAt8", { used, limit });
  } else if (used >= 6) {
    usageBannerClass = "text-amber-600 dark:text-amber-400";
    usageMessage = t("advisor.warningAt6", { used, limit });
  }

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
    setTimeout(() => emptyInputRef.current?.focus(), 250);
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || thinking || limitReached) return;
    setInput("");
    setSearchOpen(false);

    let chatId = activeChatId;
    let messageHistory: Message[] = [];
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
    } else {
      messageHistory = chats.find((c) => c.id === chatId)?.messages ?? [];
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
      }),
    );

    setThinking(true);

    const payload = {
      messages: [...messageHistory, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    try {
      const r = await apiFetch("http://localhost:8000/advisor/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: data.message || "",
        timestamp: new Date(),
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: [...c.messages, assistantMsg] }
            : c,
        ),
      );
      setUsage({
        uses_this_week: data.uses_this_week,
        limit: data.limit,
        resets_at: usage?.resets_at ?? new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "");
      if (message.includes("429")) {
        // Refresh usage so the banner switches to limitReached
        try {
          const u = await apiFetch("http://localhost:8000/advisor/usage");
          setUsage(await u.json());
        } catch {
          /* ignore */
        }
        toast.error(t("advisor.limitReached", { date: resetsAt || "" }));
      } else {
        toast.error(t("advisor.errorGeneric"));
      }
    } finally {
      setThinking(false);
    }
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
    disabled: thinking || limitReached,
    placeholder: t("advisor.writeMsgPlaceholder"),
  };

  const filteredChats = chats.filter(
    (c) =>
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.messages.some((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  return (
    <div className="-m-4 lg:-m-8 flex flex-col h-[calc(100dvh-2.75rem)] lg:h-dvh overflow-hidden font-[Inter]">
      {/* === Top bar === */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] relative">
        <div className="flex items-center gap-2">
          {companionEmoji ? (
            <span className="text-xl leading-none" aria-hidden="true">
              {companionEmoji}
            </span>
          ) : (
            <Sparkles className="w-5 h-5 text-emerald-500 dark:text-[#e8643a]" />
          )}
          <span className="font-bold text-gray-900 dark:text-white text-sm">
            {companionName || t("advisor.title")}
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
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#888]"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto thin-scrollbar">
                {filteredChats.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-center text-gray-400 dark:text-[#666]">
                    {t("advisor.noChatsFound")}
                  </p>
                ) : (
                  filteredChats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveChatId(c.id);
                        setSearchOpen(false);
                      }}
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

      {/* === Content area === */}
      <div className="flex-1 relative overflow-hidden">
        {/* Empty state */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center overflow-y-auto thin-scrollbar px-4 py-12 transition-opacity duration-200 ease-out ${
            hasMessages ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center mb-5 text-3xl">
            {companionEmoji ?? (
              <Sparkles className="w-7 h-7 text-emerald-500 dark:text-[#e8643a]" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 text-center">
            {getGreeting()}, {username}
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-8 text-center max-w-xs">
            {t("advisor.greetingSubtitle")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mb-5">
            {STARTER_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  onClick={() => handleSend(card.prompt)}
                  disabled={thinking || limitReached}
                  className="flex flex-col items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-surface)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] hover:border-emerald-300 dark:hover:border-[#e8643a]/50 transition-all text-left shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

          <InputBar {...inputProps} inputRef={emptyInputRef} />
          <p className={`text-xs mt-3 ${usageBannerClass}`}>{usageMessage}</p>
        </div>

        {/* Active state */}
        <div
          className={`absolute inset-0 flex flex-col transition-opacity duration-200 ease-out ${
            hasMessages ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex-1 overflow-y-auto thin-scrollbar">
            <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
              {activeChat?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center text-lg">
                      {companionEmoji ?? (
                        <Sparkles className="w-4 h-4 text-emerald-500 dark:text-[#e8643a]" />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-emerald-500 dark:bg-[#e8643a] text-white rounded-tr-sm"
                        : "bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] text-gray-800 dark:text-[#e0e0e0] rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-50 dark:bg-[#e8643a]/10 flex items-center justify-center text-lg">
                    {companionEmoji ?? (
                      <Sparkles className="w-4 h-4 text-emerald-500 dark:text-[#e8643a]" />
                    )}
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

          <div className="shrink-0 px-4 py-3 bg-white dark:bg-[var(--bg-page)]">
            <InputBar {...inputProps} />
            <p className={`text-xs mt-2 text-center ${usageBannerClass}`}>
              {usageMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Advisor;
