import { roleForPin, json } from "./_shared.js";

// POST { pin } -> { role: "staff" | "owner" } or 401
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let pin = "";
  try {
    pin = (JSON.parse(event.body || "{}").pin || "").trim();
  } catch (e) {
    return json(400, { error: "Bad request" });
  }

  const role = roleForPin(pin);
  if (!role) return json(401, { error: "Incorrect PIN" });

  return json(200, { role });
};
