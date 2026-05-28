/**
 * MicrosoftUet
 *
 * Loads the Microsoft Advertising UET tag only on marketing/product pages.
 * Live facilitation routes intentionally skip this script because participant
 * browsers often block advertising trackers, which creates noisy console errors
 * without improving the in-session experience.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const UET_TAG_ID = "343249109";
const UET_QUEUE_NAME = "uetq";
const SCRIPT_ID = "microsoft-uet-script";
const DISABLED_PATHS = ["/session", "/join-session", "/admin"];

declare global {
  interface Window {
    uetq?: unknown[] | { push?: (...args: unknown[]) => void };
    UET?: new (options: { ti: string; enableAutoSpaTracking: boolean; q?: unknown }) => {
      push?: (...args: unknown[]) => void;
    };
  }
}

function isDisabledPath(pathname: string) {
  return DISABLED_PATHS.some(path => pathname.startsWith(path));
}

export function MicrosoftUet() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (isDisabledPath(location.pathname)) return;

    window[UET_QUEUE_NAME] = window[UET_QUEUE_NAME] || [];

    const loadUet = () => {
      if (typeof window.UET !== "function") return;

      const queue = window[UET_QUEUE_NAME];
      const tag = new window.UET({
        ti: UET_TAG_ID,
        enableAutoSpaTracking: true,
        q: queue,
      });
      window[UET_QUEUE_NAME] = tag;
      tag.push?.("pageLoad");
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      loadUet();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://bat.bing.com/bat.js";
    script.async = true;
    script.onload = loadUet;
    document.head.appendChild(script);
  }, [location.pathname]);

  return null;
}
