// Simple wrapper around localStorage so it behaves like the
// get/set storage API, but persists in the visitor's own browser.
export const storage = {
  async get(key) {
    try {
      const value = window.localStorage.getItem(key);
      return value !== null ? { key, value } : null;
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return { key, value };
    } catch (e) {
      return null;
    }
  },
};