import { AlertCircle, X } from "lucide-react";

export default function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-4 py-3 mb-6 font-[Inter]">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
      <p className="flex-1 text-sm text-red-700 dark:text-red-300 leading-relaxed">
        Something went wrong: {message}
      </p>
      <button
        onClick={onDismiss}
        className="text-red-400 dark:text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
