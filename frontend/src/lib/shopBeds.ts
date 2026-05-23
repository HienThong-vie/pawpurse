export type ShopBed = {
  id: string;
  cost: number;
  emoji: string;
  color: string;
};

// Keep in sync with backend/routers/mascot.py::SHOP_BEDS. Names are translated
// via i18n at render time (companion.beds.<id>) — do not store English names here.
export const SHOP_BEDS: ShopBed[] = [
  { id: "default", cost: 0, emoji: "🟫", color: "#8B6F47" },
  { id: "blue_cushion", cost: 10, emoji: "🔵", color: "#3B82F6" },
  { id: "pink_pillow", cost: 15, emoji: "🩷", color: "#EC4899" },
  { id: "royal_bed", cost: 25, emoji: "👑", color: "#8B5CF6" },
  { id: "space_pod", cost: 30, emoji: "🚀", color: "#1E1B4B" },
  { id: "nature_nest", cost: 20, emoji: "🌿", color: "#10B981" },
];

export function getBed(id: string): ShopBed {
  return SHOP_BEDS.find((b) => b.id === id) ?? SHOP_BEDS[0];
}

// Used to notify the bottom-left SleepingMascot widget when the equipped bed
// changes from the Companion page — Layout renders SleepingMascot once and we
// don't want a heavyweight context just for two consumers.
export const MASCOT_UPDATED_EVENT = "mascot:updated";
