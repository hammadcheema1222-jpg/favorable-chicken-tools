import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, CalendarDays, Printer } from "lucide-react";
import { COLORS, GLOBAL_STYLE, PRINT_STYLE } from "./theme.js";
import { ITEMS } from "./data/catalog.js";
import { storage } from "./storage.js";
import { useAutoSave } from "./useAutoSave.js";
import { receiveStock } from "./inventoryStore.js";

const KEY = "stock-list-entries-v1";
const ITEM_NAMES = ITEMS.map((i) => i[1]);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function money(n) {
  return `£${n.toFixed(2)}`;
}

export default function StockListPage() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(KEY);
        setEntries(res && res.value ? JSON.parse(res.value) : []);
      } catch (e) {
        setEntries([]);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Flushes on tab switch instead of losing an entry you just logged.
  const { saveError } = useAutoSave(
    entries,
    (e) => storage.set(KEY, JSON.stringify(e)),
    { delay: 300, ready: loaded }
  );

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries]
  );

  const weekRange = useMemo(() => {
    const now = new Date(date + "T00:00:00");
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { mondayKey: monday.toISOString().slice(0, 10), sundayKey: sunday.toISOString().slice(0, 10) };
  }, [date]);

  const weekEntries = useMemo(
    () => entries
      .filter((e) => e.date >= weekRange.mondayKey && e.date <= weekRange.sundayKey)
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries, weekRange]
  );

  const weekTotal = useMemo(
    () => weekEntries.reduce((sum, e) => sum + e.price * e.qty, 0),
    [weekEntries]
  );

  async function addEntry() {
    const p = parseFloat(price);
    const q = parseFloat(qty);
    if (!item || isNaN(p) || isNaN(q) || p <= 0 || q <= 0) return;
    const entry = { id: `${Date.now()}`, date, item, price: p, qty: q };
    setEntries((prev) => [...prev, entry]);
    await receiveStock(item, q);
    setPrice("");
    setQty("");
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.cream }}>
      <style>{GLOBAL_STYLE}{PRINT_STYLE}</style>
      <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, color: COLORS.cream }}>Stock List</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Log every delivery as it arrives</div>
        </div>

        {/* Entry form */}
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <CalendarDays size={16} color={COLORS.muted} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 14, padding: "8px 10px", flex: 1 }}
              />
            </div>

            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              style={{
                width: "100%", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8,
                color: item ? COLORS.cream : COLORS.muted, fontSize: 14, padding: "10px", marginBottom: 10,
              }}
            >
              <option value="">Select item...</option>
              {ITEM_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, color: COLORS.muted, marginBottom: 4 }}>Price ©</div>
                <input
                  type="text" inputMode="decimal" placeholder="0.00" value={price}
                  onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setPrice(v); }}
                  style={{ width: "100%", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 15, fontWeight: 600, padding: "9px 10px", textAlign: "center" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, color: COLORS.muted, marginBottom: 4 }}>Qty</div>
                <input
                  type="text" inputMode="decimal" placeholder="0" value={qty}
                  onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setQty(v); }}
                  style={{ width: "100%", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 15, fontWeight: 600, padding: "9px 10px", textAlign: "center" }}
                />
              </div>
            </div>

            <button
              onClick={addEntry}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: COLORS.ember, color: COLORS.cream, border: "none", borderRadius: 9,
                padding: "12px 0", fontSize: 14.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Plus size={16} /> Add to list
            </button>
          </div>
        </div>

        {/* Week total */}
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px",
          }}>
            <span className="display" style={{ fontSize: 13, fontWeight: 600, color: COLORS.amber }}>THIS WEEK'S SPEND</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="display" style={{ fontSize: 17, fontWeight: 700, color: COLORS.cream }}>{money(weekTotal)}</span>
              <button
                onClick={() => window.print()}
                style={{ background: "none", border: "none", color: COLORS.muted, padding: 2, display: "flex", cursor: "pointer" }}
                aria-label="Get PDF"
              >
                <Printer size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Log */}
        <div style={{ padding: "0 20px" }}>
          <div className="display" style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.muted, letterSpacing: "0.05em", marginBottom: 8 }}>
            RECENT ENTRIES
          </div>
          {sorted.length === 0 ? (
            <div style={{ fontSize: 13.5, color: COLORS.muted, padding: "10px 0" }}>No deliveries logged yet.</div>
          ) : (
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
              {sorted.map((e, idx) => (
                <div key={e.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderTop: idx === 0 ? "none" : `1px solid ${COLORS.border}`,
                }}>
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontSize: 14, color: COLORS.cream }}>{e.item}</div>
                    <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>
                      {e.date} &middot; {e.qty} &times; {money(e.price)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span className="display" style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.amber }}>{money(e.price * e.qty)}</span>
                    <button onClick={() => removeEntry(e.id)} style={{ background: "none", border: "none", padding: 4, color: COLORS.muted, cursor: "pointer", display: "flex" }}>
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {saveError && (
          <div style={{ padding: "0 20px", fontSize: 11.5, color: COLORS.ember, marginTop: 12 }}>Couldn't save just now.</div>
        )}
        <div style={{ padding: "16px 20px 0", fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
          Adding an entry updates that item's Qty in Stock on the Inventory tab automatically.
        </div>
      </div>

      {/* ===== Print-only weekly stock list ===== */}
      <div className="print-only print-page">
        <div className="print-header">Favorable Chicken</div>
        <div className="print-sub">Stock List &middot; {weekRange.mondayKey} to {weekRange.sundayKey}</div>
        {weekEntries.length === 0 ? (
          <div style={{ fontSize: 13 }}>No deliveries logged this week.</div>
        ) : (
          <table className="print-table">
            <thead>
              <tr><th>Date</th><th>Item</th><th style={{ textAlign: "right" }}>Price</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Total</th></tr>
            </thead>
            <tbody>
              {weekEntries.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td><td>{e.item}</td>
                  <td style={{ textAlign: "right" }}>{money(e.price)}</td>
                  <td style={{ textAlign: "right" }}>{e.qty}</td>
                  <td style={{ textAlign: "right" }}>{money(e.price * e.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="print-row total"><span>Total spend this week</span><span>{money(weekTotal)}</span></div>
      </div>
    </div>
  );
}
