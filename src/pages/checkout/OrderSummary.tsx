/**
 * OrderSummary
 *
 * Right-column order summary card shown during checkout.
 * Includes a promo code input that validates against the backend
 * (Stripe coupon lookup) and shows the discounted price live.
 * The validated coupon ID is lifted to the parent so it can be
 * passed through to createSubscription.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Tag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Plan } from '../pricing/types';
import { supabase, EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/integrations/supabase/client';

/** Shape returned by the validate-coupon backend endpoint. */
interface CouponResult {
  valid: boolean;
  couponId?: string;
  promoCodeId?: string | null;
  percentOff?: number | null;
  amountOff?: number | null;
  currency?: string | null;
  duration?: string;
  durationInMonths?: number | null;
  name?: string;
  error?: string;
}

interface OrderSummaryProps {
  plan: Plan;
  /** Lifted coupon ID — passed to createSubscription so the discount is applied server-side. */
  onCouponApplied?: (couponId: string | null) => void;
}

export const OrderSummary = ({ plan, onCouponApplied }: OrderSummaryProps) => {
  const [promoCode, setPromoCode] = useState('');
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Format price with correct currency symbol using Intl
  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  /**
   * Calculate the discounted price from the coupon details.
   * Returns the discounted amount in the same unit as plan.price (dollars, not cents).
   */
  const getDiscountedPrice = (): number | null => {
    if (!coupon?.valid) return null;
    if (coupon.percentOff) {
      return plan.price * (1 - coupon.percentOff / 100);
    }
    if (coupon.amountOff) {
      // amountOff from Stripe is in cents; plan.price is in dollars
      return Math.max(0, plan.price - coupon.amountOff / 100);
    }
    return null;
  };

  /** Human-readable discount label, e.g. "20% off for 3 months". */
  const getDiscountLabel = (): string => {
    if (!coupon?.valid) return '';
    const pct = coupon.percentOff ? `${coupon.percentOff}% off` : '';
    const amt = coupon.amountOff ? `${formatPrice(coupon.amountOff / 100, coupon.currency || plan.currency)} off` : '';
    const discount = pct || amt;
    if (coupon.duration === 'forever') return `${discount} forever`;
    if (coupon.duration === 'repeating' && coupon.durationInMonths) {
      return `${discount} for ${coupon.durationInMonths} month${coupon.durationInMonths > 1 ? 's' : ''}`;
    }
    return `${discount} on first payment`;
  };

  /** Validate the entered promo code against the backend. */
  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    setValidating(true);
    setPromoError(null);
    setCoupon(null);
    onCouponApplied?.(null);

    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/validate-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
        },
        body: JSON.stringify({ couponCode: code }),
      });

      const result: CouponResult = await response.json();

      if (!response.ok || !result.valid) {
        setPromoError(result.error || 'Invalid or expired promo code');
        return;
      }

      setCoupon(result);
      onCouponApplied?.(result.couponId || null);
    } catch {
      setPromoError('Could not validate promo code. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  /** Remove the applied coupon. */
  const handleRemovePromo = () => {
    setCoupon(null);
    setPromoCode('');
    setPromoError(null);
    onCouponApplied?.(null);
  };

  const originalPrice = plan.price;
  const discountedPrice = getDiscountedPrice();
  const finalPrice = discountedPrice ?? originalPrice;
  const currency = plan.currency || 'USD';

  return (
    <div className="sticky top-24">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-left">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Plan line */}
            <div className="flex justify-between">
              <span>{plan.title} Plan</span>
              <span>{formatPrice(originalPrice, currency)}/mo</span>
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Billing</span>
              <span>Monthly</span>
            </div>

            {/* Promo code input */}
            {!coupon?.valid ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                    className="text-sm h-9"
                    disabled={validating}
                    aria-label="Promo code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={handleApplyPromo}
                    disabled={validating || !promoCode.trim()}
                  >
                    {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {promoError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {promoError}
                  </div>
                )}
              </div>
            ) : (
              /* Applied coupon badge */
              <div className="flex items-start justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{coupon.name}</p>
                    <p className="text-xs text-green-700">{getDiscountLabel()}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-green-600 hover:text-green-800 text-xs underline shrink-0 mt-0.5"
                  aria-label="Remove promo code"
                >
                  Remove
                </button>
              </div>
            )}

            <Separator />

            {/* Discount line (only shown when a coupon is applied) */}
            {coupon?.valid && discountedPrice !== null && (
              <div className="flex justify-between text-sm text-green-700 font-medium">
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Discount
                </span>
                <span>−{formatPrice(originalPrice - discountedPrice, currency)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>
                {coupon?.valid && discountedPrice !== null ? (
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-green-700">{formatPrice(finalPrice, currency)}/mo</span>
                    <span className="text-xs text-muted-foreground line-through font-normal">
                      {formatPrice(originalPrice, currency)}/mo
                    </span>
                  </span>
                ) : (
                  `${formatPrice(finalPrice, currency)}/month`
                )}
              </span>
            </div>

            {/* Security notice */}
            <div className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Shield className="h-4 w-4" />
                <span>Secure payment processing</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Your payment information is encrypted and secure. We never store your full credit card details.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
