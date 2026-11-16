import type { QueryClient } from "@tanstack/react-query";
export const PRIVACY_EVENT = "koa-privacy-changed";
export function clearPrivateView(client: QueryClient) {
  void client.cancelQueries();
  client.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PRIVACY_EVENT));
}
export function revokeViews(client: QueryClient) {
  clearPrivateView(client);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("koa-permissions-changed", String(Date.now()));
    } catch {
      // Storage can be disabled. Same-tab eviction above must still succeed.
    }
  }
}