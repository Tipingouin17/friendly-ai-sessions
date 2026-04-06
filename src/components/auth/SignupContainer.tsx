/**
 * Signup Container
 *
 * Auth component for the AIfacilitator application.
 */

import React from 'react';

interface SignupContainerProps {
  children: React.ReactNode;
}

export const SignupContainer: React.FC<SignupContainerProps> = ({ children }) => {
  return (
    <div className="min-h-screen pb-16 bg-indigo-600/10">
      <div className="max-w-md mx-auto px-4 pt-24">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Create an Account</h1>
          <p className="text-center text-gray-500 text-sm mb-6">
            Get started with AIfacilitator for free
          </p>
          {children}
        </div>
      </div>
    </div>
  );
};
