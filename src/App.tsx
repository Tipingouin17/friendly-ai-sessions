
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import MyFacilitators from "./pages/MyFacilitators";
import Session from "./pages/Session";
import FAQs from "./pages/FAQs";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import PastWorkshops from "./pages/PastWorkshops";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route 
                path="/my-facilitators" 
                element={
                  <ProtectedRoute>
                    <MyFacilitators />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/session" 
                element={
                  <ProtectedRoute>
                    <Session />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/past-workshops" 
                element={
                  <ProtectedRoute>
                    <PastWorkshops />
                  </ProtectedRoute>
                } 
              />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
