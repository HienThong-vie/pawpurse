import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiFetch, API_BASE } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getBed, MASCOT_UPDATED_EVENT } from "../lib/shopBeds";

type Mascot = {
  companion_type: string;
  companion_name: string;
  active_bed: string;
};

// Routes where the floating widget is hidden. Layout reads this to skip the
// extra bottom padding it adds elsewhere so content can scroll clear of the mascot.
export const MASCOT_HIDDEN_ROUTES = ["/advisor", "/companion"];

function SleepingMascot() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mascot, setMascot] = useState<Mascot | null>(null);
  const [hovering, setHovering] = useState(false);

  const hasCompletedSetup = user?.user_metadata?.has_completed_setup === true;
  const companionType =
    user?.user_metadata?.companion ?? user?.user_metadata?.companion_type;

  useEffect(() => {
    if (!hasCompletedSetup) return;
    let cancelled = false;

    async function load() {
      try {
        const r = await apiFetch(`${API_BASE}/mascot/`);
        const data = await r.json();
        if (!cancelled) setMascot(data);
      } catch {
        // Silent — widget just won't appear. The Companion page surfaces real errors.
      }
    }

    load();
    function onUpdate() {
      load();
    }
    window.addEventListener(MASCOT_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(MASCOT_UPDATED_EVENT, onUpdate);
    };
  }, [hasCompletedSetup, user?.id]);

  if (
    !hasCompletedSetup ||
    !mascot ||
    !companionType ||
    MASCOT_HIDDEN_ROUTES.includes(location.pathname)
  )
    return null;

  const emoji = mascot.companion_type === "cat" ? "🐱" : "🐶";
  const bed = getBed(mascot.active_bed);

  return (
    <button
      type="button"
      onClick={() => navigate("/companion")}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className=" fixed bottom-4 right-4 z-40 flex flex-col items-center justify-end w-20 h-20 group focus:outline-none"
      aria-label={t("sleepingMascot.tooltip", { name: mascot.companion_name })}
    >
      {/* Tooltip above */}
      <span
        className={`absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap px-2 py-1 text-[11px] font-medium text-white bg-gray-900/90 dark:bg-black/80 rounded-md shadow-lg transition-opacity pointer-events-none ${
          hovering ? "opacity-100" : "opacity-0"
        }`}
      >
        {t("sleepingMascot.tooltip", { name: mascot.companion_name })}
      </span>

      {/* Mascot emoji with sleep float */}
      <span
        className="text-4xl leading-none select-none mascot-float drop-shadow-sm"
        aria-hidden="true"
      >
        {emoji}
      </span>

      {/* Bed oval */}
      <span
        className="mt-1 block w-16 h-3 rounded-full shadow-inner ring-1 ring-black/5"
        style={{ background: bed.color }}
        aria-hidden="true"
      />
    </button>
  );
}

export default SleepingMascot;
