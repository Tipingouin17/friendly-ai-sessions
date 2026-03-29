
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
    
    const features: string[] = [];
    const d = plan.plan_table_details;
    
    // Number of facilitators
    if (d.facilitator_limit !== null && d.facilitator_limit !== undefined) {
      const isUnlimited = d.facilitator_limit >= 999999;
      features.push(isUnlimited
        ? 'Unlimited facilitators'
        : `${d.facilitator_limit} ${d.facilitator_limit === 1 ? 'facilitator' : 'facilitators'}`
      );
    }
    
    // Number of sessions
    if (d.session_limit !== null && d.session_limit !== undefined) {
      const isUnlimited = d.session_limit >= 999999;
      features.push(isUnlimited
        ? 'Unlimited sessions per month'
        : `${d.session_limit} ${d.session_limit === 1 ? 'session' : 'sessions'} per month`
      );
    }
    
    // Max participants
    if (d.max_participants !== null && d.max_participants !== undefined) {
      const isUnlimited = d.max_participants >= 999999;
      features.push(isUnlimited
        ? 'Unlimited participants per session'
        : `Up to ${d.max_participants} participants per session`
      );
    }

    // Question limit
    if (d.question_limit !== null && d.question_limit !== undefined && d.question_limit > 0) {
      const isUnlimited = d.question_limit >= 999999;
      features.push(isUnlimited
        ? 'Unlimited questions per session'
        : `Up to ${d.question_limit} questions per session`
      );
    }
    
    // Customizable sessions
    if (d.customisable_sessions) {
      features.push('Customizable sessions');
    }

    // Customizable facilitators
    if (d.customisable_facilitators) {
      features.push('Customizable facilitators');
    }
    
    // Saved sessions
    if (d.saved_sessions) {
      features.push('Save sessions for later');
    }
    
    // Session reports
    if (d.session_reports) {
      features.push('Detailed session reports');
    }
    
    // Data export
    if (d.data_export) {
      features.push('Export session data');
    }

    // Priority support
    if (d.priority_support) {
      features.push('Priority support');
    }

    // Custom branding
    if (d.custom_branding) {
      features.push('Custom branding');
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
