import { storage } from "./storage.js";
import { ITEMS, defaultPreset } from "./data/catalog.js";

const KEY = "inventory-state-v1";

function defaultsFor(name) {
  return { unitPrice: "", qtyInStock: 1, reorderLevel: 0, presetOrderQty: defaultPreset(name) };
}

export function defaultInventoryState() {
  const state = {};
  for (const [, name] of ITEMS) state[name] = defaultsFor(name);
  return state;
}

export async function loadInventory() {
  try {
    const res = await storage.get(KEY);
    if (res && res.value) {
      const saved = JSON.parse(res.value);
      const merged = defaultInventoryState();
      for (const name of Object.keys(merged)) {
        if (saved[name]) merged[name] = { ...merged[name], ...saved[name] };
      }
      return merged;
    }
  } catch (e) {
    // fall through to defaults
  }
  return defaultInventoryState();
}

export async function saveInventory(state) {
  try {
    return await storage.set(KEY, JSON.stringify(state));
  } catch (e) {
    return null;
  }
}

// Bump an item's Qty in Stock by `qty` (used when a Stock List entry is logged).
export async function receiveStock(name, qty) {
  const state = await loadInventory();
  if (!state[name]) state[name] = defaultsFor(name);
  state[name].qtyInStock = (parseFloat(state[name].qtyInStock) || 0) + qty;
  await saveInventory(state);
  return state;
}
