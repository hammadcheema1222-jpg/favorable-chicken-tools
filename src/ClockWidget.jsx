import React, { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { COLORS } from "./theme.js";
import { loadNames } from "./staffStore.js";
import { loadClockDay, saveClockDay } from "./clockStore.js";

const WHO_KEY = "fc-clock-who-v1"; // device-local convenience only

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
}

export default function ClockWidget() {
  const [names, setNames] = useState([]);
  const [staffId, setStaffId] = useState(() => localStorage.getItem(WHO_KEY) || "");
  const [sessions, setSessions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const dateKey = todayKey();

  useEffect(() => {
    (async () => {
      const [n, s] = await Promise.all([loadNames(), loadClockDay(dateKey)]);
      setNames(n);
      setSessions(s);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-update the "clocked in for..." duration.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const mySession = useMemo(() => sessions.find((s) => s.staffId === staffId), [sessions, staffId]);
  const me = useMemo(() => names.find((n) => n.id === staffId), [names, staffId]);

  function pickStaff(id) {
    setStaffId(id);
    if (id) localStorage.setItem(WHO_KEY, id);
    else localStorage.removeItem(WHO_KEY);
  }

  async function clockIn() {
    if (!staffId || busy) return;
    setBusy(true);
    const entry = { staffId, name: me ? me.name : "", clockIn: new Date().toISOString(), clockOut: null };
    const next = [...sessions.filter((s) => s.staffId !== staffId), entry];
    setSessions(next);
    await saveClockDay(dateKey, next);
    setBusy(false);
  }

  async function clockOut() {
    if (!staffId || busy || !mySession || mySession.clockOut) return;
    setBusy(true);
    const next = sessions.map((s) => (s.staffId === staffId ? { ...s, clockOut: new Date().toISOString() } : s));
    setSessions(next);
    await saveClockDay(dateKey, next);
    setBusy(false);
  }

  if (!loaded) return null;

  if (names.length === 0) {
    return (
      <div style={barStyle}>
        <Clock size={14} color={COLORS.muted} />
        <span style={{ fontSize: 12, color: COLORS.muted }}>
          No staff set up yet - ask the owner to add names in Wages.
        </span>
      </div>
    );
  }

  if (!staffId || !me) {
    return (
      <div style={barStyle}>
        <Clock size={14} color={COLORS.muted} />
        <span style={{ fontSize: 12, color: COLORS.muted, flexShrink: 0 }}>Who are you?</span>
        <select
          value={staffId}
          onChange={(e) => pickStaff(e.target.value)}
          style={{
            flex: 1, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 7,
            color: COLORS.cream, fontSize: 12.5, padding: "5px 6px", minWidth: 0,
          }}
        >
          <option value="">Select name...</option>
          {names.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </div>
    );
  }

  let status;
  if (mySession && mySession.clockIn && !mySession.clockOut) {
    const mins = Math.max(0, Math.round((now - new Date(mySession.clockIn)) / 60000));
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    status = `Clocked in ${timeLabel(mySession.clockIn)} · ${hrs}h ${rem}m so far`;
  } else if (mySession && mySession.clockOut) {
    status = `Done for today: ${timeLabel(mySession.clockIn)}–${timeLabel(mySession.clockOut)}`;
  } else {
    status = "Not clocked in";
  }

  const isIn = mySession && mySession.clockIn && !mySession.clockOut;
  const isDone = mySession && mySession.clockOut;

  return (
    <div style={barStyle}>
      <Clock size={14} color={COLORS.muted} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: COLORS.cream, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <strong>{me.name}</strong> · {status}
      </span>
      {!isDone && (
        <button
          onClick={isIn ? clockOut : clockIn}
          disabled={busy}
          style={{
            flexShrink: 0, background: isIn ? COLORS.ember : COLORS.sage, color: isIn ? COLORS.cream : COLORS.bg,
            border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", opacity: busy ? 0.6 : 1,
          }}
        >
          {isIn ? "Clock Out" : "Clock In"}
        </button>
      )}
      <button
        onClick={() => pickStaff("")}
        style={{ flexShrink: 0, background: "none", border: "none", color: COLORS.muted, fontSize: 11, cursor: "pointer", padding: "4px 2px" }}
      >
        Not you?
      </button>
    </div>
  );
}

const barStyle = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "7px 14px", background: COLORS.panelAlt, borderBottom: `1px solid ${COLORS.border}`,
};
