import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { apiFetch, API_BASE } from "../lib/api";
import { useAuth } from "./AuthContext";

export type NotificationItem = {
  id: number;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
};

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteOne: (id: number) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/notifications/`);
      const data = (await res.json()) as NotificationItem[];
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markRead = useCallback(async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await apiFetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await apiFetch(`${API_BASE}/notifications/read-all`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  }, []);

  const deleteOne = useCallback(async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiFetch(`${API_BASE}/notifications/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
      loading,
      refresh,
      markRead,
      markAllRead,
      deleteOne,
    }),
    [notifications, loading, refresh, markRead, markAllRead, deleteOne],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
