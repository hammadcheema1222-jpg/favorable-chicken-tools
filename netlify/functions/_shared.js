// Shared helpers for the data + auth functions.
// Not deployed as its own endpoint (Netlify skips files starting with "_").

// Change these in Netlify: Site configuration -> Environment variables ->
// STAFF_PIN and OWNER_PIN. These defaults only apply if you haven't set
// them yet - change them as soon as the site is live.
export const STAFF_PIN = process.env.STAFF_PIN || "1111";
export const OWNER_PIN = process.env.OWNER_PIN || "2580";

export function roleForPin(pin) {
  if (!pin) return null;
  if (pin === OWNER_PIN) return "owner";
  if (pin === STAFF_PIN) return "staff";
  return null;
}

// Keys a "staff" PIN is allowed to read/write. Owner PIN can touch everything.
const STAFF_EXACT_KEYS = new Set([
  "order-items-v1",
  "stock-list-entries-v1",
  "inventory-state-v1",
  "staff-names-v1",
]);
const STAFF_PREFIXES = ["daily-sales-", "clock-"];

export function keyAllowed(role, key) {
  if (role === "owner") return true;
  if (role !== "staff") return false;
  if (STAFF_EXACT_KEYS.has(key)) return true;
  return STAFF_PREFIXES.some((p) => key.startsWith(p));
}

export function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
