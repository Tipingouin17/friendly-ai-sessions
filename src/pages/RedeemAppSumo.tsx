/**
 * RedeemAppSumo
 *
 * Dedicated page for AppSumo lifetime deal code redemption.
 * Users land here after purchasing on AppSumo, enter their unique code,
 * and the corresponding LTD plan (Tier 1 / 2 / 3) is activated on their account.
 *
 * Route: /redeem  (ProtectedRoute — user must be logged in)
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Tag, Zap, Users, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/integrations/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RedemptionResult {
  success: boolean;
  tier: number;
  tierName: string;
  planId: number;
  planTitle: string;
  codesRedeemed: number;
  facilitatorLimit: number | null;
  sessionLimit: number | null;
  maxParticipants: number | null;
}

// ── Tier display config ───────────────────────────────────────────────────────
const TIER_INFO = [
  {
    tier: 1,
    name: 'Solo',
    price: '€49',
    icon: Zap,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    features: ['1 facilitator', '10 sessions / month', '10 participants / session', 'Session reports', 'Saved sessions'],
  },
  {
    tier: 2,
    name: 'Team',
    price: '€99',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    popular: true,
    features: ['5 facilitators', '30 sessions / month', '30 participants / session', 'Session reports', 'Data export', 'Saved sessions'],
  },
  {
    tier: 3,
    name: 'Agency',
    price: '€199',
    icon: Building2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    features: ['Unlimited facilitators', 'Unlimited sessions', '100 participants / session', 'Session reports', 'Data export', 'Custom branding', 'Saved sessions'],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const RedeemAppSumo: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedemptionResult | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Please enter your AppSumo code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/redeem-appsumo-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
        },
        body: JSON.stringify({
          userId: user.id,
          code: trimmedCode,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.detail || json.error || 'Redemption failed. Please try again.');
      }

      setResult(json as RedemptionResult);
      toast({
        title: 'Code redeemed successfully!',
        description: `Your AppSumo ${json.tierName} plan is now active.`,
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (result) {
    const tierInfo = TIER_INFO.find(t => t.tier === result.tier);
    const TierIcon = tierInfo?.icon ?? CheckCircle2;

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're all set!</h1>
          <p className="text-gray-500 mb-8">
            Your AppSumo <strong>{result.tierName}</strong> lifetime deal is now active on your account.
          </p>

          <div className={`rounded-2xl border-2 ${tierInfo?.border ?? 'border-gray-200'} ${tierInfo?.bg ?? 'bg-gray-50'} p-6 mb-8 text-left`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm`}>
                <TierIcon className={`w-5 h-5 ${tierInfo?.color ?? 'text-gray-600'}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{result.planTitle}</p>
                <p className="text-sm text-gray-500">Lifetime access — no recurring charges</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              {result.facilitatorLimit !== null
                ? <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />{result.facilitatorLimit} facilitator{result.facilitatorLimit !== 1 ? 's' : ''}</li>
                : <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />Unlimited facilitators</li>
              }
              {result.sessionLimit !== null
                ? <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />{result.sessionLimit} sessions / month</li>
                : <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />Unlimited sessions</li>
              }
              {result.maxParticipants !== null
                ? <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />Up to {result.maxParticipants} participants / session</li>
                : <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />Unlimited participants</li>
              }
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={() => navigate('/my-facilitators')}
            >
              Go to my dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/profile')}
            >
              View my plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Redemption form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-16">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
              <Tag className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Redeem your AppSumo code</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Enter the unique code from your AppSumo purchase to activate your lifetime deal.
            Make sure you are logged in to the account you want to activate the plan on.
          </p>
        </div>

        {/* Tier overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {TIER_INFO.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.tier}
                className={`relative rounded-xl border-2 ${t.border} ${t.bg} p-4`}
              >
                {t.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Most popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-5 h-5 ${t.color}`} />
                  <span className="font-semibold text-gray-900">{t.name}</span>
                  <span className={`ml-auto text-sm font-bold ${t.color}`}>{t.price}</span>
                </div>
                <ul className="space-y-1">
                  {t.features.map((f) => (
                    <li key={f} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Code entry form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Enter your code</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your code was sent to you by AppSumo after your purchase. It looks like{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">APPSUMO-XXXXXXXX</code>.
          </p>

          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
                placeholder="APPSUMO-XXXXXXXX"
                className="font-mono text-center text-lg tracking-widest uppercase h-14"
                disabled={loading}
                maxLength={64}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating your plan…
                </>
              ) : (
                'Activate lifetime deal'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Each code can only be redeemed once. If you have multiple codes, redeem them one at a time to stack tiers.
            Need help?{' '}
            <a href="/contact" className="underline hover:text-gray-600">Contact support</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RedeemAppSumo;
