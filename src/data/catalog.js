// The shop's full item list - section groupings and names only.
// Editable per-item data (price, stock, reorder level, preset order qty)
// lives separately in inventoryStore.js so it can be changed without
// touching this file.
export const ITEMS = [
  ["DRINKS", "Pepsi can"], ["DRINKS", "7UP can"], ["DRINKS", "Coca-Cola can"],
  ["DRINKS", "Mirinda Orange can"], ["DRINKS", "Dr Pepper can"], ["DRINKS", "Mirinda Strawberry can"],
  ["DRINKS", "Water"], ["DRINKS", "Pepsi bottle"], ["DRINKS", "Diet Pepsi bottle"],
  ["DRINKS", "7UP bottle"], ["DRINKS", "Tango Orange bottle"], ["DRINKS", "Fruit Shoot Orange"],
  ["DRINKS", "Fruit Shoot Blackcurrant"],
  ["SAUCE BOTTLES", "Ketchup Bottle"], ["SAUCE BOTTLES", "Mayonnaise Bottle"],
  ["SAUCE BOTTLES", "Chili Sauce"], ["SAUCE BOTTLES", "Burger Sauce"],
  ["SAUCE BOTTLES", "BBQ Sauce"], ["SAUCE BOTTLES", "Peri Sauce"],
  ["SAUCE CUPS", "1 oz Sauce Cup"], ["SAUCE CUPS", "4 oz Sauce Cup"],
  ["BOXES", "Small Burger Box"], ["BOXES", "Large Burger Box"], ["BOXES", "FC1 Box"],
  ["BOXES", "FC3 Box"], ["BOXES", "FC4 Box"],
  ["CHIPS BAGS", "Chips Bags (Small)"], ["CHIPS BAGS", "Chips Bags (Medium)"],
  ["CHIPS BAGS", "Chips Bags (Large)"],
  ["DELIVERY & PACKAGING", "White Bags for Customers"], ["DELIVERY & PACKAGING", "Delivery Bags / Tags"],
  ["COLD ROOM", "Raw Chicken (Whole)"], ["COLD ROOM", "Raw Wings (kg)"],
  ["COLD ROOM", "Qualiko burger fillet"], ["COLD ROOM", "Inner Fillet"],
  ["COLD ROOM", "9 Cut Chicken"], ["COLD ROOM", "4 Cut Chicken"],
  ["COLD ROOM", "4\" Burger Buns"], ["COLD ROOM", "5\" Burger Buns"],
  ["COLD ROOM", "Burger Cheese"], ["COLD ROOM", "Pizza Cheese"],
  ["COLD ROOM", "Tortilla Wraps"], ["COLD ROOM", "Lettuce"], ["COLD ROOM", "Onions"],
  ["COLD ROOM", "Peppers"], ["COLD ROOM", "Jalapenos"], ["COLD ROOM", "Olives"],
  ["COLD ROOM", "Sweet Corn"], ["COLD ROOM", "Mushrooms"], ["COLD ROOM", "Pineapple"],
  ["COLD ROOM", "Pepperoni"], ["COLD ROOM", "Lemon Dressing"],
  ["PIZZA & BOXES", "7\" Pizza Box"], ["PIZZA & BOXES", "9\" Pizza Box"],
  ["PIZZA & BOXES", "12\" Pizza Box"], ["PIZZA & BOXES", "Foil Paper for wraps"],
  ["PIZZA & BOXES", "Foil bags for peri peri"], ["PIZZA & BOXES", "Oil Base for Pans"],
  ["PIZZA & BOXES", "Linning papers"],
  ["FROZEN ITEMS", "Chips (Bags)"], ["FROZEN ITEMS", "Beef Burger"], ["FROZEN ITEMS", "Fish Burger"],
  ["FROZEN ITEMS", "Veggie Burger"], ["FROZEN ITEMS", "Hash Brown"], ["FROZEN ITEMS", "Onion Rings"],
  ["FROZEN ITEMS", "Donuts"], ["FROZEN ITEMS", "Apple Pie"], ["FROZEN ITEMS", "Pizza Chicken"],
  ["FROZEN ITEMS", "Pizza Beef"], ["FROZEN ITEMS", "Nuggets"], ["FROZEN ITEMS", "Chicken Steak Burger"],
  ["MISCELLANEOUS", "Henny Penny Filter Paper"], ["MISCELLANEOUS", "Salt"], ["MISCELLANEOUS", "Pepper"],
  ["MISCELLANEOUS", "Veggie Oil"], ["MISCELLANEOUS", "Peri Salt"], ["MISCELLANEOUS", "Bin Bags"],
  ["MISCELLANEOUS", "Customer Tissues"], ["MISCELLANEOUS", "Blue Roll"],
  ["MISCELLANEOUS", "Cleaning Liquids"], ["MISCELLANEOUS", "Cleaning Sprays"],
];

export const SECTIONS = [...new Set(ITEMS.map((i) => i[0]))];

export function defaultPreset(name) {
  return name.startsWith("Chips Bags") ? 5 : 1;
}
