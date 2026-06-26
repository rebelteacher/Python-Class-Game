// Lightweight client-side site analytics tracker for ByteBattles.
// Records anonymous page views by calling POST /api/analytics/pageview.

import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VISITOR_KEY = "bb_visitor_id";
const SESSION_KEY = "bb_session_id";
const SESSION_TS_KEY = "bb_session_ts";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getVisitorId() {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = uuid();
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

function getSessionId() {
  try {
    const now = Date.now();
    const last = parseInt(sessionStorage.getItem(SESSION_TS_KEY) || "0", 10);
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid || (last && now - last > SESSION_TIMEOUT_MS)) {
      sid = uuid();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return sid;
  } catch {
    return "sess-" + Math.random().toString(36).slice(2);
  }
}

// Normalize the path so we group dynamic IDs together (e.g. /assignment/123 -> /assignment/:id)
function normalizePath(pathname) {
  if (!pathname) return "/";
  return pathname
    .replace(/\/[0-9a-fA-F-]{8,}/g, "/:id")
    .replace(/\/\d+/g, "/:id")
    .slice(0, 256);
}

let lastTrackedKey = null;

export async function trackPageView(pathname) {
  try {
    const path = normalizePath(pathname || window.location.pathname || "/");
    const sid = getSessionId();
    const key = `${sid}::${path}`;
    // Avoid duplicate consecutive sends for the same path within a session
    if (lastTrackedKey === key) return;
    lastTrackedKey = key;

    const payload = {
      visitor_id: getVisitorId(),
      session_id: sid,
      path,
      referrer: document.referrer || "",
      screen_width: window.innerWidth || 0,
    };

    // Use a bare axios call (no auth) and never throw
    await axios.post(`${API}/analytics/pageview`, payload, {
      headers: { "Content-Type": "application/json" },
      // Don't include the user's session cookie/header so we still record auth status from server
    });
  } catch (e) {
    // Silent fail — tracking should never break the app
  }
}
