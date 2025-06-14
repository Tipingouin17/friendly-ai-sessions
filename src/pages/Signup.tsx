
import React from 'react';
import { SignupContainer } from '@/components/auth/SignupContainer';
import { SignupForm } from '@/components/auth/SignupForm';
import { SignupFooter } from '@/components/auth/SignupFooter';

const Signup = () => {
  return (
    <SignupContainer>
      <SignupForm />
      <SignupFooter />
    </SignupContainer>
  );
};

export default Signup;
