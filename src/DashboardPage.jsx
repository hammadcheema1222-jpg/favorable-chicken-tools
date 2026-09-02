import React, { useState, useEffect, useMemo } from "react";
import { CalendarDays, AlertTriangle, BellRing, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { COLORS, GLOBAL_STYLE, PRINT_STYLE } from "./theme.js";
import { storage } from "./storage.js";
import { loadInventory } from "./inventoryStore.js";
import { ITEMS, SECTIONS } from "./data/catalog.js";
import { loadExpenses, loadExpenseLog, categoryLabel, daysUntil } from "./expensesStore.js";

function mondayOf(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateKey, n) {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayLabel(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

function fullDayLabel(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function niceDate(dateKey) {
  return new Date(dateKey + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function money(n) {
  return `£${n.toFixed(2)}`;
}

export default function DashboardPage() {
  const [weekStart, setWeekStart] = useState(mondayOf(todayKey()));
  const [dailyTotals, setDailyTotals] = useState([]);
  const [stockSpend, setStockSpend] = useState(0);
  const [stockEntries, setStockEntries] = useState([]);
  const [wages, setWages] = useState(0);
  const [wagesPaid, setWagesPaid] = useState(true);
  const [staffRows, setStaffRows] = useState([]);
  const [expenseSpend, setExpenseSpend] = useState(0);
  const [expenseEntries, setExpenseEntries] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [inventory, setInventory] = useState({});
  const [reorderCount, setReorderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      const weekEnd = addDays(weekStart, 6);

      const days = await Promise.all(weekDates.map(async (d) => {
        try {
          const res = await storage.get(`daily-sales-${d}`);
          if (res && res.value) {
            const v = JSON.parse(res.value);
            return { date: d, total: num(v.front) + num(v.delivery) };
          }
        } catch (e) { /* no entry for this day */ }
        return { date: d, total: 0 };
      }));

      let stockTotal = 0;
      let stockWeekEntries = [];
      try {
        const res = await storage.get("stock-list-entries-v1");
        const entries = res && res.value ? JSON.parse(res.value) : [];
        stockWeekEntries = entries.filter((e) => e.date >= weekStart && e.date <= weekEnd);
        stockTotal = stockWeekEntries.reduce((sum, e) => sum + e.price * e.qty, 0);
      } catch (e) { /* no stock entries yet */ }

      let wagesTotal = 0;
      let staffList = [];
      let paidFlag = true;
      try {
        const res = await storage.get(`wages-${weekStart}`);
        const parsed = res && res.value ? JSON.parse(res.value) : null;
        staffList = (parsed && parsed.staff) || [];
        paidFlag = !!(parsed && parsed.paid);
        wagesTotal = staffList.reduce((sum, s) => {
          const hrs = (s.hours || []).reduce((h, x) => h + num(x), 0);
          return sum + hrs * num(s.rate);
        }, 0);
      } catch (e) { /* no wages yet */ }

      let expenseTotal = 0;
      let expenseWeekEntries = [];
      let bills = [];
      try {
        const [log, allBills] = await Promise.all([loadExpenseLog(), loadExpenses()]);
        expenseWeekEntries = log.filter((e) => e.date >= weekStart && e.date <= weekEnd);
        expenseTotal = expenseWeekEntries.reduce((sum, e) => sum + num(e.amount), 0);
        bills = allBills
          .filter((b) => b.recurring || !b.paid)
          .filter((b) => daysUntil(b.dueDate) <= 7)
          .sort((a, b2) => (a.dueDate < b2.dueDate ? -1 : 1));
      } catch (e) { /* no expenses yet */ }

      const inv = await loadInventory();
      const lowCount = Object.values(inv).filter((v) => num(v.qtyInStock) <= num(v.reorderLevel)).length;

      if (!cancelled) {
        setDailyTotals(days);
        setStockSpend(stockTotal);
        setStockEntries(stockWeekEntries);
        setWages(wagesTotal);
        setWagesPaid(paidFlag);
        setStaffRows(staffList.filter((s) => s.name));
        setExpenseSpend(expenseTotal);
        setExpenseEntries(expenseWeekEntries);
        setUpcomingBills(bills);
        setInventory(inv);
        setReorderCount(lowCount);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [weekStart]);

  const totalSales = useMemo(() => dailyTotals.reduce((s, d) => s + d.total, 0), [dailyTotals]);
  const netProfit = totalSales - stockSpend - wages - expenseSpend;
  const chartData = dailyTotals.map((d) => ({ name: dayLabel(d.date), sales: Math.round(d.total * 100) / 100 }));
  const weekEnd = addDays(weekStart, 6);
  const wagesDueReminder = !loading && wages > 0 && !wagesPaid && weekStart <= todayKey();
  const reminderCount = upcomingBills.length + (wagesDueReminder ? 1 : 0);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.cream }}>
      <style>{GLOBAL_STYLE}{PRINT_STYLE}</style>
      <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div className="display" style={{ fontSize: 24, fontWeight: 700, color: COLORS.cream }}>Dashboard</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Weekly overview</div>
          </div>
          <button
            onClick={() => window.print()}
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 9, color: COLORS.cream, padding: "9px 10px", display: "flex", cursor: "pointer" }}
            aria-label="Get overview PDF"
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

        <div style={{ padding: "0 20px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Kpi label="TOTAL SALES" value={totalSales} color={COLORS.amber} />
          <Kpi label="STOCK SPEND" value={stockSpend} color="#D6491F" />
          <Kpi label="STAFF WAGES" value={wages} color="#B08BD9" />
          <Kpi label="EXPENSES" value={expenseSpend} color="#7FA8C9" />
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.sage}`, borderRadius: 12, padding: "12px 14px" }}>
            <div className="display" style={{ fontSize: 10.5, fontWeight: 600, color: COLORS.sage, letterSpacing: "0.04em", marginBottom: 6 }}>NET PROFIT</div>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, color: COLORS.cream }}>{money(netProfit)}</div>
          </div>
        </div>

        {reminderCount > 0 && (
          <div style={{ padding: "0 20px 16px" }}>
            <div className="display" style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.muted, letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <BellRing size={13} /> REMINDERS
            </div>
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
              {wagesDueReminder && (
                <ReminderRow tone="warn" text="This week's wages haven't been marked paid yet" amount={wages} />
              )}
              {upcomingBills.map((b) => {
                const days = daysUntil(b.dueDate);
                const tone = days < 0 ? "bad" : days <= 2 ? "warn" : "ok";
                const text = days < 0
                  ? `${categoryLabel(b.category)}${b.label ? ` - ${b.label}` : ""} overdue since ${niceDate(b.dueDate)}`
                  : days === 0
                    ? `${categoryLabel(b.category)}${b.label ? ` - ${b.label}` : ""} due today`
                    : `${categoryLabel(b.category)}${b.label ? ` - ${b.label}` : ""} due ${niceDate(b.dueDate)}`;
                return <ReminderRow key={b.id} tone={tone} text={text} amount={num(b.amount)} />;
              })}
            </div>
          </div>
        )}

        {reorderCount > 0 && (
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: "rgba(214,73,31,0.15)",
              border: `1px solid ${COLORS.ember}`, borderRadius: 10, padding: "10px 14px",
            }}>
              <AlertTriangle size={16} color={COLORS.ember} />
              <span style={{ fontSize: 13, color: COLORS.cream }}>
                <strong>{reorderCount}</strong> item{reorderCount === 1 ? "" : "s"} low on stock - check Inventory
              </span>
            </div>
          </div>
        )}

        <div style={{ padding: "0 20px" }}>
          <div className="display" style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.muted, letterSpacing: "0.05em", marginBottom: 8 }}>
            DAILY SALES
          </div>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 6px 6px", height: 200 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.muted, fontSize: 13 }}>Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                  <XAxis dataKey="name" stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={{ stroke: COLORS.border }} />
                  <YAxis stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v) => [`£${v}`, "Sales"]}
                    contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.cream, fontSize: 12 }}
                  />
                  <Bar dataKey="sales" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 20px 0", fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
          Printer icon top-right gets one PDF with sales, stock levels &amp; pricing, deliveries, expenses, and wages for this week.
        </div>
      </div>

      {/* ===== Print-only: full weekly business overview ===== */}
      <div className="print-only print-page">
        <div className="print-header">Favorable Chicken</div>
        <div className="print-sub">Weekly Overview &middot; {fullDayLabel(weekStart)} to {fullDayLabel(weekEnd)}</div>

        <div className="print-section-title">Summary</div>
        <div className="print-row"><span>Total Sales</span><span>{money(totalSales)}</span></div>
        <div className="print-row"><span>Stock Spend</span><span>{money(stockSpend)}</span></div>
        <div className="print-row"><span>Staff Wages</span><span>{money(wages)}</span></div>
        <div className="print-row"><span>Other Expenses</span><span>{money(expenseSpend)}</span></div>
        <div className="print-row total"><span>Net Profit</span><span>{money(netProfit)}</span></div>

        <div className="print-section-title">Daily Sales</div>
        <table className="print-table">
          <thead><tr><th>Day</th><th style={{ textAlign: "right" }}>Sales</th></tr></thead>
          <tbody>
            {dailyTotals.map((d) => (
              <tr key={d.date}><td>{fullDayLabel(d.date)}</td><td style={{ textAlign: "right" }}>{money(d.total)}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="print-section-title">Deliveries Logged This Week</div>
        {stockEntries.length === 0 ? (
          <div style={{ fontSize: 12 }}>None logged.</div>
        ) : (
          <table className="print-table">
            <thead><tr><th>Date</th><th>Item</th><th style={{ textAlign: "right" }}>Price</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
            <tbody>
              {stockEntries.map((e) => (
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

        <div className="print-section-title">Other Expenses Paid This Week</div>
        {expenseEntries.length === 0 ? (
          <div style={{ fontSize: 12 }}>None logged.</div>
        ) : (
          <table className="print-table">
            <thead><tr><th>Date</th><th>Category</th><th>Name</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {expenseEntries.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td><td>{categoryLabel(e.category)}</td><td>{e.label}</td>
                  <td style={{ textAlign: "right" }}>{money(num(e.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="print-section-title">Staff Wages</div>
        {staffRows.length === 0 ? (
          <div style={{ fontSize: 12 }}>No staff logged this week.</div>
        ) : (
          <table className="print-table">
            <thead><tr><th>Name</th><th style={{ textAlign: "right" }}>Rate</th><th style={{ textAlign: "right" }}>Hours</th><th style={{ textAlign: "right" }}>Pay</th></tr></thead>
            <tbody>
              {staffRows.map((s) => {
                const hrs = (s.hours || []).reduce((h, x) => h + num(x), 0);
                return (
                  <tr key={s.staffId || s.id}>
                    <td>{s.name}</td>
                    <td style={{ textAlign: "right" }}>{money(num(s.rate))}/hr</td>
                    <td style={{ textAlign: "right" }}>{hrs.toFixed(1)}</td>
                    <td style={{ textAlign: "right" }}>{money(hrs * num(s.rate))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="print-section-title">Stock Levels &amp; Pricing</div>
        {SECTIONS.map((section) => {
          const names = ITEMS.filter((i) => i[0] === section).map((i) => i[1]);
          return (
            <div key={section}>
              <div style={{ fontWeight: 700, fontSize: 11, marginTop: 8, marginBottom: 2 }}>{section}</div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Item</th><th style={{ textAlign: "right" }}>Price</th>
                    <th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {names.map((name) => {
                    const item = inventory[name] || {};
                    const qty = num(item.qtyInStock);
                    const reorder = num(item.reorderLevel);
                    const isLow = qty <= reorder;
                    const price = item.unitPrice !== undefined && item.unitPrice !== "" ? money(num(item.unitPrice)) : "-";
                    return (
                      <tr key={name}>
                        <td>{name}</td>
                        <td style={{ textAlign: "right" }}>{price}</td>
                        <td style={{ textAlign: "right" }}>{qty}</td>
                        <td style={{ textAlign: "right" }} className={isLow ? "print-badge-low" : ""}>{isLow ? "REORDER" : "OK"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, color }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div className="display" style={{ fontSize: 10.5, fontWeight: 600, color, letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
      <div className="display" style={{ fontSize: 19, fontWeight: 700, color: COLORS.cream }}>{money(value)}</div>
    </div>
  );
}

function ReminderRow({ tone, text, amount }) {
  const color = tone === "bad" ? COLORS.ember : tone === "warn" ? COLORS.amber : COLORS.muted;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 12.5, color: COLORS.cream }}>{text}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color }}>{money(amount)}</span>
    </div>
  );
}