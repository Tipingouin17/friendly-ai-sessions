/**
 * App
 *
 * Module for the AIfacilitator application.
 */

import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ActivationRouteGuard } from "./components/ActivationRouteGuard";
import { ProtectedHostRoute } from "./components/ProtectedHostRoute";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { recoverFromStaleAssetError, STALE_ASSET_RECOVERY_EVENT } from "./utils/staleAssetRecovery";

// Eagerly loaded — always needed on first paint
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages — split into separate chunks
const Login         = lazy(() => import("./pages/Login"));
const Signup        = lazy(() => import("./pages/Signup"));
const Contact       = lazy(() => import("./pages/Contact"));
const Profile       = lazy(() => import("./pages/Profile"));
const Settings      = lazy(() => import("./pages/Settings"));
const AIfacilitators = lazy(() => import("./pages/AIfacilitators"));
const ScheduleInvitations = lazy(() => import("./pages/ScheduleInvitations"));
const PastWorkshops = lazy(() => import("./pages/PastWorkshops"));
const Session       = lazy(() => import("./pages/Session"));
const SessionHost   = lazy(() => import("./pages/SessionHost"));
const SessionReport = lazy(() => import("./pages/SessionReport"));
const JoinSession   = lazy(() => import("./pages/JoinSession"));
const Pricing       = lazy(() => import("./pages/Pricing"));
const Checkout      = lazy(() => import("./pages/checkout/index"));
const FAQs          = lazy(() => import("./pages/FAQs"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Referrals     = lazy(() => import("./pages/Referrals"));
const Terms         = lazy(() => import("./pages/Terms"));
const Privacy       = lazy(() => import("./pages/Privacy"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const RedeemAppSumo   = lazy(() => import("./pages/RedeemAppSumo"));
const VerifyEmail     = lazy(() => import("./pages/VerifyEmail"));
const DeferredToaster = lazy(() => import("@/components/ui/toaster").then(module => ({ default: module.Toaster })));
const DeferredSonner = lazy(() => import("@/components/ui/sonner").then(module => ({ default: module.Toaster })));
const DeferredCookieBanner = lazy(() => import("./components/CookieBanner").then(module => ({ default: module.CookieBanner })));
const DeferredCrispChat = lazy(() => import("./components/CrispChat").then(module => ({ default: module.CrispChat })));
const VerifyEmailSent = lazy(() => import("./pages/VerifyEmailSent"));
const OnboardingDemo  = lazy(() => import("./pages/OnboardingDemo"));
// SEO / Content pages
const About              = lazy(() => import("./pages/About"));
const DesignSprint       = lazy(() => import("./pages/use-cases/DesignSprint"));
const Retrospective      = lazy(() => import("./pages/use-cases/Retrospective"));
const StrategicPlanning  = lazy(() => import("./pages/use-cases/StrategicPlanning"));
const VsSessionLab       = lazy(() => import("./pages/compare/VsSessionLab"));
const VsMiro             = lazy(() => import("./pages/compare/VsMiro"));
const BlogIndex          = lazy(() => import("./pages/blog/BlogIndex"));
const HowToUseAI         = lazy(() => import("./pages/blog/HowToUseAI"));
const AIToolsRemoteTeams = lazy(() => import("./pages/blog/AIToolsRemoteTeams"));

// Full-screen loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  </div>
);

function runAfterInitialPageLoad(callback: () => void, delayMs = 3000) {
  if (typeof window === "undefined") return () => undefined;

  let timeoutId: number | undefined;
  const run = () => {
    timeoutId = window.setTimeout(callback, delayMs);
  };

  if (document.readyState === "complete") {
    run();
  } else {
    window.addEventListener("load", run, { once: true });
  }

  return () => {
    if (timeoutId) window.clearTimeout(timeoutId);
    window.removeEventListener("load", run);
  };
}

// Fire-and-forget warm-up ping, but keep it out of the mobile landing-page critical path.
function useBackendWarmup() {
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL as string;
    if (!apiUrl) return;

    return runAfterInitialPageLoad(() => {
      fetch(`${apiUrl}/health`, { method: "GET", mode: "cors" }).catch(() => { /* ignore errors silently */ });
    }, 7000);
  }, []);
}

function DeferredAppChrome({
  forceCookieSettingsOpen,
  onCookieBannerClose,
}: {
  forceCookieSettingsOpen: boolean;
  onCookieBannerClose: () => void;
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => runAfterInitialPageLoad(() => setEnabled(true), 1500), []);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <DeferredToaster />
      <DeferredSonner />
      <DeferredCrispChat />
      <DeferredCookieBanner forceOpen={forceCookieSettingsOpen} onClose={onCookieBannerClose} />
    </Suspense>
  );
}

