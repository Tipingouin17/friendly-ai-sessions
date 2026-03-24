
import { supabase } from '@/integrations/supabase/client';

export const updateUserSubscription = async (userId: string, planId: number) => {
  if (!userId) {
    throw new Error("User must be logged in to update subscription");
  }
  
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      current_plan_id: planId, 
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();
    
  if (updateError) {
    console.error('Error updating user profile:', updateError);
    throw new Error('Failed to update user profile with new subscription');
  }
  
  return data;
};
