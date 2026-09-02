// Shop expenses/bills - electricity, gas, rent, maintenance, stock
// payments, etc. Two shared keys:
//   expenses-v1     -> bill templates (recurring or one-off), each with
//                      the next amount/due date and whether it's paid.
//   expense-log-v1  -> a dated history of what's actually been paid, so
//                      the Dashboard can subtract "this week's expenses"
//                      from profit the same way it already does for
//                      stock deliveries.
// Owner-only (see netlify/functions/_shared.js keyAllowed - staff PINs
// aren't in the allow-list for either key, so the server rejects them).
import { storage } from "./storage.js";

export const EXPENSES_KEY = "expenses-v1";
export const EXPENSE_LOG_KEY = "expense-log-v1";

export const CATEGORIES = [
  { key: "electricity", label: "Electricity" },
  { key: "gas", label: "Gas" },
  { key: "rent", label: "Rent" },
  { key: "maintenance", label: "Maintenance" },
  { key: "stock", label: "Stock Payment" },
  { key: "other", label: "Other" },
];

export function categoryLabel(key) {
  return (CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1]).label;
}

export async function loadExpenses() {
  try {
    const res = await storage.get(EXPENSES_KEY);
    return res && res.value ? JSON.parse(res.value) : [];
  } catch (e) {
    return [];
  }
}

export async function saveExpenses(list) {
  return storage.set(EXPENSES_KEY, JSON.stringify(list));
}

export async function loadExpenseLog() {
  try {
    const res = await storage.get(EXPENSE_LOG_KEY);
    return res && res.value ? JSON.parse(res.value) : [];
  } catch (e) {
    return [];
  }
}

export async function saveExpenseLog(list) {
  return storage.set(EXPENSE_LOG_KEY, JSON.stringify(list));
}

export function newExpenseId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Add n months to a YYYY-MM-DD date, keeping the day-of-month (clamped to
// the shorter month, e.g. 31 Jan + 1 month -> 28/29 Feb).
export function addMonths(dateKey, n) {
  const d = new Date(dateKey + "T00:00:00");
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return target.toISOString().slice(0, 10);
}

// Whole days from today until dateKey (negative if overdue).
export function daysUntil(dateKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateKey + "T00:00:00");
  return Math.round((target - today) / 86400000);
}
