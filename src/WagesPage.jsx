import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, CalendarDays, Printer } from "lucide-react";
import { COLORS, GLOBAL_STYLE, PRINT_STYLE } from "./theme.js";
import { storage } from "./storage.js";
import { loadRoster, saveRoster, newStaffId } from "./staffStore.js";
import { loadClockDay, sessionHours } from "./clockStore.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOf(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function addDays(dateKey, n) {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekRangeLabel(mondayKey) {
  const monday = new Date(mondayKey + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function money(n) {
  return `£${n.toFixed(2)}`;
}

function emptyHours() {
  return DAYS.map(() => "");
}
function autoSource() {
  return DAYS.map(() => "auto");
}

export default function WagesPage() {
  const [weekStart, setWeekStart] = useState(mondayOf(todayKey()));
  const [rows, setRows] = useState([]);
  const [paid, setPaid] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [printTarget, setPrintTarget] = useState(null); // null | 'all' | staffId
  const saveTimer = useRef(null);

  const weekKey = `wages-${weekStart}`;

  // Load roster + this week's saved data + this week's clock sessions, then merge.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoaded(false);
      const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

      const [roster, savedRes, daysSessions] = await Promise.all([
        loadRoster(),
        storage.get(weekKey),
        Promise.all(dates.map(loadClockDay)),
      ]);

      let saved = null;
      try {
        saved = savedRes && savedRes.value ? JSON.parse(savedRes.value) : null;
      } catch (e) {
        saved = null;
      }

      const savedMap = new Map((saved?.staff || []).map((s) => [s.staffId, s]));
      const rosterIds = new Set(roster.map((r) => r.id));

      const merged = roster.map((r) => {
        const prev = savedMap.get(r.id);
        return prev
          ? { ...prev, name: r.name }
          : { staffId: r.id, name: r.name, rate: r.rate != null ? String(r.rate) : "", hours: emptyHours(), hoursSource: autoSource() };
      });
      // Keep anyone who has pay recorded this week even if later removed from the roster.
      for (const s of saved?.staff || []) {
        if (!rosterIds.has(s.staffId)) merged.push({ ...s, former: true });
      }

      const withAutoHours = merged.map((row) => {
        if (row.former) return row; // don't touch historical/former rows
        const hours = [...row.hours];
        const src = row.hoursSource ? [...row.hoursSource] : autoSource();
        dates.forEach((d, idx) => {
          if (src[idx] === "manual") return;
          const session = daysSessions[idx].find((s) => s.staffId === row.staffId);
          const h = session ? sessionHours(session) : 0;
          hours[idx] = h > 0 ? String(Math.round(h * 100) / 100) : "";
        });
        return { ...row, hours, hoursSource: src };
      });

      if (!cancelled) {
        setRows(withAutoHours);
        setPaid(!!(saved && saved.paid));
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  // Debounced save of this week's record, plus keep the roster's rates/names in sync.
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await storage.set(weekKey, JSON.stringify({ weekStart, staff: rows, paid }));
      const roster = await loadRoster();
      const byId = new Map(roster.map((r) => [r.id, r]));
      let rosterChanged = false;
      for (const row of rows) {
        if (row.former) continue;
        const r = byId.get(row.staffId);
        if (r && (r.name !== row.name || String(r.rate) !== String(row.rate))) {
          byId.set(row.staffId, { ...r, name: row.name, rate: row.rate });
          rosterChanged = true;
        }
      }
      if (rosterChanged) await saveRoster(Array.from(byId.values()));
    }, 400);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, paid, loaded]);

  // Trigger the print dialog once the print-only view has updated for printTarget
  useEffect(() => {
    if (!printTarget) return;
    const t = setTimeout(() => window.print(), 60);
    const reset = () => setPrintTarget(null);
    window.addEventListener("afterprint", reset);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", reset);
    };
  }, [printTarget]);

  function updateRate(staffId, value) {
    if (value !== "" && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setRows((prev) => prev.map((r) => (r.staffId === staffId ? { ...r, rate: value } : r)));
  }

  function updateHours(staffId, dayIdx, value) {
    if (value !== "" && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.staffId !== staffId) return r;
        const hours = [...r.hours];
        const src = [...r.hoursSource];
        hours[dayIdx] = value;
        src[dayIdx] = value === "" ? "auto" : "manual";
        return { ...r, hours, hoursSource: src };
      })
    );
  }

  async function addStaff() {
    const name = window.prompt("Staff name?");
    if (!name || !name.trim()) return;
    const rate = window.prompt("Hourly rate (£)?", "0") || "0";
    const roster = await loadRoster();
    const id = newStaffId();
    await saveRoster([...roster, { id, name: name.trim(), rate }]);
    setRows((prev) => [...prev, { staffId: id, name: name.trim(), rate, hours: emptyHours(), hoursSource: autoSource() }]);
  }

  async function removeStaff(staffId, name) {
    if (!window.confirm(`Remove ${name} from the staff list? Past weeks already saved will still show their pay.`)) return;
    const roster = await loadRoster();
    await saveRoster(roster.filter((r) => r.id !== staffId));
    setRows((prev) => prev.filter((r) => r.staffId !== staffId));
  }

  const computed = useMemo(
    () =>
      rows.map((r) => {
        const totalHours = r.hours.reduce((sum, h) => sum + num(h), 0);
        const pay = totalHours * num(r.rate);
        return { ...r, totalHours, pay };
      }),
    [rows]
  );

  const weekTotal = computed.reduce((sum, r) => sum + r.pay, 0);
  const rangeLabel = weekRangeLabel(weekStart);
  const singlePayslip = printTarget && printTarget !== "all" ? computed.find((r) => r.staffId === printTarget) : null;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.cream }}>
      <style>{GLOBAL_STYLE}{PRINT_STYLE}</style>
      <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, color: COLORS.cream }}>Staff Wages</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Hours fill in automatically from Clock In/Out</div>
          </div>
          <button
            onClick={() => setPrintTarget("all")}
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 9, color: COLORS.cream, padding: "9px 10px", display: "flex", cursor: "pointer" }}
            aria-label="Get payroll PDF"
          >
            <Printer size={16} />
          </button>
        </div>

        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px" }}>
            <CalendarDays size={17} color={COLORS.muted} />
            <span style={{ fontSize: 13, color: COLORS.muted }}>Week starting</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(mondayOf(e.target.value))}
              style={{ background: "transparent", border: "none", color: COLORS.cream, fontSize: 15, marginLeft: "auto" }}
            />
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>
          {computed.map((s) => (
            <div key={s.staffId} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, marginBottom: 12, opacity: s.former ? 0.6 : 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  placeholder="Staff name"
                  value={s.name}
                  disabled={s.former}
                  onChange={(e) => setRows((prev) => prev.map((r) => (r.staffId === s.staffId ? { ...r, name: e.target.value } : r)))}
                  style={{ flex: 1, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 14.5, padding: "9px 10px" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "0 10px" }}>
                  <span style={{ color: COLORS.muted, fontSize: 13 }}>£/hr</span>
                  <input
                    type="text" inputMode="decimal" value={s.rate} disabled={s.former}
                    onChange={(e) => updateRate(s.staffId, e.target.value)}
                    style={{ width: 46, background: "transparent", border: "none", color: COLORS.cream, fontSize: 14.5, fontWeight: 600, padding: "9px 0", textAlign: "center" }}
                  />
                </div>
                {!s.former && (
                  <button onClick={() => removeStaff(s.staffId, s.name)} style={{ background: "none", border: "none", color: COLORS.muted, padding: 4, display: "flex", cursor: "pointer" }}>
                    <X size={17} />
                  </button>
                )}
              </div>

              {s.former && (
                <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>No longer on the staff list - shown for this week's records only.</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 10 }}>
                {DAYS.map((d, idx) => (
                  <div key={d}>
                    <div style={{ fontSize: 9.5, color: COLORS.muted, textAlign: "center", marginBottom: 3 }}>{d}</div>
                    <input
                      type="text" inputMode="decimal" placeholder="0" value={s.hours[idx]} disabled={s.former}
                      onChange={(e) => updateHours(s.staffId, idx, e.target.value)}
                      title={s.hoursSource[idx] === "auto" ? "Auto-filled from Clock In/Out" : "Entered by hand"}
                      style={{
                        width: "100%", background: COLORS.panelAlt,
                        border: `1px solid ${s.hoursSource[idx] === "auto" && s.hours[idx] ? COLORS.sage : COLORS.border}`,
                        borderRadius: 6, color: COLORS.cream, fontSize: 13, padding: "6px 2px", textAlign: "center",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: COLORS.muted, borderTop: `1px solid ${COLORS.border}`, paddingTop: 8 }}>
                <span>{s.totalHours.toFixed(1)} hrs</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="display" style={{ color: COLORS.amber, fontWeight: 700, fontSize: 15 }}>{money(s.pay)}</span>
                  <button onClick={() => setPrintTarget(s.staffId)} disabled={!s.name} style={{ background: "none", border: "none", color: s.name ? COLORS.cream : COLORS.border, padding: 2, display: "flex", cursor: s.name ? "pointer" : "default" }} aria-label="Get payslip PDF">
                    <Printer size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addStaff}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: "transparent", color: COLORS.muted, border: `1px dashed ${COLORS.border}`,
              borderRadius: 10, padding: "12px 0", fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 16,
            }}
          >
            <Plus size={15} /> Add staff
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13, color: COLORS.muted, cursor: "pointer" }}>
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Wages for this week have been paid
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <span className="display" style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.amber }}>TOTAL WAGES THIS WEEK</span>
            <span className="display" style={{ fontSize: 18, fontWeight: 700, color: COLORS.cream }}>{money(weekTotal)}</span>
          </div>
        </div>

        <div style={{ padding: "16px 20px 0", fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
          Green-bordered boxes are filled in automatically from Clock In/Out. Type over a box to correct it by hand; clear it to go back to automatic.
        </div>
      </div>

      {/* ===== Print-only: full payroll register ===== */}
      {printTarget === "all" && (
        <div className="print-only print-page">
          <div className="print-header">Favorable Chicken</div>
          <div className="print-sub">Payroll Register &middot; Week of {rangeLabel}</div>
          <table className="print-table">
            <thead>
              <tr><th>Name</th><th style={{ textAlign: "right" }}>Rate</th><th style={{ textAlign: "right" }}>Hours</th><th style={{ textAlign: "right" }}>Pay</th></tr>
            </thead>
            <tbody>
              {computed.filter((r) => r.name).map((r) => (
                <tr key={r.staffId}>
                  <td>{r.name}</td>
                  <td style={{ textAlign: "right" }}>{money(num(r.rate))}/hr</td>
                  <td style={{ textAlign: "right" }}>{r.totalHours.toFixed(1)}</td>
                  <td style={{ textAlign: "right" }}>{money(r.pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-row total"><span>Total wages this week</span><span>{money(weekTotal)}</span></div>
        </div>
      )}

      {/* ===== Print-only: single payslip ===== */}
      {singlePayslip && (
        <div className="print-only print-page">
          <div className="print-header">Favorable Chicken</div>
          <div className="print-sub">Payslip &middot; Week of {rangeLabel}</div>
          <div className="print-grid-hdr">{singlePayslip.name}</div>
          <table className="print-table">
            <thead>
              <tr>{DAYS.map((d) => <th key={d} style={{ textAlign: "right" }}>{d}</th>)}</tr>
            </thead>
            <tbody>
              <tr>{singlePayslip.hours.map((h, i) => <td key={i} style={{ textAlign: "right" }}>{num(h) || "-"}</td>)}</tr>
            </tbody>
          </table>
          <div className="print-row"><span>Hourly rate</span><span>{money(num(singlePayslip.rate))}</span></div>
          <div className="print-row"><span>Total hours</span><span>{singlePayslip.totalHours.toFixed(1)}</span></div>
          <div className="print-row total"><span>Total pay</span><span>{money(singlePayslip.pay)}</span></div>
        </div>
      )}
    </div>
  );
}
