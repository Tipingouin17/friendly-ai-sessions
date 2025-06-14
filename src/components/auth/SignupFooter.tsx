
import React from 'react';
import { Link } from 'react-router-dom';

export const SignupFooter: React.FC = () => {
  return (
    <p className="text-center mt-4 text-sm text-gray-600">
      Already have an account?{' '}
      <Link to="/login" className="text-primary hover:underline">
        Log in
      </Link>
    </p>
  );
};
