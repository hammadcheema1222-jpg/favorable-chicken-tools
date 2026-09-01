import React, { useState, useEffect, useMemo, useRef } from "react";
import { storage } from "./storage.js";
import { Plus, Minus, X, Search, Copy, RotateCcw, Check, ChevronDown, ChevronRight } from "lucide-react";

const COLORS = {
  bg: "#1B1310",
  panel: "#241A16",
  panelAlt: "#2C201B",
  border: "#3A2B24",
  ember: "#D6491F",
  emberDark: "#B33A17",
  amber: "#E8A33D",
  cream: "#F5EEE4",
  muted: "#B8A99B",
  sage: "#6FA287",
};

// Section, Item Name, Preset order qty
const RAW_ITEMS = [
  ["DRINKS", "Pepsi can", 1], ["DRINKS", "7UP can", 1], ["DRINKS", "Coca-Cola can", 1],
  ["DRINKS", "Mirinda Orange can", 1], ["DRINKS", "Dr Pepper can", 1], ["DRINKS", "Mirinda Strawberry can", 1],
  ["DRINKS", "Water", 1], ["DRINKS", "Pepsi bottle", 1], ["DRINKS", "Diet Pepsi bottle", 1],
  ["DRINKS", "7UP bottle", 1], ["DRINKS", "Tango Orange bottle", 1], ["DRINKS", "Fruit Shoot Orange", 1],
  ["DRINKS", "Fruit Shoot Blackcurrant", 1],
  ["SAUCE BOTTLES", "Ketchup Bottle", 1], ["SAUCE BOTTLES", "Mayonnaise Bottle", 1],
  ["SAUCE BOTTLES", "Chili Sauce", 1], ["SAUCE BOTTLES", "Burger Sauce", 1],
  ["SAUCE BOTTLES", "BBQ Sauce", 1], ["SAUCE BOTTLES", "Peri Sauce", 1],
  ["SAUCE CUPS", "1 oz Sauce Cup", 1], ["SAUCE CUPS", "4 oz Sauce Cup", 1],
  ["BOXES", "Small Burger Box", 1], ["BOXES", "Large Burger Box", 1], ["BOXES", "FC1 Box", 1],
  ["BOXES", "FC3 Box", 1], ["BOXES", "FC4 Box", 1],
  ["CHIPS BAGS", "Chips Bags (Small)", 5], ["CHIPS BAGS", "Chips Bags (Medium)", 5],
  ["CHIPS BAGS", "Chips Bags (Large)", 5],
  ["DELIVERY & PACKAGING", "White Bags for Customers", 1], ["DELIVERY & PACKAGING", "Delivery Bags / Tags", 1],
  ["COLD ROOM", "Raw Chicken (Whole)", 1], ["COLD ROOM", "Raw Wings (kg)", 1],
  ["COLD ROOM", "Qualiko burger fillet", 1], ["COLD ROOM", "Inner Fillet", 1],
  ["COLD ROOM", "9 Cut Chicken", 1], ["COLD ROOM", "4 Cut Chicken", 1],
  ["COLD ROOM", "4\" Burger Buns", 1], ["COLD ROOM", "5\" Burger Buns", 1],
  ["COLD ROOM", "Burger Cheese", 1], ["COLD ROOM", "Pizza Cheese", 1],
  ["COLD ROOM", "Tortilla Wraps", 1], ["COLD ROOM", "Lettuce", 1], ["COLD ROOM", "Onions", 1],
  ["COLD ROOM", "Peppers", 1], ["COLD ROOM", "Jalapenos", 1], ["COLD ROOM", "Olives", 1],
  ["COLD ROOM", "Sweet Corn", 1], ["COLD ROOM", "Mushrooms", 1], ["COLD ROOM", "Pineapple", 1],
  ["COLD ROOM", "Pepperoni", 1], ["COLD ROOM", "Lemon Dressing", 1],
  ["PIZZA & BOXES", "7\" Pizza Box", 1], ["PIZZA & BOXES", "9\" Pizza Box", 1],
  ["PIZZA & BOXES", "12\" Pizza Box", 1], ["PIZZA & BOXES", "Foil Paper for wraps", 1],
  ["PIZZA & BOXES", "Foil bags for peri peri", 1], ["PIZZA & BOXES", "Oil Base for Pans", 1],
  ["PIZZA & BOXES", "Linning papers", 1],
  ["FROZEN ITEMS", "Chips (Bags)", 1], ["FROZEN ITEMS", "Beef Burger", 1], ["FROZEN ITEMS", "Fish Burger", 1],
  ["FROZEN ITEMS", "Veggie Burger", 1], ["FROZEN ITEMS", "Hash Brown", 1], ["FROZEN ITEMS", "Onion Rings", 1],
  ["FROZEN ITEMS", "Donuts", 1], ["FROZEN ITEMS", "Apple Pie", 1], ["FROZEN ITEMS", "Pizza Chicken", 1],
  ["FROZEN ITEMS", "Pizza Beef", 1], ["FROZEN ITEMS", "Nuggets", 1], ["FROZEN ITEMS", "Chicken Steak Burger", 1],
  ["MISCELLANEOUS", "Henny Penny Filter Paper", 1], ["MISCELLANEOUS", "Salt", 1], ["MISCELLANEOUS", "Pepper", 1],
  ["MISCELLANEOUS", "Veggie Oil", 1], ["MISCELLANEOUS", "Peri Salt", 1], ["MISCELLANEOUS", "Bin Bags", 1],
  ["MISCELLANEOUS", "Customer Tissues", 1], ["MISCELLANEOUS", "Blue Roll", 1],
  ["MISCELLANEOUS", "Cleaning Liquids", 1], ["MISCELLANEOUS", "Cleaning Sprays", 1],
];