function RouteTracking() {
  const location = useLocation();

  useEffect(() => {
    let active = true;
    let removeConsentListener: (() => void) | undefined;

    import("./lib/tracking").then(({ initializeTracking, reinitializeTracking }) => {
      if (!active) return;
      initializeTracking();

      const handleConsentUpdated = () => {
        reinitializeTracking();
      };

      window.addEventListener("cookie-consent-updated", handleConsentUpdated);
      removeConsentListener = () => window.removeEventListener("cookie-consent-updated", handleConsentUpdated);
    });

    return () => {
      active = false;
      removeConsentListener?.();
    };
  }, []);

  useEffect(() => {
    import("./lib/tracking").then(({ trackPageView }) => {
      trackPageView(location.pathname + location.search);
    });
  }, [location.pathname, location.search]);

  return null;
}

function App() {
  const [forceCookieSettingsOpen, setForceCookieSettingsOpen] = useState(false);

  useEffect(() => {
    const handleVitePreloadError = (event: Event) => {
      const preloadError = event as Event & { payload?: unknown };
      if (recoverFromStaleAssetError(preloadError.payload)) event.preventDefault();
    };
    window.addEventListener(STALE_ASSET_RECOVERY_EVENT, handleVitePreloadError as EventListener);
    return () => window.removeEventListener(STALE_ASSET_RECOVERY_EVENT, handleVitePreloadError as EventListener);
  }, []);

  useEffect(() => {
    const handleOpenCookieSettings = () => setForceCookieSettingsOpen(true);
    window.addEventListener("open-cookie-settings", handleOpenCookieSettings);
    return () => window.removeEventListener("open-cookie-settings", handleOpenCookieSettings);
  }, []);

  useBackendWarmup();
  return (
    <ErrorBoundary>
      <BrowserRouter>
          <RouteTracking />
          <DeferredAppChrome
            forceCookieSettingsOpen={forceCookieSettingsOpen}
            onCookieBannerClose={() => setForceCookieSettingsOpen(false)}
          />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Layout><Outlet /></Layout>}>
                <Route index element={<Index />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/faqs" element={<FAQs />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/verify-email-sent" element={<VerifyEmailSent />} />
                {/* SEO / Content pages */}
                <Route path="/about" element={<About />} />
                <Route path="/use-cases/design-sprint" element={<DesignSprint />} />
                <Route path="/use-cases/retrospective" element={<Retrospective />} />
                <Route path="/use-cases/strategic-planning" element={<StrategicPlanning />} />
                <Route path="/compare/aifacilitator-vs-sessionlab" element={<VsSessionLab />} />
                <Route path="/compare/aifacilitator-vs-miro" element={<VsMiro />} />
                <Route path="/blog" element={<BlogIndex />} />
                <Route path="/blog/how-to-use-ai-for-workshop-facilitation" element={<HowToUseAI />} />
                <Route path="/blog/ai-tools-for-remote-teams" element={<AIToolsRemoteTeams />} />
                <Route path="/checkout" element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/my-facilitators" element={
                  <ProtectedRoute>
                    <ActivationRouteGuard>
                      <AIfacilitators />
                    </ActivationRouteGuard>
                  </ProtectedRoute>
                } />
                <Route path="/activation" element={
                  <ProtectedRoute>
                    <OnboardingDemo />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding/demo" element={
                  <ProtectedRoute>
                    <OnboardingDemo />
                  </ProtectedRoute>
                } />
                <Route path="/schedule-invitations" element={
                  <ProtectedRoute>
                    <ScheduleInvitations />
                  </ProtectedRoute>
                } />
                <Route path="/past-workshops" element={
                  <ProtectedRoute>
                    <PastWorkshops />
                  </ProtectedRoute>
                } />
                <Route path="/referrals" element={
                  <ProtectedRoute>
                    <Referrals />
                  </ProtectedRoute>
                } />
                <Route path="/redeem" element={
                  <ProtectedRoute>
                    <RedeemAppSumo />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Routes outside the main layout */}
              <Route path="/session" element={<Session />} />
              <Route path="/session/host" element={
                <ProtectedHostRoute>
                  <SessionHost />
                </ProtectedHostRoute>
              } />
              <Route path="/session/report/:id" element={
                <ProtectedRoute>
                  <SessionReport />
                </ProtectedRoute>
              } />
              <Route path="/join-session" element={<JoinSession />} />

              {/* Protected admin route */}
              <Route path="/admin" element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
