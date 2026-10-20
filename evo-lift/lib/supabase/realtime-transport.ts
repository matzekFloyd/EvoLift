/**
 * Realtime options for Node without a global WebSocket (Node before 22).
 * Browsers and Node 22+ already expose `WebSocket`; leave transport unset there.
 *
 * @see https://supabase.com/changelog/37869-change-in-realtime-js-affecting-node-js-22
 */
export function realtimeTransportOptions(): {
  realtime?: { transport: typeof WebSocket };
} {
  if (typeof globalThis.WebSocket !== "undefined") {
    return {};
  }
  // Lazy require so client bundles that never hit this branch avoid pulling in `ws`.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ws = require("ws") as typeof WebSocket;
  return { realtime: { transport: ws } };
}
