/**
 * CrispChat
 *
 * Initialises the Crisp live-chat widget and, when a user is logged in,
 * pre-fills their email and name so the support agent sees who they are.
 *
 * The widget is hidden on the Admin Dashboard to avoid cluttering the
 * back-office interface.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CRISP_WEBSITE_ID = "551eabf6-0021-417e-86fb-d34812d1f6eb";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export function CrispChat() {
  const { user } = useAuth();
  const location = useLocation();

  // Initialise Crisp once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Clean up on unmount (hot-reload / SPA navigation)
      document.head.removeChild(script);
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
      window.$crisp.push(["set", "user:email", [user.email]]);
      window.$crisp.push(["set", "user:nickname", [name]]);
    } else {
      // Reset identity on logout
      window.$crisp.push(["do", "session:reset"]);
    }
  }, [user]);

  // Hide the widget on the Admin Dashboard
  useEffect(() => {
    if (typeof window === "undefined" || !window.$crisp) return;

    if (location.pathname.startsWith("/admin")) {
      window.$crisp.push(["do", "chat:hide"]);
    } else {
      window.$crisp.push(["do", "chat:show"]);
    }
  }, [location.pathname]);

  return null; // No DOM output — widget is injected by the Crisp script
}
