
import React from 'react';
import { useUserPlan } from '@/hooks/useUserPlan';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
export const PlanInfo = () => {
  const {
    plan,
    isLoading: planLoading
  } = useUserPlan();
  const {
    currentFacilitatorCount,
    currentSessionCount,
    maxFacilitators,
    maxSessions,
    maxParticipants,
    maxQuestionsPerSession,
    canCreateCustomSessions,
    canExportData,
    canSaveSessions,
    canGenerateReports,
    isLoading: limitsLoading
  } = usePlanLimits();
  const navigate = useNavigate();
  const isLoading = planLoading || limitsLoading;
  const getProgressValue = (current: number, max: number) => {
    if (max === Infinity) return 0; // Don't show progress for unlimited
    return Math.min(100, current / max * 100);
  };
  const handleUpgrade = () => {
    navigate('/pricing');
  };
  if (isLoading) {
    return <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>;
  }

  // Format the price with correct currency symbol and decimal places
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '';

    // Extract currency information from plan metadata or default to USD
    const currency = plan?.currency || 'USD';

    // Format price with appropriate currency symbol
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    // Return formatted value with /month appended
    return `${formatter.format(price / 100).replace(/[A-Z]{3}/, '').trim()}/month`;
  };

  // Check if the plan is the highest tier (Premium or Enterprise)
  const isHighestTier = plan?.id === 3 || plan?.id === 4;
  return <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>Your Plan: {plan?.title || 'Free'}</span>
          {plan?.price ? <span>{formatPrice(plan.price)}</span> : <span>Free</span>}
        </CardTitle>
        <CardDescription>
          {plan?.plan_type || 'Standard subscription'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Facilitators</span>
            <span>{currentFacilitatorCount} / {maxFacilitators === Infinity ? 'Unlimited' : maxFacilitators}</span>
          </div>
          {maxFacilitators !== Infinity && <Progress value={getProgressValue(currentFacilitatorCount, maxFacilitators)} />}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sessions</span>
            <span>{currentSessionCount} / {maxSessions === Infinity ? 'Unlimited' : maxSessions}</span>
          </div>
          {maxSessions !== Infinity && <Progress value={getProgressValue(currentSessionCount, maxSessions)} />}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Max Participants Per Session</span>
            <span>{maxParticipants === Infinity ? 'Unlimited' : maxParticipants}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Questions Per Session</span>
            <span>{maxQuestionsPerSession === Infinity ? 'Unlimited' : maxQuestionsPerSession}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${canCreateCustomSessions ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-left">Customizable Sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${canSaveSessions ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-left">Session Saving</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${canGenerateReports ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-left">Session Reports</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${canExportData ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-left">Data Export</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleUpgrade} className="w-full" variant={isHighestTier ? "outline" : "default"}>
          {isHighestTier ? "Manage Subscription" : "Upgrade Plan"}
        </Button>
      </CardFooter>
    </Card>;
};
