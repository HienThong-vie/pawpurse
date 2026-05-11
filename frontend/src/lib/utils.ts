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
    hour12: false,
  });
}

import { apiFetch } from "./api";

export async function fetchBaseCurrency(): Promise<string> {
  try {
    const response = await apiFetch("http://localhost:8000/settings/");
    const data = await response.json();
    return data.base_currency || "USD";
  } catch {
    return "USD";
  }
}
