import {
  type ReactNode,
  createContext,
  useState,
  useContext,
  useCallback,
  useRef,
} from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: async () => false,
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 font-[Inter]"
          onClick={() => settle(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3 mb-4">
              {options.danger && (
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  {options.title ?? "Are you sure?"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                  {options.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-sm font-semibold text-gray-700 dark:text-white bg-white dark:bg-[#0f0f0f] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                  options.danger
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-emerald-500 dark:bg-[#e8643a] hover:bg-emerald-600 dark:hover:bg-[#d2552d]"
                }`}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
