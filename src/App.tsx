
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import Index from '@/pages/Index';
import Contact from '@/pages/Contact';
import FAQs from '@/pages/FAQs';
import Pricing from '@/pages/Pricing';
import NotFound from '@/pages/NotFound';
import Session from '@/pages/Session';
import MyFacilitators from '@/pages/MyFacilitators';
import PastWorkshops from '@/pages/PastWorkshops';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/my-facilitators" element={<MyFacilitators />} />
              <Route path="/session/:id" element={<Session />} />
              <Route path="/past-workshops" element={<PastWorkshops />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
