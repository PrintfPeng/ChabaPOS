// Shared "already auto-printed" tracker so that two components mounted at
// once on the same device (e.g. the global OrderRealtimeListener + the
// Kitchen Display page) never print the same new order twice.
// Scoped to sessionStorage: resets on tab close, same lifetime as the
// Bluetooth GATT connection itself.

const KEY_PREFIX = 'chabapos-auto-printed-';
const MAX_TRACKED = 500;
const TRIM_TO = 300;

function readSet(branchId: string): Set<number> {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + branchId);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(branchId: string, ids: Set<number>) {
  try {
    sessionStorage.setItem(KEY_PREFIX + branchId, JSON.stringify([...ids]));
  } catch {
    // sessionStorage unavailable/full — dedup degrades gracefully, not fatal
  }
}

/**
 * Atomically claims an order for auto-printing. Returns true the first time
 * it's called for a given (branchId, orderId) pair on this tab; false on any
 * later call, meaning another component already printed it — skip.
 */
export function claimForAutoPrint(branchId: string, orderId: number): boolean {
  const ids = readSet(branchId);
  if (ids.has(orderId)) return false;
  ids.add(orderId);
  writeSet(branchId, ids.size > MAX_TRACKED ? new Set([...ids].slice(-TRIM_TO)) : ids);
  return true;
}
