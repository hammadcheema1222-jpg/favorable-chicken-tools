import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, AlertTriangle, Printer } from "lucide-react";
import { COLORS, GLOBAL_STYLE, PRINT_STYLE } from "./theme.js";
import { ITEMS, SECTIONS } from "./data/catalog.js";
import { loadInventory, saveInventory } from "./inventoryStore.js";
import { useAutoSave } from "./useAutoSave.js";

function todayLong() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function money(n) {
  const v = parseFloat(n);
  return isNaN(v) ? "-" : `£${v.toFixed(2)}`;
}

export default function InventoryPage() {
  const [state, setState] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    (async () => {
      const inv = await loadInventory();
      setState(inv);
      setLoaded(true);
    })();
  }, []);

  // Flushes on tab switch instead of losing a price/qty edit you just made.
  const { saveError } = useAutoSave(state, saveInventory, { delay: 350, ready: loaded });

  function update(name, field, value) {
    setState((prev) => ({ ...prev, [name]: { ...prev[name], [field]: value } }));
  }

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bySection = {};
    for (const [section, name] of ITEMS) {
      if (q && !name.toLowerCase().includes(q)) continue;
      if (!bySection[section]) bySection[section] = [];
      bySection[section].push(name);
    }
    return bySection;
  }, [query]);

  const reorderCount = useMemo(() => {
    return Object.values(state).filter((v) => (parseFloat(v.qtyInStock) || 0) <= (parseFloat(v.reorderLevel) || 0)).length;
  }, [state]);

  const isSearching = query.trim().length > 0;

  function toggleSection(section) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.cream }}>
      <style>{GLOBAL_STYLE}{PRINT_STYLE}</style>
      <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, color: COLORS.cream }}>Inventory</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Prices, stock, and reorder levels</div>
          </div>
          <button
            onClick={() => window.print()}
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 9, color: COLORS.cream, padding: "9px 10px", display: "flex", cursor: "pointer" }}
            aria-label="Get PDF"
          >
            <Printer size={16} />
          </button>
        </div>

        {reorderCount > 0 && (
          <div style={{ padding: "0 20px 12px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: "rgba(214,73,31,0.15)",
              border: `1px solid ${COLORS.ember}`, borderRadius: 10, padding: "10px 14px",
            }}>
              <AlertTriangle size={16} color={COLORS.ember} />
              <span style={{ fontSize: 13, color: COLORS.cream }}>
                <strong>{reorderCount}</strong> item{reorderCount === 1 ? "" : "s"} need reordering
              </span>
            </div>
          </div>
        )}

        <div style={{ padding: "0 20px 16px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, background: COLORS.panel,
            border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px",
          }}>
            <Search size={17} color={COLORS.muted} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items..."
              style={{ background: "transparent", border: "none", color: COLORS.cream, fontSize: 15, width: "100%" }}
            />
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>
          {SECTIONS.map((section) => {
            const names = filteredSections[section];
            if (!names || names.length === 0) return null;
            const isOpen = isSearching || !!openSections[section];
            return (
              <div key={section} style={{ marginBottom: 10 }}>
                <button
                  onClick={() => toggleSection(section)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10,
                    padding: "12px 14px", cursor: "pointer",
                  }}
                >
                  <span className="display" style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.cream, letterSpacing: "0.03em" }}>
                    {section}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: COLORS.muted }}>{names.length}</span>
                    {isOpen ? <ChevronDown size={16} color={COLORS.muted} /> : <ChevronRight size={16} color={COLORS.muted} />}
                  </div>
                </button>

                {isOpen && (
                  <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                    {names.map((name) => {
                      const item = state[name] || {};
                      const qty = parseFloat(item.qtyInStock) || 0;
                      const reorder = parseFloat(item.reorderLevel) || 0;
                      const isLow = qty <= reorder;
                      return (
                        <div key={name} style={{ padding: "12px 14px", borderTop: `1px solid ${COLORS.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontSize: 14, color: COLORS.cream, paddingRight: 8 }}>{name}</span>
                            <span style={{
                              fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                              background: isLow ? COLORS.ember : "rgba(111,162,135,0.2)",
                              color: isLow ? COLORS.cream : COLORS.sage,
                              flexShrink: 0,
                            }}>
                              {isLow ? "REORDER" : "OK"}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                            <MiniField label="Price £" value={item.unitPrice} onChange={(v) => update(name, "unitPrice", v)} />
                            <MiniField label="Qty" value={item.qtyInStock} onChange={(v) => update(name, "qtyInStock", v)} />
                            <MiniField label="Reorder at" value={item.reorderLevel} onChange={(v) => update(name, "reorderLevel", v)} />
                            <MiniField label="Preset" value={item.presetOrderQty} onChange={(v) => update(name, "presetOrderQty", v)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {saveError && (
          <div style={{ padding: "0 20px", fontSize: 11.5, color: COLORS.ember }}>Couldn't save just now.</div>
        )}
        <div style={{ padding: "16px 20px 0", fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
          "Preset" is how much Order Pad adds per tap. Qty in Stock updates automatically when you log a delivery in Stock List.
        </div>
      </div>

      {/* ===== Print-only full inventory report ===== */}
      <div className="print-only print-page">
        <div className="print-header">Favorable Chicken</div>
        <div className="print-sub">Inventory &middot; {todayLong()}</div>
        {SECTIONS.map((section) => {
          const names = ITEMS.filter((i) => i[0] === section).map((i) => i[1]);
          return (
            <div key={section}>
              <div className="print-section-title">{section}</div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Item</th><th style={{ textAlign: "right" }}>Price</th>
                    <th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Reorder At</th>
                    <th style={{ textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {names.map((name) => {
                    const item = state[name] || {};
                    const qty = parseFloat(item.qtyInStock) || 0;
                    const reorder = parseFloat(item.reorderLevel) || 0;
                    const isLow = qty <= reorder;
                    return (
                      <tr key={name}>
                        <td>{name}</td>
                        <td style={{ textAlign: "right" }}>{money(item.unitPrice)}</td>
                        <td style={{ textAlign: "right" }}>{qty}</td>
                        <td style={{ textAlign: "right" }}>{reorder}</td>
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

function MiniField({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: COLORS.muted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <input
        type="text"
        inputMode="decimal"
        value={value === undefined || value === null ? "" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) onChange(v);
        }}
        style={{
          width: "100%", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6,
          color: COLORS.cream, fontSize: 13, fontWeight: 600, padding: "6px 6px", textAlign: "center",
        }}
      />
    </div>
  );
}
