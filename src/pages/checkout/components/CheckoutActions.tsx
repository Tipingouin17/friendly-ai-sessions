/**
 * Checkout Actions
 *
 * Page for the AIfacilitator application.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { formatPrice, getCurrencyIcon } from '@/utils/priceFormatUtils';

interface CheckoutActionsProps {
  price: number;
  currency?: string;
  isLoading: boolean;
  onCancel: () => void;
}

export const CheckoutActions = ({ price, currency, isLoading, onCancel }: CheckoutActionsProps) => {
  const formattedPrice = formatPrice(price, currency);
  const CurrencyIcon = getCurrencyIcon(currency);

  return (
    <div className="flex flex-col gap-3 pt-2">
      <Button 
        type="submit" 
        disabled={isLoading}
        className="w-full py-6"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing payment...
          </>
        ) : (
          <>Complete purchase - {formattedPrice}/month</>
        )}
      </Button>
      
      <Button 
        type="button"
        variant="outline" 
        onClick={onCancel}
        disabled={isLoading}
        className="w-full"
      >
        Cancel
      </Button>
    </div>
  );
};
