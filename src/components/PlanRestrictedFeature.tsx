
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FeatureRestrictions } from '@/types/auth';

interface PlanRestrictedFeatureProps {
  feature: keyof FeatureRestrictions;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PlanRestrictedFeature = ({
  feature,
  children,
  fallback
}: PlanRestrictedFeatureProps) => {
  const { canUseFeature, user } = useAuth();
  const navigate = useNavigate();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="text-center p-4">
      <p className="text-sm text-gray-600 mb-2">
        This feature requires a higher plan level
      </p>
      <Button 
        variant="outline"
        onClick={() => navigate('/pricing')}
      >
        Upgrade Plan
      </Button>
    </div>
  );
};
