
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import MyFacilitators from "./pages/MyFacilitators";
import PastWorkshops from "./pages/PastWorkshops";
import Session from "./pages/Session";
import SessionAdmin from "./pages/SessionAdmin";
import SessionReport from "./pages/SessionReport";
import JoinSession from "./pages/JoinSession";
import Pricing from "./pages/pricing/index";
import Checkout from "./pages/checkout/index";
import NotFound from "./pages/NotFound";
import FAQs from "./pages/FAQs";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/faqs" element={<FAQs />} />
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
              </Route>
              
              {/* Routes outside the main layout */}
              <Route path="/session" element={<Session />} />
              <Route path="/session/admin" element={<SessionAdmin />} />
              <Route path="/session/report/:id" element={<SessionReport />} />
              <Route path="/join" element={<JoinSession />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
