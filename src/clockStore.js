// Clock in/out sessions, one array of sessions per calendar day:
// clock-YYYY-MM-DD -> [{ staffId, name, clockIn: ISOString, clockOut: ISOString|null }]
import { storage } from "./storage.js";

export function clockKey(dateKey) {
  return `clock-${dateKey}`;
}

export async function loadClockDay(dateKey) {
  try {
    const res = await storage.get(clockKey(dateKey));
    return res && res.value ? JSON.parse(res.value) : [];
  } catch (e) {
    return [];
  }
}

export async function saveClockDay(dateKey, sessions) {
  return storage.set(clockKey(dateKey), JSON.stringify(sessions));
}

// Hours worked for one completed session (0 if still clocked in or invalid).
export function sessionHours(session) {
  if (!session || !session.clockIn || !session.clockOut) return 0;
  const ms = new Date(session.clockOut) - new Date(session.clockIn);
  return ms > 0 ? ms / 3600000 : 0;
}
