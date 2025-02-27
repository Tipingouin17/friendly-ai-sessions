
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { Layout } from './components/Layout';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Contact from './pages/Contact';
import FAQs from './pages/FAQs';
import Session from './pages/Session';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import MyFacilitators from './pages/MyFacilitators';
import PastWorkshops from './pages/PastWorkshops';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import Checkout from './pages/Checkout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path='/' element={<Index />} />
          <Route path='/login' element={<Login />} />
          <Route path='/signup' element={<Signup />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/faqs' element={<FAQs />} />
          <Route path='/pricing' element={<Pricing />} />
          
          {/* Protected routes */}
          <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path='/checkout' element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path='/session/:id?' element={<ProtectedRoute><Session /></ProtectedRoute>} />
          <Route path='/settings' element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path='/my-facilitators' element={<ProtectedRoute><MyFacilitators /></ProtectedRoute>} />
          <Route path='/past-workshops' element={<ProtectedRoute><PastWorkshops /></ProtectedRoute>} />
          
          {/* 404 route */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Layout>
      <Toaster />
    </Router>
  );
}

export default App;
