
import { Euro, PoundSterling, DollarSign } from 'lucide-react';

/**
 * Format a price with the correct currency symbol
 */
export const formatPrice = (price: number, currency: string = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return formatter.format(price);
};

/**
 * Get the appropriate currency icon component based on currency code
 */
export const getCurrencyIcon = (currency?: string) => {
  const currencyCode = currency?.toUpperCase() || 'USD';
  switch (currencyCode) {
    case 'EUR':
      return Euro;
    case 'GBP':
      return PoundSterling;
    case 'USD':
    default:
      return DollarSign;
  }
};
