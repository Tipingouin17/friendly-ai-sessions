/**
 * facilitator Service
 *
 * Service for the AIfacilitator application.
 */

import { supabase } from "@/integrations/supabase/client";

export const fetchFacilitators = async () => {
  const { data, error } = await supabase
    .from('facilitators')
    .select('*')
    .order('order', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const fetchWorkshops = async (facilitatorId: number | null) => {
  const query = supabase
    .from('sessions')
    .select('*, facilitator:facilitators!inner(*)')
    .eq('status', true);
    
  if (facilitatorId) {
    query.eq('facilitator', facilitatorId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createConversation = async (params: {
  description: string;
  language: string;
  participantCount: number;
  workshopId: number;
  agreed: boolean;
  userId: string;
}) => {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_description: params.description,
      language: params.language,
      participants: params.participantCount,
      sessions_id: params.workshopId,
      accept_terms_and_conditions: params.agreed,
      is_saved: false,
      is_session_ended: false,
      user_id: params.userId
    })
    .select('id')
    .single();
    
  if (error) throw error;
  return data;
};
