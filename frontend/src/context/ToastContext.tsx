import {
  type ReactNode,
  createContext,
  useState,
  useContext,
  useCallback,
} from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    info: (m) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const config = {
    success: {
      Icon: CheckCircle,
      iconClass: "text-emerald-500 dark:text-emerald-400",
      borderClass: "border-l-emerald-500",
    },
    error: {
      Icon: AlertCircle,
      iconClass: "text-red-500 dark:text-red-400",
      borderClass: "border-l-red-500",
    },
    info: {
      Icon: Info,
      iconClass: "text-blue-500 dark:text-blue-400",
      borderClass: "border-l-blue-500",
    },
  }[toast.type];

  const { Icon } = config;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] border-l-4 ${config.borderClass} rounded-lg shadow-lg px-4 py-3 font-[Inter]`}
      role="status"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconClass}`} />
      <p className="flex-1 text-sm text-gray-700 dark:text-[#e0e0e0] leading-relaxed">
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="text-gray-400 dark:text-[#666] hover:text-gray-700 dark:hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
