/**
 * connection Ping Utils
 *
 * Utility for the AIfacilitator application.
 * Uses a lightweight HTTP GET /health ping instead of WebSocket channels,
 * so the connection check works regardless of WebSocket availability.
 */

import { EDGE_FUNCTION_URL } from "@/lib/api";

/**
 * Performs a lightweight HTTP ping to the /health endpoint.
 * This is the primary connection check — it does not depend on WebSocket state.
 * @returns A promise that resolves to true if the backend is reachable.
 */
export const createPingChannel = async (_conversationId: number): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${EDGE_FUNCTION_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);
    return res !== null && res.ok;
  } catch {
    return false;
  }
};

/**
 * Fallback: also pings /health (same as primary, kept for API compatibility).
 * @returns A promise that resolves to true if the backend is reachable.
 */
export const performDatabasePing = async (_conversationId: number): Promise<boolean> => {
  return createPingChannel(_conversationId);
};
