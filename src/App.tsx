
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedHostRoute } from "./components/ProtectedHostRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import MyFacilitators from "./pages/MyFacilitators";
import PastWorkshops from "./pages/PastWorkshops";
import Session from "./pages/Session";
import SessionHost from "./pages/SessionHost";
import SessionReport from "./pages/SessionReport";
import JoinSession from "./pages/JoinSession";
import Pricing from "./pages/Pricing";
import Checkout from "./pages/checkout/index";
import NotFound from "./pages/NotFound";
import FAQs from "./pages/FAQs";
import AdminDashboard from "./pages/AdminDashboard";
import Referrals from "./pages/Referrals";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
                  <MyFacilitators />
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
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
