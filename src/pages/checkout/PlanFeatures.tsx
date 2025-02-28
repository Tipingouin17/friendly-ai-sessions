
import React from 'react';
import { Check } from 'lucide-react';
import { Plan } from '../pricing/types';

interface PlanFeaturesProps {
  plan: Plan;
}

export const PlanFeatures = ({ plan }: PlanFeaturesProps) => {
  // Generate feature list based on plan table details
  const getFeatureList = () => {
    if (!plan.plan_table_details) return [];
    
    const features = [];
    
    // Number of facilitators
    if (plan.plan_table_details.no_of_facilitator) {
      const facilitators = plan.plan_table_details.no_of_facilitator === 'unlimited' 
        ? 'Unlimited facilitators' 
        : `${plan.plan_table_details.no_of_facilitator} facilitators`;
      features.push(facilitators);
    }
    
    // Number of sessions
    if (plan.plan_table_details.no_of_sessions) {
      const sessions = plan.plan_table_details.no_of_sessions === 'unlimited' 
        ? 'Unlimited sessions per month' 
        : `${plan.plan_table_details.no_of_sessions} sessions per month`;
      features.push(sessions);
    }
    
    // Max participants
    if (plan.plan_table_details.max_participants) {
      const participants = plan.plan_table_details.max_participants === 'unlimited' 
        ? 'Unlimited participants per session' 
        : `Up to ${plan.plan_table_details.max_participants} participants per session`;
      features.push(participants);
    }
    
    // Customizable sessions
    if (plan.plan_table_details.customisable_sessions) {
      features.push('Create customized sessions');
    }
    
    // Saved sessions
    if (plan.plan_table_details.saved_sessions) {
      features.push('Save sessions for later');
    }
    
    // Session reports
    if (plan.plan_table_details.session_reports) {
      features.push('Detailed session reports');
    }
    
    // Data export
    if (plan.plan_table_details.data_export) {
      features.push('Export session data');
    }
    
    return features;
  };

  const planFeatures = getFeatureList();

  return (
    <ul className="space-y-2">
      {planFeatures.map((feature, index) => (
        <li key={index} className="flex items-start gap-2">
          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
};
