import React, { useState } from "react";
import { ClipboardList, PoundSterling } from "lucide-react";
import OrderPad from "./OrderPad.jsx";
import DailySalesPad from "./DailySalesPad.jsx";

const COLORS = {
  bg: "#1B1310",
  panel: "#241A16",
  border: "#3A2B24",
  ember: "#D6491F",
  amber: "#E8A33D",
  cream: "#F5EEE4",
  muted: "#B8A99B",
};

export default function App() {
  const [tab, setTab] = useState("order");

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .display { font-family: 'Oswald', sans-serif; }
      `}</style>

      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 20,
        background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex" }}>
          <NavButton
            active={tab === "order"}
            onClick={() => setTab("order")}
            icon={<ClipboardList size={17} />}
            label="Order Pad"
          />
          <NavButton
            active={tab === "sales"}
            onClick={() => setTab("sales")}
            icon={<PoundSterling size={17} />}
            label="Daily Sales"
          />
        </div>
      </div>

      {tab === "order" ? <OrderPad /> : <DailySalesPad />}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: "14px 0", background: "transparent", border: "none", cursor: "pointer",
        color: active ? "#E8A33D" : "#B8A99B",
        borderBottom: active ? "2px solid #E8A33D" : "2px solid transparent",
        fontSize: 14, fontWeight: 600,
      }}
    >
      {icon}
      {label}
    </button>
  );
}