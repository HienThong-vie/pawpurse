import { useEffect, useRef } from "react";
import { Bell, X, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import type { NotificationItem } from "../context/NotificationContext";
import { useToast } from "../context/ToastContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatRelative(iso: string, t: (k: string, opts?: any) => string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return t("notifications.justNow");
  if (minutes < 60) return t("notifications.minutesAgo", { count: minutes });
  if (hours < 24) return t("notifications.hoursAgo", { count: hours });
  if (days === 1) return t("notifications.yesterday");
  return t("notifications.daysAgo", { count: days });
}

function NotificationPanel({ open, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { notifications, loading, markRead, markAllRead, deleteOne } =
    useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Defer one tick so the opening click doesn't immediately close it
    const id = window.setTimeout(() => {
      document.addEventListener("mousedown", onClick);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  function handleItemClick(n: NotificationItem) {
    if (!n.is_read) markRead(n.id);
    if (n.data?.action === "navigate_goals") {
      onClose();
      navigate("/goals");
    }
  }

  async function handleMarkAllRead() {
    await markAllRead();
    toast.success(t("notifications.allMarkedRead"));
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    await deleteOne(id);
    toast.success(t("notifications.deleted"));
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 dark:bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      />

      {/* Sliding panel */}
      <aside
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-screen w-[320px] bg-white dark:bg-[var(--bg-surface)] border-l border-gray-200 dark:border-[var(--bd)] shadow-xl flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
        aria-label={t("notifications.title")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[var(--bd)]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("notifications.title")}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={notifications.every((n) => n.is_read)}
              className="text-xs font-medium text-emerald-600 dark:text-[#e8643a] hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1"
            >
              {t("notifications.markAllRead")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto thin-scrollbar">
          {loading ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-gray-100 dark:bg-[var(--bg-muted)] animate-pulse"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[var(--bg-muted)] flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-gray-400 dark:text-[#666]" />
              </div>
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">
                {t("notifications.empty")}
              </p>
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`group relative cursor-pointer px-4 py-3 border-b border-gray-100 dark:border-[var(--bd)] hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] transition-colors ${
                    !n.is_read
                      ? "border-l-2 border-l-emerald-500 dark:border-l-[#e8643a]"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm truncate ${
                          !n.is_read
                            ? "font-semibold text-gray-900 dark:text-white"
                            : "font-medium text-gray-700 dark:text-[#e0e0e0]"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-[#a0a0a0] line-clamp-2">
                          {n.body}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-[#666] text-right tabular-nums">
                    {formatRelative(n.created_at, t)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

export default NotificationPanel;
