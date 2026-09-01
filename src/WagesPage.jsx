import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, X, CalendarDays, Printer } from "lucide-react";
import { COLORS, GLOBAL_STYLE, PRINT_STYLE } from "./theme.js";
import { storage } from "./storage.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOf(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
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

function money(n) {
  return `£${n.toFixed(2)}`;
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function emptyStaff() {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: "", rate: "", hours: DAYS.map(() => "") };
}

export default function WagesPage() {
  const [weekStart, setWeekStart] = useState(mondayOf(todayKey()));
  const [staff, setStaff] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [printTarget, setPrintTarget] = useState(null); // null | 'all' | staffId
  const saveTimer = useRef(null);

  const storageKey = `wages-${weekStart}`;

  useEffect(() => {
    setLoaded(false);
    (async () => {
      try {
        const res = await storage.get(storageKey);
        setStaff(res && res.value ? JSON.parse(res.value) : [emptyStaff()]);
      } catch (e) {
        setStaff([emptyStaff()]);
      } finally {
        setLoaded(true);
      }
    })();
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      storage.set(storageKey, JSON.stringify(staff));
    }, 350);
    return () => clearTimeout(saveTimer.current);
  }, [staff, loaded, storageKey]);

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

  function updateStaff(id, field, value) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function updateHours(id, dayIdx, value) {
    if (value !== "" && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setStaff((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const hours = [...s.hours];
      hours[dayIdx] = value;
      return { ...s, hours };
    }));
  }

  function addStaff() {
    setStaff((prev) => [...prev, emptyStaff()]);
  }

  function removeStaff(id) {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }

  const rows = useMemo(() => staff.map((s) => {
    const totalHours = s.hours.reduce((sum, h) => sum + num(h), 0);
    const pay = totalHours * num(s.rate);
    return { ...s, totalHours, pay };
  }), [staff]);

  const weekTotal = rows.reduce((sum, r) => sum + r.pay, 0);
  const rangeLabel = weekRangeLabel(weekStart);
  const singlePayslip = printTarget && printTarget !== "all" ? rows.find((r) => r.id === printTarget) : null;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.cream }}>
      <style>{GLOBAL_STYLE}{PRINT_STYLE}</style>
      <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, color: COLORS.cream }}>Staff Wages</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Hours &times; rate, per person, per week</div>
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
          {rows.map((s) => (
            <div key={s.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  placeholder="Staff name"
                  value={s.name}
                  onChange={(e) => updateStaff(s.id, "name", e.target.value)}
                  style={{ flex: 1, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 14.5, padding: "9px 10px" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "0 10px" }}>
                  <span style={{ color: COLORS.muted, fontSize: 13 }}>£/hr</span>
                  <input
                    type="text" inputMode="decimal" value={s.rate}
                    onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) updateStaff(s.id, "rate", v); }}
                    style={{ width: 46, background: "transparent", border: "none", color: COLORS.cream, fontSize: 14.5, fontWeight: 600, padding: "9px 0", textAlign: "center" }}
                  />
                </div>
                <button onClick={() => removeStaff(s.id)} style={{ background: "none", border: "none", color: COLORS.muted, padding: 4, display: "flex", cursor: "pointer" }}>
                  <X size={17} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 10 }}>
                {DAYS.map((d, idx) => (
                  <div key={d}>
                    <div style={{ fontSize: 9.5, color: COLORS.muted, textAlign: "center", marginBottom: 3 }}>{d}</div>
                    <input
                      type="text" inputMode="decimal" placeholder="0" value={s.hours[idx]}
                      onChange={(e) => updateHours(s.id, idx, e.target.value)}
                      style={{ width: "100%", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.cream, fontSize: 13, padding: "6px 2px", textAlign: "center" }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: COLORS.muted, borderTop: `1px solid ${COLORS.border}`, paddingTop: 8 }}>
                <span>{s.totalHours.toFixed(1)} hrs</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="display" style={{ color: COLORS.amber, fontWeight: 700, fontSize: 15 }}>{money(s.pay)}</span>
                  <button
                    onClick={() => setPrintTarget(s.id)}
                    disabled={!s.name}
                    style={{ background: "none", border: "none", color: s.name ? COLORS.cream : COLORS.border, padding: 2, display: "flex", cursor: s.name ? "pointer" : "default" }}
                    aria-label="Get payslip PDF"
                  >
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

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px",
          }}>
            <span className="display" style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.amber }}>TOTAL WAGES THIS WEEK</span>
            <span className="display" style={{ fontSize: 18, fontWeight: 700, color: COLORS.cream }}>{money(weekTotal)}</span>
          </div>
        </div>

        <div style={{ padding: "16px 20px 0", fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
          Printer icon top-right gets the full payroll register. Printer icon on a staff row gets that person's payslip only.
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
              {rows.filter((r) => r.name).map((r) => (
                <tr key={r.id}>
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
