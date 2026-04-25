/**
 * App
 *
 * Module for the AIfacilitator application.
 */

import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CrispChat } from "./components/CrispChat";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedHostRoute } from "./components/ProtectedHostRoute";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import ErrorBoundary from "./components/ErrorBoundary";

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
const RedeemAppSumo = lazy(() => import("./pages/RedeemAppSumo"));

// Full-screen loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  </div>
);

// Fire-and-forget warm-up ping so the Railway container is awake before users navigate to Pricing
function useBackendWarmup() {
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL as string;
    if (!apiUrl) return;
    fetch(`${apiUrl}/health`, { method: "GET", mode: "cors" }).catch(() => { /* ignore errors silently */ });
  }, []);
}

function App() {
  useBackendWarmup();
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CrispChat />
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
                <Route path="/reset-password" element={<ResetPassword />} />
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
                    <AIfacilitators />
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
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
