import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Zap, Flame, Home, Wrench, Truck, Receipt as ReceiptIcon } from "lucide-react";
import { COLORS, GLOBAL_STYLE } from "./theme.js";
import {
  CATEGORIES, categoryLabel,
  loadExpenses, saveExpenses, loadExpenseLog, saveExpenseLog,
  newExpenseId, addMonths, daysUntil,
} from "./expensesStore.js";

const CATEGORY_ICONS = {
  electricity: Zap, gas: Flame, rent: Home, maintenance: Wrench, stock: Truck, other: ReceiptIcon,
};

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

function niceDate(dateKey) {
  return new Date(dateKey + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function dueLabel(dateKey) {
  const days = daysUntil(dateKey);
  if (days < 0) return { text: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, tone: "bad" };
  if (days === 0) return { text: "Due today", tone: "bad" };
  if (days === 1) return { text: "Due tomorrow", tone: "warn" };
  if (days <= 7) return { text: `Due in ${days} days`, tone: "warn" };
  return { text: `Due ${niceDate(dateKey)}`, tone: "ok" };
}

function blankDraft() {
  return { category: "electricity", label: "", amount: "", recurring: true, dueDate: todayKey() };
}

export default function ExpensesPage() {
  const [bills, setBills] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(blankDraft());
  const saveTimer = useRef(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    (async () => {
      setBills(await loadExpenses());
      setLoaded(true);
    })();
  }, []);

  // Debounced save whenever bill list edits happen (label/amount/date typing).
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveExpenses(bills);
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [bills, loaded]);

  const sorted = useMemo(
    () => [...bills].sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0)),
    [bills]
  );

  function updateBill(id, patch) {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  async function removeBill(id, label) {
    if (!window.confirm(`Remove "${label || "this expense"}"? This won't affect amounts already logged as paid.`)) return;
    const next = bills.filter((b) => b.id !== id);
    setBills(next);
    await saveExpenses(next);
  }

  async function markPaid(bill) {
    const amount = num(bill.amount);
    const log = await loadExpenseLog();
    const entry = { id: newExpenseId(), date: todayKey(), category: bill.category, label: bill.label || categoryLabel(bill.category), amount };
    await saveExpenseLog([...log, entry]);

    if (bill.recurring) {
      const next = { ...bill, dueDate: addMonths(bill.dueDate, 1) };
      setBills((prev) => prev.map((b) => (b.id === bill.id ? next : b)));
      await saveExpenses(bills.map((b) => (b.id === bill.id ? next : b)));
    } else {
      const next = { ...bill, paid: true, paidDate: todayKey() };
      setBills((prev) => prev.map((b) => (b.id === bill.id ? next : b)));
      await saveExpenses(bills.map((b) => (b.id === bill.id ? next : b)));
    }
  }

  function startAdd() {
    setDraft(blankDraft());
    setAdding(true);
  }

  async function confirmAdd() {
    if (!draft.dueDate) return;
    const bill = {
      id: newExpenseId(),
      category: draft.category,
      label: draft.label.trim(),
      amount: draft.amount,
      recurring: draft.recurring,
      dueDate: draft.dueDate,
      paid: false,
    };
    const next = [...bills, bill];
    setBills(next);
    await saveExpenses(next);
    setAdding(false);
  }

  const upcoming = sorted.filter((b) => b.recurring || !b.paid);
  const paidOneOff = sorted.filter((b) => !b.recurring && b.paid);
  const overdueCount = upcoming.filter((b) => daysUntil(b.dueDate) < 0).length;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.cream }}>
      <style>{GLOBAL_STYLE}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, color: COLORS.cream }}>Expenses &amp; Bills</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
            Electricity, gas, rent &amp; more - counted against profit when paid
          </div>
        </div>

        {overdueCount > 0 && (
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: "rgba(214,73,31,0.15)",
              border: `1px solid ${COLORS.ember}`, borderRadius: 10, padding: "10px 14px",
            }}>
              <span style={{ fontSize: 13, color: COLORS.cream }}>
                <strong>{overdueCount}</strong> bill{overdueCount === 1 ? "" : "s"} overdue
              </span>
            </div>
          </div>
        )}

        <div style={{ padding: "0 20px" }}>
          {upcoming.length === 0 && !adding && (
            <div style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", padding: "20px 0" }}>
              No bills set up yet. Add electricity, gas, rent or anything else the shop pays regularly.
            </div>
          )}

          {upcoming.map((b) => {
            const Icon = CATEGORY_ICONS[b.category] || ReceiptIcon;
            const due = dueLabel(b.dueDate);
            const toneColor = due.tone === "bad" ? COLORS.ember : due.tone === "warn" ? COLORS.amber : COLORS.muted;
            return (
              <div key={b.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                  <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: COLORS.panelAlt, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} color={COLORS.amber} />
                  </div>
                  <select
                    value={b.category}
                    onChange={(e) => updateBill(b.id, { category: e.target.value })}
                    style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 12.5, padding: "8px 6px" }}
                  >
                    {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <input
                    placeholder="Name (e.g. British Gas)"
                    value={b.label}
                    onChange={(e) => updateBill(b.id, { label: e.target.value })}
                    style={{ flex: 1, minWidth: 0, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 13.5, padding: "9px 10px" }}
                  />
                  <button onClick={() => removeBill(b.id, b.label)} style={{ flexShrink: 0, background: "none", border: "none", color: COLORS.muted, padding: 4, display: "flex", cursor: "pointer" }}>
                    <X size={17} />
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "0 10px" }}>
                    <span style={{ color: COLORS.muted, fontSize: 13 }}>£</span>
                    <input
                      type="text" inputMode="decimal" value={b.amount} placeholder="0.00"
                      onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d{0,2}$/.test(e.target.value)) updateBill(b.id, { amount: e.target.value }); }}
                      style={{ width: 64, background: "transparent", border: "none", color: COLORS.cream, fontSize: 14, fontWeight: 600, padding: "9px 0" }}
                    />
                  </div>
                  <input
                    type="date"
                    value={b.dueDate}
                    onChange={(e) => updateBill(b.id, { dueDate: e.target.value })}
                    style={{ flex: 1, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 13, padding: "8px 10px" }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: COLORS.muted, whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={b.recurring} onChange={(e) => updateBill(b.id, { recurring: e.target.checked })} />
                    Monthly
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${COLORS.border}`, paddingTop: 8 }}>
                  <span style={{ fontSize: 12.5, color: toneColor, fontWeight: 600 }}>{due.text}</span>
                  <button
                    onClick={() => markPaid(b)}
                    disabled={!num(b.amount)}
                    style={{
                      background: COLORS.sage, color: COLORS.bg, border: "none", borderRadius: 7,
                      padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: num(b.amount) ? "pointer" : "default",
                      opacity: num(b.amount) ? 1 : 0.5,
                    }}
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            );
          })}

          {adding ? (
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.amber}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 12.5, padding: "8px 6px" }}
                >
                  {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input
                  placeholder="Name (e.g. Rent)"
                  value={draft.label}
                  onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                  style={{ flex: 1, minWidth: 0, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 13.5, padding: "9px 10px" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "0 10px" }}>
                  <span style={{ color: COLORS.muted, fontSize: 13 }}>£</span>
                  <input
                    type="text" inputMode="decimal" value={draft.amount} placeholder="0.00" autoFocus
                    onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d{0,2}$/.test(e.target.value)) setDraft((d) => ({ ...d, amount: e.target.value })); }}
                    style={{ width: 64, background: "transparent", border: "none", color: COLORS.cream, fontSize: 14, fontWeight: 600, padding: "9px 0" }}
                  />
                </div>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                  style={{ flex: 1, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 13, padding: "8px 10px" }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: COLORS.muted, whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={draft.recurring} onChange={(e) => setDraft((d) => ({ ...d, recurring: e.target.checked }))} />
                  Monthly
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setAdding(false)}
                  style={{ flex: 1, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 8, padding: "10px 0", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAdd}
                  disabled={!draft.dueDate}
                  style={{ flex: 1, background: COLORS.ember, border: "none", color: COLORS.cream, borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Add Bill
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startAdd}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: "transparent", color: COLORS.muted, border: `1px dashed ${COLORS.border}`,
                borderRadius: 10, padding: "12px 0", fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 16,
              }}
            >
              <Plus size={15} /> Add expense or bill
            </button>
          )}

          {paidOneOff.length > 0 && (
            <>
              <div className="display" style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, letterSpacing: "0.05em", margin: "8px 0" }}>
                RECENTLY PAID (ONE-OFF)
              </div>
              {paidOneOff.map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 2px", fontSize: 13, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>
                  <span>{b.label || categoryLabel(b.category)}</span>
                  <span>{money(num(b.amount))} - paid {b.paidDate ? niceDate(b.paidDate) : ""}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: "16px 20px 0", fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
          Tap "Mark Paid" when a bill's paid - monthly bills come straight back due next month. Everything you pay here is subtracted from Net Profit for that week on the Dashboard.
        </div>
      </div>
    </div>
  );
}
