import { useState, useEffect, useRef, useCallback } from "react";
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
  MoreVertical,
  Pin,
  Pencil,
  Trash2,
  Menu,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { apiFetch, API_BASE } from "../lib/api";
import supabase from "../lib/supabaseClient";
import type { LayoutOutletContext } from "../components/layout";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string — kept as string for easy JSON round-trip
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  pinned: boolean;
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

function UsageModal({
  variant,
  used,
  limit,
  resetDate,
  onClose,
}: {
  variant: "warning" | "limit";
  used: number;
  limit: number;
  resetDate: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isLimit = variant === "limit";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] rounded-2xl shadow-xl p-6 text-center">
        <div
          className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
            isLimit
              ? "bg-red-50 dark:bg-red-500/10"
              : "bg-amber-50 dark:bg-amber-500/10"
          }`}
        >
          <AlertCircle
            className={`w-6 h-6 ${
              isLimit
                ? "text-red-500 dark:text-red-400"
                : "text-amber-500 dark:text-amber-400"
            }`}
          />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
          {isLimit ? t("advisor.limitModalTitle") : t("advisor.warnModalTitle")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-5">
          {isLimit
            ? t("advisor.limitModalBody", { limit, date: resetDate })
            : t("advisor.warnModalBody", { used, limit })}
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
        >
          {t("advisor.modalDismiss")}
        </button>
      </div>
    </div>
  );
}

function Advisor() {
  const { t } = useTranslation();
  const { user, username } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { openSidebar } = useOutletContext<LayoutOutletContext>();

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

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatsLoading, setChatsLoading] = useState(true);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [modal, setModal] = useState<"warning" | "limit" | null>(null);
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameCancelledRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emptyInputRef = useRef<HTMLInputElement>(null);

  // Migrate localStorage chats to backend (one-time, for existing users)
  const migrateLocalStorage = useCallback(
    async (userId: string, serverChats: Chat[]) => {
      if (serverChats.length > 0) return; // already have server data
      const lsKey = `advisor_chats_${userId}`;
      try {
        const raw = localStorage.getItem(lsKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Array<{
          id: string;
          title: string;
          messages: Array<{ id: string; role: string; content: string; timestamp: string | Date }>;
          createdAt: string | Date;
          pinned?: boolean;
        }>;
        if (!Array.isArray(parsed) || parsed.length === 0) return;

        // Upload each chat to the backend
        for (const c of parsed.slice(0, 50)) {
          try {
            const msgs = (c.messages ?? []).map((m) => ({
              id: m.id ?? uid(),
              role: m.role,
              content: m.content,
              timestamp:
                typeof m.timestamp === "string"
                  ? m.timestamp
                  : new Date(m.timestamp).toISOString(),
            }));
            const r = await apiFetch(`${API_BASE}/advisor/chats`, {
              method: "POST",
              body: JSON.stringify({ title: c.title || "Imported chat" }),
            });
            const created: Chat = await r.json();
            if (msgs.length > 0) {
              await apiFetch(`${API_BASE}/advisor/chats/${created.id}`, {
                method: "PUT",
                body: JSON.stringify({ messages: msgs, pinned: c.pinned ?? false }),
              });
            }
          } catch {
            // Skip individual failures
          }
        }
        // Remove migrated data
        localStorage.removeItem(lsKey);
        localStorage.removeItem(`advisor_active_chat_${userId}`);

        // Reload chats from server after migration
        const r2 = await apiFetch(`${API_BASE}/advisor/chats`);
        const migrated: Chat[] = await r2.json();
        setChats(migrated);
      } catch {
        // Migration is best-effort; ignore errors
      }
    },
    [],
  );

  // Load chats: try backend first, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session || cancelled) return;

        // Fetch usage (always works — existing endpoint)
        try {
          const usageRes = await apiFetch(`${API_BASE}/advisor/usage`);
          if (!cancelled) setUsage(await usageRes.json());
        } catch {
          /* usage stays null */
        }

        // Try to fetch chats from backend; fall back to localStorage on any error
        let loaded = false;
        try {
          const chatsRes = await apiFetch(`${API_BASE}/advisor/chats`);
          const serverChats: Chat[] = await chatsRes.json();
          if (!cancelled) {
            setChats(serverChats);
            loaded = true;
            const savedActiveId = user?.id
              ? localStorage.getItem(`advisor_active_chat_${user.id}`)
              : null;
            if (savedActiveId && serverChats.some((c) => c.id === savedActiveId)) {
              setActiveChatId(savedActiveId);
            }
            // One-time migration from localStorage
            if (user?.id) {
              await migrateLocalStorage(user.id, serverChats);
            }
          }
        } catch {
          /* backend chat endpoints not yet deployed — fall back to localStorage */
        }

        // localStorage fallback (same device, or backend not yet deployed)
        if (!loaded && user?.id && !cancelled) {
          try {
            const lsKey = `advisor_chats_${user.id}`;
            const raw = localStorage.getItem(lsKey);
            if (raw) {
              const parsed = JSON.parse(raw) as Chat[];
              setChats(parsed);
              const savedId = localStorage.getItem(`advisor_active_chat_${user.id}`);
              if (savedId && parsed.some((c) => c.id === savedId)) {
                setActiveChatId(savedId);
              }
            }
          } catch {
            /* localStorage unavailable */
          }
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setChatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist chats to localStorage as a safety net (works even when backend is down)
  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`advisor_chats_${user.id}`, JSON.stringify(chats));
    } catch {
      /* ignore quota errors */
    }
  }, [chats, user?.id]);

  // Persist active chat id locally
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

  // Open warning / limit popups based on usage
  useEffect(() => {
    if (!usage || !user?.id) return;
    if (usage.uses_this_week >= usage.limit) {
      setModal("limit");
    } else if (usage.uses_this_week >= 6) {
      const key = `advisor_warn_shown_${user.id}`;
      try {
        if (!sessionStorage.getItem(key)) {
          setModal("warning");
          sessionStorage.setItem(key, "1");
        }
      } catch {
        /* sessionStorage unavailable */
      }
    }
  }, [usage, user?.id]);

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

  async function handleNewChat() {
    let newId = uid();
    let newCreatedAt = new Date().toISOString();
    // Try to create on backend; fall back to local-only if unavailable
    try {
      const r = await apiFetch(`${API_BASE}/advisor/chats`, {
        method: "POST",
        body: JSON.stringify({ title: "New Chat" }),
      });
      const chat: Chat = await r.json();
      newId = chat.id;
      newCreatedAt = chat.created_at;
    } catch {
      /* backend not yet deployed — use local ID */
    }
    const newChat: Chat = { id: newId, title: "New Chat", messages: [], pinned: false, created_at: newCreatedAt };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    setSearchOpen(false);
    setTimeout(() => emptyInputRef.current?.focus(), 250);
  }

  function openChatMenu(e: React.MouseEvent, chatId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 144 });
    setMenuChatId(chatId);
  }

  function togglePin(chatId: string) {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const newPinned = !chat.pinned;
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, pinned: newPinned } : c)),
    );
    setMenuChatId(null);
    apiFetch(`${API_BASE}/advisor/chats/${chatId}`, {
      method: "PUT",
      body: JSON.stringify({ pinned: newPinned }),
    }).catch(() => {});
  }

  function startRename(chat: Chat) {
    renameCancelledRef.current = false;
    setRenamingId(chat.id);
    setRenameValue(chat.title);
    setMenuChatId(null);
  }

  function commitRename() {
    if (renameCancelledRef.current) {
      renameCancelledRef.current = false;
      return;
    }
    const id = renamingId;
    if (!id) return;
    const next = renameValue.trim().slice(0, 60);
    if (next) {
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: next } : c)),
      );
      apiFetch(`${API_BASE}/advisor/chats/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title: next }),
      }).catch(() => {});
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function cancelRename() {
    renameCancelledRef.current = true;
    setRenamingId(null);
    setRenameValue("");
  }

  async function deleteChat(chat: Chat) {
    setMenuChatId(null);
    const ok = await confirm({
      title: t("advisor.deleteChatTitle"),
      message: t("advisor.deleteChatMessage", { title: chat.title }),
      confirmLabel: t("advisor.deleteChatConfirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`${API_BASE}/advisor/chats/${chat.id}`, {
        method: "DELETE",
      });
    } catch {
      // Optimistically remove anyway
    }
    setChats((prev) => prev.filter((c) => c.id !== chat.id));
    if (activeChatId === chat.id) setActiveChatId(null);
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || thinking || limitReached) return;
    setInput("");
    setSearchOpen(false);

    let chatId = activeChatId;
    let messageHistory: Message[] = [];

    if (!chatId) {
      // Try to create chat on backend; fall back to local-only ID so the AI call always proceeds
      let newId = uid();
      let newCreatedAt = new Date().toISOString();
      try {
        const r = await apiFetch(`${API_BASE}/advisor/chats`, {
          method: "POST",
          body: JSON.stringify({ title: content.slice(0, 40) }),
        });
        const created: Chat = await r.json();
        newId = created.id;
        newCreatedAt = created.created_at;
      } catch {
        /* backend not yet deployed — local-only chat */
      }
      const newChat: Chat = { id: newId, title: content.slice(0, 40), messages: [], pinned: false, created_at: newCreatedAt };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newId);
      chatId = newId;
    } else {
      messageHistory = chats.find((c) => c.id === chatId)?.messages ?? [];
      // Auto-title from first message if still "New Chat"
      const existingChat = chats.find((c) => c.id === chatId);
      if (existingChat && existingChat.title === "New Chat" && messageHistory.length === 0) {
        const autoTitle = content.slice(0, 40);
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title: autoTitle } : c)),
        );
        apiFetch(`${API_BASE}/advisor/chats/${chatId}`, {
          method: "PUT",
          body: JSON.stringify({ title: autoTitle }),
        }).catch(() => {});
      }
    }

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, userMsg] }
          : c,
      ),
    );

    setThinking(true);

    const payload = {
      messages: [...messageHistory, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    try {
      const r = await apiFetch(`${API_BASE}/advisor/chat`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: data.message || "",
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messageHistory, userMsg, assistantMsg];

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: updatedMessages }
            : c,
        ),
      );

      // Sync updated messages to backend
      apiFetch(`${API_BASE}/advisor/chats/${chatId}`, {
        method: "PUT",
        body: JSON.stringify({ messages: updatedMessages }),
      }).catch(() => {});

      setUsage({
        uses_this_week: data.uses_this_week,
        limit: data.limit,
        resets_at: usage?.resets_at ?? new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "");
      if (message.includes("429")) {
        try {
          const u = await apiFetch(`${API_BASE}/advisor/usage`);
          setUsage(await u.json());
        } catch {
          /* ignore */
        }
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

  const filteredChats = chats
    .filter(
      (c) =>
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messages.some((m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    )
    .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false));

  return (
    <div className="-m-4 lg:-m-8 flex flex-col h-dvh overflow-hidden font-[Inter]">
      {/* === Top bar === */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[var(--bd)] bg-white dark:bg-[var(--bg-page)] relative">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={openSidebar}
            className="lg:hidden p-1.5 -ml-1 rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          {companionEmoji ? (
            <span className="text-xl leading-none" aria-hidden="true">
              {companionEmoji}
            </span>
          ) : (
            <Sparkles className="w-5 h-5 text-emerald-500 dark:text-[#e8643a]" />
          )}
          <span className="font-bold text-gray-900 dark:text-white text-sm truncate">
            {companionName || t("advisor.title")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSearchOpen((o) => !o);
              setSearchQuery("");
              setMenuChatId(null);
              cancelRename();
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
                {chatsLoading ? (
                  <p className="px-4 py-6 text-sm text-center text-gray-400 dark:text-[#666]">
                    Loading…
                  </p>
                ) : filteredChats.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-center text-gray-400 dark:text-[#666]">
                    {t("advisor.noChatsFound")}
                  </p>
                ) : (
                  filteredChats.map((c) => (
                    <div
                      key={c.id}
                      className={`group flex items-center gap-1 px-2 py-2 transition-colors ${
                        c.id === activeChatId
                          ? "bg-emerald-50 dark:bg-[#e8643a]/10"
                          : "hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      {renamingId === c.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          maxLength={60}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitRename();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelRename();
                            }
                          }}
                          className="flex-1 min-w-0 text-sm bg-white dark:bg-[var(--bg-page)] border border-emerald-300 dark:border-[#e8643a]/50 rounded-md px-2 py-1 outline-none text-gray-900 dark:text-white"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setActiveChatId(c.id);
                            setSearchOpen(false);
                          }}
                          className="flex-1 min-w-0 text-left px-2"
                        >
                          <p
                            className={`font-medium text-sm flex items-center gap-1.5 ${
                              c.id === activeChatId
                                ? "text-emerald-700 dark:text-[#e8643a]"
                                : "text-gray-700 dark:text-[#e0e0e0]"
                            }`}
                          >
                            {c.pinned && (
                              <Pin className="w-3 h-3 shrink-0 fill-current" />
                            )}
                            <span className="truncate">{c.title}</span>
                          </p>
                          <p className="text-xs text-gray-400 dark:text-[#666] mt-0.5">
                            {t("advisor.messages", {
                              count: c.messages.length,
                            })}
                          </p>
                        </button>
                      )}
                      <button
                        onClick={(e) => openChatMenu(e, c.id)}
                        className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-page)] transition-colors"
                        aria-label="Chat options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {menuChatId && menuPos && (
              <>
                <div
                  className="fixed inset-0 z-[55]"
                  onClick={() => setMenuChatId(null)}
                />
                <div
                  className="fixed z-[56] w-36 bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--bd)] rounded-lg shadow-lg py-1"
                  style={{ top: menuPos.top, left: menuPos.left }}
                >
                  {(() => {
                    const chat = chats.find((c) => c.id === menuChatId);
                    if (!chat) return null;
                    return (
                      <>
                        <button
                          onClick={() => togglePin(chat.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <Pin className="w-3.5 h-3.5 shrink-0" />
                          {chat.pinned
                            ? t("advisor.menuUnpin")
                            : t("advisor.menuPin")}
                        </button>
                        <button
                          onClick={() => startRename(chat)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-[#e0e0e0] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 shrink-0" />
                          {t("advisor.menuRename")}
                        </button>
                        <button
                          onClick={() => deleteChat(chat)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          {t("advisor.menuDelete")}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
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
          </div>
        </div>
      </div>

      {modal && (
        <UsageModal
          variant={modal}
          used={used}
          limit={limit}
          resetDate={resetsAt}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default Advisor;
