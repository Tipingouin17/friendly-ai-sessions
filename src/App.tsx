import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import IndexPage from "./pages/IndexPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import FAQs from "./pages/FAQs";
import MyFacilitators from "./pages/MyFacilitators";
import PastWorkshops from "./pages/PastWorkshops";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Session from "./pages/Session";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import JoinSession from "./pages/JoinSession";

function App() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      );
    }
    if (!currentUser) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/join-session" element={<JoinSession />} />
          <Route
            path="/my-facilitators"
            element={
              <ProtectedRoute>
                <MyFacilitators />
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
            path="/session"
            element={
              <ProtectedRoute>
                <Session />
              </ProtectedRoute>
            }
          />
          <Route path="/checkout/:planType?" element={<Checkout />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
