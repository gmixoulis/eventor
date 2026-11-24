/**
 * Artificial network latency so the demo can show loading states. 0 by default:
 * raise it to demonstrate latency without touching the rest of the app.
 */
export const API_LATENCY_MS = 0;

export function delay(): Promise<void> {
  return API_LATENCY_MS > 0
    ? new Promise((resolve) => setTimeout(resolve, API_LATENCY_MS))
    : Promise.resolve();
}
