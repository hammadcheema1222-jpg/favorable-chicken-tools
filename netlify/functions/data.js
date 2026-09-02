import { getStore } from "@netlify/blobs";
import { roleForPin, keyAllowed, json } from "./_shared.js";

const STORE_NAME = "fc-data";

// GET  /.netlify/functions/data?key=xxx         header x-app-pin  -> {key,value} | null
// GET  /.netlify/functions/data?keys=a,b,c       header x-app-pin  -> {a: value|null, b: ..., c: ...}
// POST /.netlify/functions/data  {key,value}    header x-app-pin
//
// The "keys" batch form exists so a page that needs several pieces of data
// at once (e.g. Wages loading the staff roster + this week's record + a
// week of clock sessions) can do it in ONE request instead of one per key -
// each request is a separate serverless function call, and stacking several
// of them back to back is the main reason the app can feel slow to load.
export const handler = async (event) => {
  const pin = event.headers["x-app-pin"] || event.headers["X-App-Pin"] || "";
  const role = roleForPin(pin);
  if (!role) return json(401, { error: "Incorrect PIN" });

  const store = getStore(STORE_NAME);

  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};

    if (params.keys) {
      const keys = params.keys.split(",").map((k) => k.trim()).filter(Boolean);
      if (keys.length === 0) return json(400, { error: "Missing keys" });
      if (keys.length > 30) return json(400, { error: "Too many keys" });
      if (!keys.every((k) => keyAllowed(role, k))) return json(403, { error: "Not allowed" });

      const values = await Promise.all(keys.map((k) => store.get(k, { type: "text" })));
      const result = {};
      keys.forEach((k, i) => { result[k] = values[i]; });
      return json(200, result);
    }

    const key = params.key;
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