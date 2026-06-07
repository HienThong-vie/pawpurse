import supabase from "./supabaseClient";

export const API_BASE: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:8000"
).replace(/\/+$/, ""); // strip trailing slash(es) so `${API_BASE}/x` never yields `//x`

export async function apiFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  const headers = {
    "Content-Type": "application/json",
    ...(options?.headers || {}),
    ...(accessToken && {
      Authorization: `Bearer ${accessToken}`,
    }),
  };
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    console.error(`API call failed: ${url}`, err);
    throw new Error(err?.message ?? "Network error");
  }
  if (!response.ok) {
    console.error(`API error: ${url} returned ${response.status}`);
    throw new Error(`Request failed (${response.status})`);
  }
  return response;
}
