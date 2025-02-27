
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { StandardPlanCard } from './pricing/components/StandardPlanCard';
import { EnterprisePlanCard } from './pricing/components/EnterprisePlanCard';
import { ComparisonTable } from './pricing/components/ComparisonTable';
import { LoadingState } from './pricing/components/LoadingState';
import { ErrorState } from './pricing/components/ErrorState';
import { useToast } from '@/components/ui/use-toast';
import { Plan } from './pricing/types';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const Pricing = () => {
  const [showContactDialog, setShowContactDialog] = useState(false);
  const { toast } = useToast();
  const { currentPlanId, isLoading: isUserPlanLoading } = useUserPlan();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data as Plan[];
    }
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load pricing plans. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleContactSalesTeam = () => {
    setShowContactDialog(false);
    
    // Simulate sending a request
    toast({
      title: "Request Sent",
      description: "Our sales team will contact you shortly!",
    });
  };

  if (isLoading || isUserPlanLoading) {
    return <LoadingState />;
  }

  if (error || !plans) {
    return <ErrorState error={error as Error} />;
  }

  // Filter out Enterprise plan from standard plans display
  const standardPlans = plans.filter(plan => plan.title !== 'Enterprise');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose the Right Plan for Your Needs</h1>
          <p className="text-lg text-gray-600">
            Whether you're just starting out or looking to scale, we have a plan that's right for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {standardPlans.map((plan) => (
            <StandardPlanCard 
              key={plan.id} 
              plan={plan} 
              isCurrentPlan={plan.id === currentPlanId}
            />
          ))}
          <EnterprisePlanCard onContactClick={() => setShowContactDialog(true)} />
        </div>

        {plans.length > 0 && <ComparisonTable plans={plans} />}
      </div>

      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact our Sales Team</DialogTitle>
            <DialogDescription>
              Please provide your details and we'll get back to you within 24 hours.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p>
              Our Enterprise plan offers custom solutions tailored to your organization's needs.
              Our team will work with you to understand your requirements and provide a customized quote.
            </p>
          </div>
          
          <DialogFooter>
            <Button onClick={handleContactSalesTeam}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
