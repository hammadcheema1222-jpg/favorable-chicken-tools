import { getStore } from "@netlify/blobs";
import { roleForPin, keyAllowed, json } from "./_shared.js";

const STORE_NAME = "fc-data";

// GET  /.netlify/functions/data?key=xxx        header x-app-pin
// POST /.netlify/functions/data  {key,value}   header x-app-pin
export const handler = async (event) => {
  const pin = event.headers["x-app-pin"] || event.headers["X-App-Pin"] || "";
  const role = roleForPin(pin);
  if (!role) return json(401, { error: "Incorrect PIN" });

  const store = getStore(STORE_NAME);

  if (event.httpMethod === "GET") {
    const key = (event.queryStringParameters || {}).key;
    if (!key) return json(400, { error: "Missing key" });
    if (!keyAllowed(role, key)) return json(403, { error: "Not allowed" });

    const value = await store.get(key, { type: "text" });
    return json(200, value !== null ? { key, value } : null);
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return json(400, { error: "Bad request" });
    }
    const { key, value } = body;
    if (!key || typeof value !== "string") return json(400, { error: "Missing key/value" });
    if (!keyAllowed(role, key)) return json(403, { error: "Not allowed" });

    await store.set(key, value);
    return json(200, { key, value });
  }

  return json(405, { error: "Method not allowed" });
};
