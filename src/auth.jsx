import React, { createContext, useContext, useEffect, useState } from "react";
import { setStoragePin } from "./storage.js";
import { COLORS, GLOBAL_STYLE } from "./theme.js";

// Device-local only: which role this device is currently unlocked as, and
// the PIN it used to unlock (so storage.js can send it with every request).
// This never touches the shared business data - it's the same idea as a
// browser "remember me", just for the PIN screen below.
const AUTH_KEY = "fc-auth-v1";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGate({ children }) {
  const [role, setRole] = useState(null);
  const [ready, setReady] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      if (saved && saved.role && saved.pin) {
        setStoragePin(saved.pin);
        setRole(saved.role);
      }
    } catch (e) {
      // ignore - just show the PIN screen
    }
    setReady(true);
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!pinInput || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      if (!res.ok) {
        setError("Incorrect PIN - try again.");
        setPinInput("");
        setBusy(false);
        return;
      }
      const { role: newRole } = await res.json();
      localStorage.setItem(AUTH_KEY, JSON.stringify({ role: newRole, pin: pinInput }));
      setStoragePin(pinInput);
      setRole(newRole);
    } catch (e) {
      setError("Couldn't reach the server - check your connection.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    setStoragePin(null);
    setRole(null);
    setPinInput("");
  }

  if (!ready) return null;

  if (!role) {
    return (
      <div style={{
        background: COLORS.bg, minHeight: "100vh", color: COLORS.cream,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        <style>{GLOBAL_STYLE}</style>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 320 }}>
          <div className="display" style={{ fontSize: 24, fontWeight: 700, textAlign: "center", marginBottom: 4, letterSpacing: "0.02em" }}>
            FAVORABLE CHICKEN
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", marginBottom: 24 }}>
            Enter your PIN to continue
          </div>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="PIN"
            style={{
              width: "100%", background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10,
              color: COLORS.cream, fontSize: 22, fontWeight: 600, padding: "14px 16px", textAlign: "center",
              letterSpacing: "0.3em", marginBottom: 12,
            }}
          />
          {error && (
            <div style={{ fontSize: 13, color: COLORS.ember, textAlign: "center", marginBottom: 12 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={busy || !pinInput}
            style={{
              width: "100%", background: COLORS.ember, color: COLORS.cream, border: "none", borderRadius: 10,
              padding: "13px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy || !pinInput ? 0.6 : 1,
            }}
          >
            {busy ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    );
  }

  return <AuthContext.Provider value={{ role, logout }}>{children}</AuthContext.Provider>;
}
