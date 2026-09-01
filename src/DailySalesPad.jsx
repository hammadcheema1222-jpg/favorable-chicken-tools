import React, { useState, useEffect, useMemo, useRef } from "react";
import { storage } from "./storage.js";
import { Copy, Check, RotateCcw, Printer, CalendarDays } from "lucide-react";
import { COLORS, GLOBAL_STYLE } from "./theme.js";

const FIELD_GROUPS = [
  {
    title: "SALES",
    fields: [
      { key: "front", label: "Front" },
      { key: "delivery", label: "Delivery" },
    ],
  },
  {
    title: "DELIVERY PLATFORMS",
    fields: [
      { key: "jeat", label: "J.eat" },
      { key: "uber", label: "Uber" },
      { key: "delivero", label: "Delivero" },
      { key: "deliveryDrop", label: "Delivery Drop" },
      { key: "pout", label: "P.out" },
    ],
  },
  {
    title: "CARD MACHINES",
    fields: [
      { key: "dojo", label: "Dojo" },
      { key: "teya", label: "Teya" },
    ],
  },
];

const ALL_KEYS = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
const DEDUCTION_KEYS = ["jeat", "uber", "delivero", "deliveryDrop", "pout", "dojo", "teya"];

function emptyValues() {
  const v = {};
  ALL_KEYS.forEach((k) => (v[k] = ""));
  v.totalCash = "";
  return v;
}

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

function todayKey() {
  return toDateKey(new Date());
}

