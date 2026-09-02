// Shared staff roster, used by Wages (owner, full record incl. pay rate)
// and the Clock In/Out widget (staff, name only - never sees rates).
import { storage } from "./storage.js";

export const ROSTER_KEY = "staff-roster-v1"; // owner-only: [{ id, name, rate }]
export const NAMES_KEY = "staff-names-v1"; // staff-readable: [{ id, name }]

export async function loadRoster() {
  try {
    const res = await storage.get(ROSTER_KEY);
    return res && res.value ? JSON.parse(res.value) : [];
  } catch (e) {
    return [];
  }
}

export async function saveRoster(roster) {
  // Keep the redacted, staff-visible name list in sync any time the
  // owner adds, renames, or removes someone. Both writes run in parallel -
  // there's no need to wait for one before starting the other.
  const names = roster.map(({ id, name }) => ({ id, name }));
  const [namesRes, rosterRes] = await Promise.all([
    storage.set(NAMES_KEY, JSON.stringify(names)),
    storage.set(ROSTER_KEY, JSON.stringify(roster)),
  ]);
  return rosterRes && namesRes ? roster : null;
}

export async function loadNames() {
  try {
    const res = await storage.get(NAMES_KEY);
    return res && res.value ? JSON.parse(res.value) : [];
  } catch (e) {
    return [];
  }
}

export function newStaffId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}