/**
 * CrispChat
 *
 * Initialises the Crisp live-chat widget and, when a user is logged in,
 * pre-fills their email and name so the support agent sees who they are.
 *
 * The widget is hidden on facilitation pages (session host, participant view,
 * join-session) and on the Admin Dashboard to avoid cluttering those interfaces.
 *
 * Hiding strategy: CSS injection (`display: none !important`) is used instead
 * of the Crisp SDK's `chat:hide` API because the SDK call is unreliable when
 * Crisp overrides inline styles after loading.
 *
 * IMPORTANT — crash fix (2026-05-02):
 * The Crisp SDK replaces window.$crisp (array → object) during loading, but
 * internal methods like set_user_email are not ready until CRISP_READY_TRIGGER
 * fires. Calling window.$crisp.set() before that point throws:
 *   TypeError: Cannot read properties of undefined (reading 'setEmail')
 * Fix: all SDK calls are deferred until crispReady = true. Before that, we
 * always use the array-push queue interface.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CRISP_WEBSITE_ID = "551eabf6-0021-417e-86fb-d34812d1f6eb";

const HIDDEN_PATHS = ["/admin", "/session", "/join-session"];

const STYLE_ID = "crisp-visibility-style";
const SCRIPT_ID = "crisp-sdk-script";

declare global {
  interface Window {
    // Before Crisp loads: $crisp is an array used to queue commands.
    // After Crisp loads: $crisp is replaced by the real Crisp SDK object.
    $crisp: any;
    CRISP_WEBSITE_ID: string;
    CRISP_READY_TRIGGER: (() => void) | undefined;
  }
}

// Module-level flag: true only after CRISP_READY_TRIGGER has fired.
// Prevents crispSet/crispDo from calling SDK methods before full initialisation.
let crispReady = false;

/** Inject or update a <style> tag that controls Crisp chatbox visibility */
function setCrispVisibility(hidden: boolean) {
  if (typeof document === "undefined") return;

  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = hidden
    ? "#crisp-chatbox { display: none !important; }"
    : "#crisp-chatbox { display: block !important; }";
}

/**
 * Helper for set commands.
 * Before SDK is ready: queues via the array interface (safe, Crisp processes
 * the queue once loaded). After SDK is ready: calls the SDK method directly,
 * with a try/catch as a last-resort safety net.
 */
function crispSet(key: string, value: unknown[]) {
  if (typeof window === "undefined" || !window.$crisp) return;
  if (!crispReady || Array.isArray(window.$crisp)) {
    // SDK not yet fully initialised — queue the command
    if (Array.isArray(window.$crisp)) {
      window.$crisp.push(["set", key, value]);
    }
    return;
  }
  try {
    if (typeof window.$crisp.set === "function") {
      window.$crisp.set(key, value);
    }
  } catch (e) {
    console.warn("[CrispChat] crispSet failed (SDK not fully ready):", e);
  }
}

/**
 * Helper for do commands.
 * Same deferred-until-ready strategy as crispSet.
 */
function crispDo(action: string) {
  if (typeof window === "undefined" || !window.$crisp) return;
  if (!crispReady || Array.isArray(window.$crisp)) {
    if (Array.isArray(window.$crisp)) {
      window.$crisp.push(["do", action]);
    }
    return;
  }
  try {
    if (typeof window.$crisp.do === "function") {
      window.$crisp.do(action);
    }
  } catch (e) {
    console.warn("[CrispChat] crispDo failed (SDK not fully ready):", e);
  }
}

export function CrispChat() {
  const { user } = useAuth();
  const location = useLocation();

  // Keep a ref to the latest user so CRISP_READY_TRIGGER can set identity
  // after the SDK finishes loading (user may already be logged in at that point).
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Keep a ref to the latest pathname so the CRISP_READY_TRIGGER callback
  // always sees the current path without needing to re-register.
  const pathnameRef = useRef(location.pathname);
  useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);

  // Initialise Crisp only on routes where the support widget is allowed.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const shouldHide = HIDDEN_PATHS.some(p => location.pathname.startsWith(p));
    if (shouldHide) {
      setCrispVisibility(true);
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      setCrispVisibility(false);
      return;
    }

    crispReady = false;
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // CRISP_READY_TRIGGER fires once when the Crisp SDK finishes loading.
    // This is the ONLY safe point to call SDK methods like set_user_email.
    window.CRISP_READY_TRIGGER = () => {
      crispReady = true;

      // Apply correct visibility for the current route
      const shouldHideCurrentRoute = HIDDEN_PATHS.some(p => pathnameRef.current.startsWith(p));
      setCrispVisibility(shouldHideCurrentRoute);

      // Set user identity now that the SDK is fully ready
      const currentUser = userRef.current;
      if (currentUser) {
        const name =
          (currentUser.user_metadata?.full_name as string) ||
          (currentUser.user_metadata?.name as string) ||
          currentUser.email;
        crispSet("user:email", [currentUser.email]);
        crispSet("user:nickname", [name]);
      }
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Clean up on unmount (hot-reload / SPA navigation)
      crispReady = false;
      try { document.head.removeChild(script); } catch (_) { /* ignore */ }
      window.CRISP_READY_TRIGGER = undefined;
      // Remove the visibility style on unmount
      const styleEl = document.getElementById(STYLE_ID);
      if (styleEl) styleEl.remove();
    };
  }, [location.pathname]);

  // Pre-fill user identity whenever the logged-in user changes.
  // Only runs after crispReady = true; the initial identity set is handled
  // by CRISP_READY_TRIGGER above to avoid the set_user_email crash.
  useEffect(() => {
    if (typeof window === "undefined" || !window.$crisp || !crispReady) return;

    if (user) {
      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email;
      crispSet("user:email", [user.email]);
      crispSet("user:nickname", [name]);
    } else {
      // Reset identity on logout
      crispDo("session:reset");
    }
  }, [user]);

  // Hide/show the widget via CSS whenever the route changes (handles SPA navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldHide = HIDDEN_PATHS.some(p => location.pathname.startsWith(p));
    setCrispVisibility(shouldHide);
  }, [location.pathname]);

  return null; // No DOM output — widget is injected by the Crisp script
}