function formatDateLong(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function money(n) {
  return `£${n.toFixed(2)}`;
}

export default function DailySalesPad() {
  const [dateKey, setDateKey] = useState(todayKey());
  const [values, setValues] = useState(emptyValues());
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saveTimer = useRef(null);

  const storageKey = `daily-sales-${dateKey}`;

  // Load values whenever the selected date changes
  useEffect(() => {
    setLoaded(false);
    (async () => {
      try {
        const res = await storage.get(storageKey);
        if (res && res.value) {
          setValues({ ...emptyValues(), ...JSON.parse(res.value) });
        } else {
          setValues(emptyValues());
        }
      } catch (e) {
        setValues(emptyValues());
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  // Debounced auto-save
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const result = await storage.set(storageKey, JSON.stringify(values));
        setSaveError(!result);
      } catch (e) {
        setSaveError(true);
      }
    }, 350);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, loaded]);

  const totalSales = useMemo(() => num(values.front) + num(values.delivery), [values]);
  const deductionsTotal = useMemo(
    () => DEDUCTION_KEYS.reduce((sum, k) => sum + num(values[k]), 0),
    [values]
  );
  const total = totalSales - deductionsTotal;
  const totalCash = num(values.totalCash);
  const difference = total - totalCash;

  function setField(key, val) {
    if (val !== "" && !/^\d*\.?\d{0,2}$/.test(val)) return;
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function resetDay() {
    if (window.confirm("Clear all entries for this day?")) {
      setValues(emptyValues());
    }
  }

  async function copySummary() {
    const lines = [
      `Favorable Chicken - Daily Sales`,
      formatDateLong(dateKey),
      ``,
      `Front: ${money(num(values.front))}`,
      `Delivery: ${money(num(values.delivery))}`,
      `Total Sales: ${money(totalSales)}`,
      ``,
      `J.eat: ${money(num(values.jeat))}`,
      `Uber: ${money(num(values.uber))}`,
      `Delivero: ${money(num(values.delivero))}`,
      `Delivery Drop: ${money(num(values.deliveryDrop))}`,
      `P.out: ${money(num(values.pout))}`,
      `Dojo: ${money(num(values.dojo))}`,
      `Teya: ${money(num(values.teya))}`,
      ``,
      `Total: ${money(total)}`,
      `Total Cash: ${money(totalCash)}`,
      `Difference: ${money(difference)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setCopied(false);
    }
  }

  function getPdf() {
    window.print();
  }

  const diffColor = Math.abs(difference) < 0.005 ? COLORS.sage : COLORS.warn;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.cream }}>
      <style>{`
        ${GLOBAL_STYLE}
        .print-only { display: none; }

        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-page { color: #1B1310; background: #fff; padding: 24px; }
          .print-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ddd; font-size: 14px; }
          .print-row.total { font-weight: 700; font-size: 15px; border-top: 2px solid #1B1310; border-bottom: none; margin-top: 8px; padding-top: 10px; }
        }
      `}</style>

      {/* ===== Interactive pad (screen only) ===== */}
      <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ padding: "28px 20px 16px" }}>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, color: COLORS.cream, lineHeight: 1.1 }}>
            FAVORABLE CHICKEN
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Daily Sales</div>
        </div>

        {/* Date picker */}
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: COLORS.panel, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: "10px 14px",
          }}>
            <CalendarDays size={17} color={COLORS.muted} />
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              style={{ background: "transparent", border: "none", color: COLORS.cream, fontSize: 15, width: "100%" }}
            />
          </div>
        </div>

        {/* Field groups */}
        <div style={{ padding: "0 20px" }}>
          {FIELD_GROUPS.map((group) => (
            <div key={group.title} style={{ marginBottom: 14 }}>
              <div className="display" style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.amber, letterSpacing: "0.05em", marginBottom: 8 }}>
                {group.title}
              </div>
              <div style={{
                background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden",
              }}>
                {group.fields.map((f, idx) => (
                  <div key={f.key} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderTop: idx === 0 ? "none" : `1px solid ${COLORS.border}`,
                  }}>
                    <span style={{ fontSize: 14.5, color: COLORS.cream }}>{f.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: COLORS.muted, fontSize: 14 }}>£</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={values[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        style={{
                          background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8,
                          color: COLORS.cream, fontSize: 15, fontWeight: 600, padding: "8px 10px",
                          width: 100, textAlign: "right",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Live summary */}
          <div style={{
            background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 12,
            padding: 16, marginBottom: 14,
          }}>
            <SummaryLine label="Total Sales (Front + Delivery)" value={totalSales} />
            <SummaryLine label="Total (Sales - deductions)" value={total} bold />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 6px", borderTop: `1px solid ${COLORS.border}`, marginTop: 6 }}>
              <span style={{ fontSize: 14.5, color: COLORS.cream }}>Total Cash</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: COLORS.muted, fontSize: 14 }}>£</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={values.totalCash}
                  onChange={(e) => setField("totalCash", e.target.value)}
                  style={{
                    background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8,
                    color: COLORS.cream, fontSize: 15, fontWeight: 600, padding: "8px 10px",
                    width: 100, textAlign: "right",
                  }}
                />
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", marginTop: 8, borderRadius: 9,
              background: Math.abs(difference) < 0.005 ? "rgba(111,162,135,0.15)" : "rgba(214,73,31,0.15)",
            }}>
              <span className="display" style={{ fontSize: 14, fontWeight: 600, color: diffColor }}>DIFFERENCE</span>
              <span className="display" style={{ fontSize: 18, fontWeight: 700, color: diffColor }}>{money(difference)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button onClick={getPdf} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: COLORS.ember, color: COLORS.cream, border: "none", borderRadius: 10,
              padding: "13px 0", fontSize: 14.5, fontWeight: 600, cursor: "pointer",
            }}>
              <Printer size={16} /> Get PDF
            </button>
            <button onClick={copySummary} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: copied ? COLORS.sage : "transparent", color: copied ? COLORS.bg : COLORS.muted,
              border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "13px 16px",
              fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button onClick={resetDay} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}`,
              borderRadius: 10, padding: "13px 14px", cursor: "pointer",
            }}>
              <RotateCcw size={15} />
            </button>
          </div>

          {saveError && (
            <div style={{ fontSize: 11.5, color: COLORS.ember, marginBottom: 8 }}>
              Couldn't save just now - keep this tab open.
            </div>
          )}
          <div style={{ fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
            Saved automatically for this date. Switch the date above to fill in a different day.
          </div>
        </div>
      </div>

      {/* ===== Print-only clean sheet ===== */}
      <div className="print-only print-page">
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Favorable Chicken</div>
        <div style={{ fontSize: 14, color: "#555", marginBottom: 18 }}>Daily Sales &middot; {formatDateLong(dateKey)}</div>

        <div className="print-row" style={{ fontWeight: 700, borderBottom: "2px solid #1B1310" }}><span>SALES</span><span></span></div>
        <div className="print-row"><span>Front</span><span>{money(num(values.front))}</span></div>
        <div className="print-row"><span>Delivery</span><span>{money(num(values.delivery))}</span></div>
        <div className="print-row total"><span>Total Sales</span><span>{money(totalSales)}</span></div>

        <div className="print-row" style={{ fontWeight: 700, borderBottom: "2px solid #1B1310", marginTop: 18 }}><span>DELIVERY PLATFORMS</span><span></span></div>
        <div className="print-row"><span>J.eat</span><span>{money(num(values.jeat))}</span></div>
        <div className="print-row"><span>Uber</span><span>{money(num(values.uber))}</span></div>
        <div className="print-row"><span>Delivero</span><span>{money(num(values.delivero))}</span></div>
        <div className="print-row"><span>Delivery Drop</span><span>{money(num(values.deliveryDrop))}</span></div>
        <div className="print-row"><span>P.out</span><span>{money(num(values.pout))}</span></div>

        <div className="print-row" style={{ fontWeight: 700, borderBottom: "2px solid #1B1310", marginTop: 18 }}><span>CARD MACHINES</span><span></span></div>
        <div className="print-row"><span>Dojo</span><span>{money(num(values.dojo))}</span></div>
        <div className="print-row"><span>Teya</span><span>{money(num(values.teya))}</span></div>

        <div className="print-row total"><span>Total</span><span>{money(total)}</span></div>
        <div className="print-row"><span>Total Cash</span><span>{money(totalCash)}</span></div>
        <div className="print-row total" style={{ borderTop: "none" }}><span>Difference</span><span>{money(difference)}</span></div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 13.5, color: COLORS.muted }}>{label}</span>
      <span className="display" style={{ fontSize: bold ? 16 : 14.5, fontWeight: bold ? 700 : 500, color: bold ? COLORS.amber : COLORS.cream }}>
        {money(value)}
      </span>
    </div>
  );
}
