import React, { useEffect, useRef, useState } from "react";
import { LayoutDashboard, ClipboardList, PoundSterling, PackageSearch, Boxes, Users, Receipt, LogOut } from "lucide-react";
import { COLORS, GLOBAL_STYLE } from "./theme.js";
import { AuthGate, useAuth } from "./auth.jsx";
import ClockWidget from "./ClockWidget.jsx";
import DashboardPage from "./DashboardPage.jsx";
import OrderPad from "./OrderPad.jsx";
import DailySalesPad from "./DailySalesPad.jsx";
import StockListPage from "./StockListPage.jsx";
import InventoryPage from "./InventoryPage.jsx";
import WagesPage from "./WagesPage.jsx";
import ExpensesPage from "./ExpensesPage.jsx";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, Comp: DashboardPage, roles: ["owner"] },
  { key: "order", label: "Order Pad", icon: ClipboardList, Comp: OrderPad, roles: ["staff", "owner"] },
  { key: "sales", label: "Daily Sales", icon: PoundSterling, Comp: DailySalesPad, roles: ["staff", "owner"] },
  { key: "stock", label: "Stock List", icon: PackageSearch, Comp: StockListPage, roles: ["staff", "owner"] },
  { key: "inventory", label: "Inventory", icon: Boxes, Comp: InventoryPage, roles: ["staff", "owner"] },
  { key: "wages", label: "Wages", icon: Users, Comp: WagesPage, roles: ["owner"] },
  { key: "expenses", label: "Expenses", icon: Receipt, Comp: ExpensesPage, roles: ["owner"] },
];

export default function App() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}

function AppShell() {
  const { role, logout } = useAuth();
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));
  const [tab, setTab] = useState(() => (role === "owner" ? "dashboard" : "order"));
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const logoutTimer = useRef(null);

  // If the current tab isn't visible for this role (e.g. PIN changed), fall back.
  useEffect(() => {
    if (!visibleTabs.find((t) => t.key === tab) && visibleTabs.length) {
      setTab(visibleTabs[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => () => clearTimeout(logoutTimer.current), []);

  // Tap once to arm, tap again to confirm - no native confirm() dialog,
  // since those don't fire in some mobile "Add to Home Screen" setups.
  function tapLogout() {
    if (confirmingLogout) {
      clearTimeout(logoutTimer.current);
      logout();
      return;
    }
    setConfirmingLogout(true);
    clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(() => setConfirmingLogout(false), 3000);
  }

  const Active = (visibleTabs.find((t) => t.key === tab) || visibleTabs[0]).Comp;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <style>{GLOBAL_STYLE}</style>

      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 20,
        background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center",
        }}>
          <div style={{ flex: 1, display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {visibleTabs.map(({ key, label, icon: Icon }) => (
              <NavButton
                key={key}
                active={tab === key}
                onClick={() => setTab(key)}
                icon={<Icon size={16} />}
                label={label}
              />
            ))}
          </div>
          <button
            onClick={tapLogout}
            aria-label={confirmingLogout ? "Tap again to log out" : "Log out"}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
              background: confirmingLogout ? COLORS.ember : "none",
              border: "none", borderRadius: confirmingLogout ? 7 : 0,
              color: confirmingLogout ? COLORS.cream : COLORS.muted,
              padding: confirmingLogout ? "6px 10px" : "0 14px",
              margin: confirmingLogout ? "0 8px 0 0" : 0,
              fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
            }}
          >
            <LogOut size={16} />
            {confirmingLogout && "Tap to confirm"}
          </button>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <ClockWidget />
        </div>
      </div>

      <Active />
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "13px 14px", background: "transparent", border: "none", cursor: "pointer",
        color: active ? COLORS.amber : COLORS.muted,
        borderBottom: active ? `2px solid ${COLORS.amber}` : "2px solid transparent",
        fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
