
import React from 'react';
import { Package } from 'lucide-react';
import { Plan } from '../pricing/types';
import { PlanFeatures } from './PlanFeatures';

interface PlanDetailsProps {
  plan: Plan;
}

export const PlanDetails = ({ plan }: PlanDetailsProps) => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Plan Details</h3>
      </div>
      
      <div className="bg-primary/5 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{plan.title} Plan</h3>
          <span className="text-2xl font-bold">${plan.price}/mo</span>
        </div>
        
        <PlanFeatures plan={plan} />
      </div>
    </div>
  );
};
