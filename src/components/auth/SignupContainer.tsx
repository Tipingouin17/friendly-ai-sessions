/**
 * Signup Container
 *
 * Auth component for the AIfacilitator application.
 */

import React from 'react';
import { BadgeCheck, Gift } from 'lucide-react';

interface SignupContainerProps {
  children: React.ReactNode;
}

export const SignupContainer: React.FC<SignupContainerProps> = ({ children }) => {
  return (
    <div className="min-h-screen pb-16 bg-indigo-600/10">
      <div className="max-w-md mx-auto px-4 pt-24">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="mb-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Gift className="h-3.5 w-3.5" />
              Tester-only offer
            </span>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Claim 3 Months Free</h1>
          <p className="text-center text-gray-500 text-sm mb-5">
            Create your AIfacilitator account, then contact Julia with your registration email to activate the extended tester trial.
          </p>
          <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900">
            <div className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <p>
                No credit card required. Access is manually upgraded for approved testers after registration.
              </p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
