/**
 * Signup
 *
 * Page for the AIfacilitator application.
 */

import React, { useEffect } from 'react';
import { SignupContainer } from '@/components/auth/SignupContainer';
import { SignupForm } from '@/components/auth/SignupForm';
import { SignupFooter } from '@/components/auth/SignupFooter';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageHead from '@/components/PageHead';

const Signup = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  // Only block rendering if there's an existing session being validated
  if (loading && !!localStorage.getItem('mf_session')) return null;

  return (
    <SignupContainer>
      <PageHead title="Sign Up" description="Create your AIfacilitator account" />
      <SignupForm />
      <SignupFooter />
    </SignupContainer>
  );
};

export default Signup;
