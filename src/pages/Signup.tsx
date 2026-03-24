
import React from 'react';
import { SignupContainer } from '@/components/auth/SignupContainer';
import { SignupForm } from '@/components/auth/SignupForm';
import { SignupFooter } from '@/components/auth/SignupFooter';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import PageHead from '@/components/PageHead';

const Signup = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) return null;

  return (
    <SignupContainer>
      <PageHead title="Sign Up" description="Create your MyFacilitator account" />
      <SignupForm />
      <SignupFooter />
    </SignupContainer>
  );
};

export default Signup;