const SECTIONS = [...new Set(RAW_ITEMS.map((i) => i[0]))];
const STORAGE_KEY = "order-items-v1";

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function OrderPad() {
  const [order, setOrder] = useState({});
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saveTimer = useRef(null);

  // Load saved order on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(STORAGE_KEY);
        if (res && res.value) {
          setOrder(JSON.parse(res.value));
        }
      } catch (e) {
        // no saved order yet - that's fine
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Debounced save whenever order changes
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const result = await storage.set(STORAGE_KEY, JSON.stringify(order));
        setSaveError(!result);
      } catch (e) {
        setSaveError(true);
      }
    }, 300);
    return () => clearTimeout(saveTimer.current);
  }, [order, loaded]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bySection = {};
    for (const [section, name, preset] of RAW_ITEMS) {
      if (q && !name.toLowerCase().includes(q)) continue;
      if (!bySection[section]) bySection[section] = [];
      bySection[section].push({ name, preset });
    }
    return bySection;
  }, [query]);

  const activeItems = Object.entries(order).filter(([, qty]) => qty > 0);
  const lineCount = activeItems.length;

  function addItem(name, preset) {
    setOrder((prev) => ({ ...prev, [name]: (prev[name] || 0) + preset }));
  }

  function subtractItem(name, preset) {
    setOrder((prev) => {
      const next = Math.max(0, (prev[name] || 0) - preset);
      const copy = { ...prev };
      if (next === 0) delete copy[name];
      else copy[name] = next;
      return copy;
    });
  }

  function removeItem(name) {
    setOrder((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }

  function clearOrder() {
    if (activeItems.length === 0) return;
    if (window.confirm("Clear the whole order list?")) {
      setOrder({});
    }
  }

  async function copyList() {
    const text = activeItems.map(([name, qty]) => `${name} x ${qty}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setCopied(false);
    }
  }

  function toggleSection(section) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  const isSearching = query.trim().length > 0;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.cream }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .display { font-family: 'Oswald', sans-serif; letter-spacing: 0.01em; }
        button { font-family: inherit; }
        input:focus { outline: 2px solid ${COLORS.amber}; outline-offset: 1px; }
        button:focus-visible { outline: 2px solid ${COLORS.amber}; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        {/* Header */}
        <div style={{ padding: "28px 20px 16px" }}>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, color: COLORS.cream, lineHeight: 1.1 }}>
            FAVORABLE CHICKEN
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
            Stock order &middot; {todayLabel()}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: COLORS.panel, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: "10px 14px",
          }}>
            <Search size={17} color={COLORS.muted} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items..."
              style={{
                background: "transparent", border: "none", color: COLORS.cream,
                fontSize: 15, width: "100%", padding: 0,
              }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ background: "none", border: "none", padding: 0, display: "flex" }}>
                <X size={16} color={COLORS.muted} />
              </button>
            )}
          </div>
        </div>

        {/* Running order summary */}
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{
            background: COLORS.panel, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, overflow: "hidden",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px", borderBottom: lineCount ? `1px solid ${COLORS.border}` : "none",
            }}>
              <div className="display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.amber }}>
                TODAY'S ORDER
              </div>
              <div style={{ fontSize: 13, color: COLORS.muted }}>
                {lineCount} {lineCount === 1 ? "item" : "items"}
              </div>
            </div>

            {lineCount === 0 ? (
              <div style={{ padding: "18px 16px", fontSize: 13.5, color: COLORS.muted }}>
                Tap items below to add them here.
              </div>
            ) : (
              <div>
                {activeItems.map(([name, qty]) => (
                  <div key={name} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`,
                  }}>
                    <span style={{ fontSize: 14, color: COLORS.cream, paddingRight: 8 }}>{name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span className="display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.amber, minWidth: 24, textAlign: "right" }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => removeItem(name)}
                        aria-label={`Remove ${name}`}
                        style={{
                          background: "none", border: "none", padding: 4, display: "flex",
                          color: COLORS.muted, cursor: "pointer",
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lineCount > 0 && (
              <div style={{ display: "flex", gap: 10, padding: 14 }}>
                <button
                  onClick={copyList}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: copied ? COLORS.sage : COLORS.amber, color: COLORS.bg,
                    border: "none", borderRadius: 9, padding: "11px 0",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy list"}
                </button>
                <button
                  onClick={clearOrder}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "transparent", color: COLORS.muted,
                    border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "11px 14px",
                    fontSize: 14, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            )}
          </div>
          {saveError && (
            <div style={{ fontSize: 11.5, color: COLORS.ember, marginTop: 8 }}>
              Couldn't save just now - keep this tab open until it's sent.
            </div>
          )}
        </div>

        {/* Item sections */}
        <div style={{ padding: "0 20px" }}>
          {SECTIONS.map((section) => {
            const items = filteredSections[section];
            if (!items || items.length === 0) return null;
            const isOpen = isSearching || !!openSections[section];
            return (
              <div key={section} style={{ marginBottom: 10 }}>
                <button
                  onClick={() => toggleSection(section)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                  }}
                >
                  <span className="display" style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.cream, letterSpacing: "0.03em" }}>
                    {section}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: COLORS.muted }}>{items.length}</span>
                    {isOpen ? <ChevronDown size={16} color={COLORS.muted} /> : <ChevronRight size={16} color={COLORS.muted} />}
                  </div>
                </button>

                {isOpen && (
                  <div style={{
                    background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderTop: "none",
                    borderRadius: "0 0 10px 10px", overflow: "hidden",
                  }}>
                    {items.map(({ name, preset }) => {
                      const qty = order[name] || 0;
                      return (
                        <div key={name} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 14px", borderTop: `1px solid ${COLORS.border}`,
                        }}>
                          <div style={{ minWidth: 0, paddingRight: 10 }}>
                            <div style={{ fontSize: 14, color: COLORS.cream }}>{name}</div>
                            {qty > 0 && (
                              <div style={{ fontSize: 12, color: COLORS.amber, marginTop: 2 }}>
                                {qty} added
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {qty > 0 && (
                              <button
                                onClick={() => subtractItem(name, preset)}
                                aria-label={`Remove ${preset} ${name}`}
                                style={{
                                  width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.border}`,
                                  background: "transparent", color: COLORS.muted, display: "flex",
                                  alignItems: "center", justifyContent: "center", cursor: "pointer",
                                }}
                              >
                                <Minus size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => addItem(name, preset)}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                background: COLORS.ember, color: COLORS.cream, border: "none",
                                borderRadius: 8, padding: "7px 12px", fontSize: 13.5, fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              <Plus size={14} />
                              {preset}
                            </button>
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

        <div style={{ padding: "20px 20px 0", fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
          Your order list is saved automatically on this device.
        </div>
      </div>
    </div>
  );
}