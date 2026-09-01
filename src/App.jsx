import React, { useState } from "react";
import { LayoutDashboard, ClipboardList, PoundSterling, PackageSearch, Boxes, Users } from "lucide-react";
import { COLORS, GLOBAL_STYLE } from "./theme.js";
import DashboardPage from "./DashboardPage.jsx";
import OrderPad from "./OrderPad.jsx";
import DailySalesPad from "./DailySalesPad.jsx";
import StockListPage from "./StockListPage.jsx";
import InventoryPage from "./InventoryPage.jsx";
import WagesPage from "./WagesPage.jsx";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, Comp: DashboardPage },
  { key: "order", label: "Order Pad", icon: ClipboardList, Comp: OrderPad },
  { key: "sales", label: "Daily Sales", icon: PoundSterling, Comp: DailySalesPad },
  { key: "stock", label: "Stock List", icon: PackageSearch, Comp: StockListPage },
  { key: "inventory", label: "Inventory", icon: Boxes, Comp: InventoryPage },
  { key: "wages", label: "Wages", icon: Users, Comp: WagesPage },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const Active = TABS.find((t) => t.key === tab).Comp;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <style>{GLOBAL_STYLE}</style>

      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 20,
        background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          maxWidth: 480, margin: "0 auto", display: "flex",
          overflowX: "auto", WebkitOverflowScrolling: "touch",
        }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <NavButton
              key={key}
              active={tab === key}
              onClick={() => setTab(key)}
              icon={<Icon size={16} />}
              label={label}
            />
          ))}
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
