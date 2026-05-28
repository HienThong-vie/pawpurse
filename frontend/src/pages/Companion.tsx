import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { apiFetch, API_BASE } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { getBed, MASCOT_UPDATED_EVENT } from "../lib/shopBeds";

type Mascot = {
  id: number;
  companion_type: string;
  companion_name: string;
  total_coins: number;
  spent_coins: number;
  available_coins: number;
  owned_beds: string[];
  active_bed: string;
};

type ShopItem = {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  color: string;
  owned: boolean;
};

function Companion() {
  const { t } = useTranslation();
  const toast = useToast();
  const [mascot, setMascot] = useState<Mascot | null>(null);
  const [shop, setShop] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingBedId, setActingBedId] = useState<string | null>(null);

  async function refresh() {
    const [m, s] = await Promise.all([
      apiFetch(`${API_BASE}/mascot/`).then((r) => r.json()),
      apiFetch(`${API_BASE}/mascot/shop`).then((r) => r.json()),
    ]);
    setMascot(m);
    setShop(s);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) toast.error(t("companion.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBuy(item: ShopItem) {
    setActingBedId(item.id);
    try {
      await apiFetch(`${API_BASE}/mascot/buy`, {
        method: "POST",
        body: JSON.stringify({ bed_id: item.id }),
      });
      const localName = t(`companion.beds.${item.id}`, item.name);
      toast.success(t("companion.buyToast", { name: localName }));
      await refresh();
    } catch {
      toast.error(t("companion.buyError"));
    } finally {
      setActingBedId(null);
    }
  }

  async function handleEquip(item: ShopItem) {
    setActingBedId(item.id);
    try {
      await apiFetch(`${API_BASE}/mascot/equip`, {
        method: "PATCH",
        body: JSON.stringify({ bed_id: item.id }),
      });
      const localName = t(`companion.beds.${item.id}`, item.name);
      toast.success(t("companion.equipToast", { name: localName }));
      await refresh();
      // Notify the sleeping mascot widget to refetch and update bed color.
      window.dispatchEvent(new CustomEvent(MASCOT_UPDATED_EVENT));
    } catch {
      toast.error(t("companion.equipError"));
    } finally {
      setActingBedId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 dark:text-[#666]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!mascot) {
    return (
      <p className="text-sm text-center text-gray-500 dark:text-[#a0a0a0] py-24">
        {t("companion.loadError")}
      </p>
    );
  }

  const companionEmoji = mascot.companion_type === "cat" ? "🐱" : "🐶";
  const activeBed = getBed(mascot.active_bed);
  const activeBedLocalName = t(
    `companion.beds.${mascot.active_bed}`,
    mascot.active_bed,
  );

  return (
    <div className="font-[Inter] max-w-4xl mx-auto">
      {/* ── Companion display ─────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-6 mb-4 flex flex-col items-center gap-3">
        <span
          className="text-7xl leading-none mascot-float select-none"
          aria-hidden="true"
        >
          {companionEmoji}
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {mascot.companion_name}
        </h1>
        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
          🪙 {mascot.available_coins} {t("companion.coinsLabel")}
        </p>

        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-[var(--bg-muted)] text-xs text-gray-600 dark:text-[#a0a0a0]">
          <span aria-hidden="true">{activeBed.emoji}</span>
          <span>
            {t("companion.currentBed")}: {activeBedLocalName}
          </span>
        </div>
      </section>

      {/* ── Pet Bed Shop ──────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl border border-gray-300 dark:border-[var(--bd)] shadow-sm p-5 mb-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
          {t("companion.shopTitle")}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shop.map((item) => {
            const isEquipped = item.id === mascot.active_bed;
            const isActing = actingBedId === item.id;
            const canAfford = mascot.available_coins >= item.cost;
            const localName = t(`companion.beds.${item.id}`, item.name);

            return (
              <div
                key={item.id}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors bg-white dark:bg-[var(--bg-page)] ${
                  isEquipped
                    ? "border-emerald-500 dark:border-[#e8643a]"
                    : "border-gray-200 dark:border-[var(--bd)]"
                }`}
              >
                <span className="text-4xl leading-none" aria-hidden="true">
                  {item.emoji}
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-white text-center">
                  {localName}
                </p>
                <p className="text-xs text-gray-500 dark:text-[#a0a0a0] tabular-nums">
                  {item.cost === 0
                    ? t("companion.costFree")
                    : t("companion.costCoins", { cost: item.cost })}
                </p>

                {/* Status */}
                {item.owned ? (
                  isEquipped ? (
                    <span className="mt-1 inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                      ✓ {t("companion.equippedBadge")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEquip(item)}
                      disabled={isActing}
                      className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full border border-emerald-500 dark:border-[#e8643a] text-emerald-600 dark:text-[#e8643a] text-[11px] font-semibold hover:bg-emerald-50 dark:hover:bg-[#e8643a]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActing && <Loader2 className="w-3 h-3 animate-spin" />}
                      {isActing
                        ? t("companion.equipping")
                        : t("companion.equipBtn")}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford || isActing}
                    className={`mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                      canAfford
                        ? "bg-emerald-500 dark:bg-[#e8643a] text-white hover:bg-emerald-600 dark:hover:bg-[#d2552d]"
                        : "bg-gray-200 dark:bg-[var(--bg-muted)] text-gray-400 dark:text-[#666] cursor-not-allowed"
                    } disabled:opacity-60`}
                  >
                    {isActing && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isActing
                      ? t("companion.buying")
                      : t("companion.buyBtn")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Coin history hint ─────────────────────────────────────────── */}
      <p className="text-center text-xs text-gray-400 dark:text-[#666]">
        {t("companion.earnHint")}
      </p>
    </div>
  );
}

export default Companion;
