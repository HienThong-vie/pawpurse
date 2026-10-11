export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

import { apiFetch, API_BASE } from "./api";

export async function fetchBaseCurrency(): Promise<string> {
  try {
    const response = await apiFetch(`${API_BASE}/settings/`);
    const data = await response.json();
    return data.base_currency || "USD";
  } catch {
    return "USD";
  }
}

/** Best-effort human-readable message from an unknown thrown value
 *  (Error, EmailJS `{ text }` response, or a plain string). */
export function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    if ("message" in err && typeof err.message === "string") return err.message;
    if ("text" in err && typeof err.text === "string") return err.text;
  }
  return "";
}
