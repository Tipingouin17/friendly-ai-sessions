
import React from 'react';
import { Package, DollarSign, Euro, PoundSterling } from 'lucide-react';
import { Plan } from '../pricing/types';
import { PlanFeatures } from './PlanFeatures';

interface PlanDetailsProps {
  plan: Plan;
}

export const PlanDetails = ({ plan }: PlanDetailsProps) => {
  // Format price with correct currency symbol
  const formatPrice = (price: number, currency: string = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return formatter.format(price);
  };

  // Get appropriate currency icon
  const CurrencyIcon = () => {
    const currency = plan.currency?.toUpperCase() || 'USD';
    switch (currency) {
      case 'EUR':
        return <Euro className="h-5 w-5 text-primary mr-1" />;
      case 'GBP':
        return <PoundSterling className="h-5 w-5 text-primary mr-1" />;
      case 'USD':
      default:
        return <DollarSign className="h-5 w-5 text-primary mr-1" />;
    }
  };

  const formattedPrice = formatPrice(plan.price, plan.currency);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Plan Details</h3>
      </div>
      
      <div className="bg-primary/5 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{plan.title} Plan</h3>
          <span className="text-2xl font-bold flex items-center">{formattedPrice}/mo</span>
        </div>
        
        <PlanFeatures plan={plan} />
      </div>
    </div>
  );
};
