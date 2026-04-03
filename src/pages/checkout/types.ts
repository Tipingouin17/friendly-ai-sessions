/**
 * types
 *
 * Page for the AIfacilitator application.
 */

import { Plan } from '../pricing/types';

export interface BillingDetails {
  name: string;
  email: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface CheckoutFormProps {
  plan: Plan;
  billingDetails: BillingDetails;
  onCancel: () => void;
  promoCode?: string;
}
