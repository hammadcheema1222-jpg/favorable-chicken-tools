// Talks to the shared Netlify Function (backed by Netlify Blobs) so every
// device - yours, your staff's - reads and writes the same data, instead
// of each phone keeping its own separate local copy.

let currentPin = null;

// Called once after a successful PIN login (see auth.jsx). Every request
// below carries this PIN so the server can check what that PIN is allowed
// to read/write.
export function setStoragePin(pin) {
  currentPin = pin;
}

async function call(method, path, body) {
  const headers = { "x-app-pin": currentPin || "" };
  const init = { method, headers };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`/.netlify/functions/${path}`, init);
  if (res.status === 401 || res.status === 403) {
    throw new Error("not-authorized");
  }
  if (!res.ok) return null;
  return res.json();
}

export const storage = {
  async get(key) {
    try {
      return await call("GET", `data?key=${encodeURIComponent(key)}`);
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      return await call("POST", "data", { key, value });
    } catch (e) {
      return null;
    }
  },
  // Fetch several keys in one request instead of one round trip per key -
  // pages that need a handful of pieces of data (e.g. Wages) load much
  // faster this way. Returns { [key]: value|null }; missing/failed keys
  // just come back null rather than throwing.
  async getMany(keys) {
    if (!keys || keys.length === 0) return {};
    try {
      const res = await call("GET", `data?keys=${encodeURIComponent(keys.join(","))}`);
      return res || {};
    } catch (e) {
      return {};
    }
  },
};