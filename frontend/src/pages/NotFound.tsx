import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0f0f0f] font-[Inter] p-6">
      <p className="text-7xl sm:text-8xl font-extrabold tracking-tight text-emerald-500 dark:text-[#e8643a] mb-2">
        404
      </p>
      <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Page not found
      </p>
      <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-8 text-center max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 dark:bg-[#e8643a] text-white text-sm font-semibold hover:bg-emerald-600 dark:hover:bg-[#d2552d] transition-colors"
      >
        <Home className="w-4 h-4" />
        Go to Dashboard
      </button>
    </div>
  );
}

export default NotFound;
