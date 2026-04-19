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
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CRISP_WEBSITE_ID = "551eabf6-0021-417e-86fb-d34812d1f6eb";

const HIDDEN_PATHS = ["/admin", "/session", "/join-session"];

const STYLE_ID = "crisp-visibility-style";

declare global {
  interface Window {
    // Before Crisp loads: $crisp is an array used to queue commands.
    // After Crisp loads: $crisp is replaced by the real Crisp SDK object.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $crisp: any;
    CRISP_WEBSITE_ID: string;
    CRISP_READY_TRIGGER: (() => void) | undefined;
  }
}

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

/** Helper for set commands (works in both queued and loaded states) */
function crispSet(key: string, value: unknown[]) {
  if (typeof window === "undefined" || !window.$crisp) return;
  if (typeof window.$crisp.set === "function") {
    window.$crisp.set(key, value);
  } else if (Array.isArray(window.$crisp)) {
    window.$crisp.push(["set", key, value]);
  }
}

/** Helper for do commands (works in both queued and loaded states) */
function crispDo(action: string) {
  if (typeof window === "undefined" || !window.$crisp) return;
  if (typeof window.$crisp.do === "function") {
    window.$crisp.do(action);
  } else if (Array.isArray(window.$crisp)) {
    window.$crisp.push(["do", action]);
  }
}

export function CrispChat() {
  const { user } = useAuth();
  const location = useLocation();
  // Keep a ref to the latest pathname so the CRISP_READY_TRIGGER callback
  // always sees the current path without needing to re-register.
  const pathnameRef = useRef(location.pathname);
  useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);

  // Initialise Crisp once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // CRISP_READY_TRIGGER fires once when the Crisp SDK finishes loading.
    // At that point we apply the correct visibility based on the current path.
    window.CRISP_READY_TRIGGER = () => {
      const shouldHide = HIDDEN_PATHS.some(p => pathnameRef.current.startsWith(p));
      setCrispVisibility(shouldHide);
    };

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Clean up on unmount (hot-reload / SPA navigation)
      try { document.head.removeChild(script); } catch (_) { /* ignore */ }
      window.CRISP_READY_TRIGGER = undefined;
      // Remove the visibility style on unmount
      const styleEl = document.getElementById(STYLE_ID);
      if (styleEl) styleEl.remove();
    };
  }, []);

  // Pre-fill user identity whenever the logged-in user changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.$crisp) return;

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
