
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Workshop {
  id: number;
  created_at: string;
  participants: number;
  sessions_id: number | null;
  is_saved: boolean;
  is_session_ended: boolean;
  participant_description?: string;
}

const fetchPastWorkshops = async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions:sessions_id (
        title,
        facilitator
      )
    `)
    .eq('is_session_ended', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

const PastWorkshops = () => {
  const { data: workshops, isLoading, error } = useQuery({
    queryKey: ['past-workshops'],
    queryFn: fetchPastWorkshops,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Past Workshops</h1>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Past Workshops</h1>
          <div className="text-red-500">Error loading workshops</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Past Workshops</h1>

        <div className="space-y-4">
          {workshops?.map((workshop) => (
            <Card key={workshop.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    {workshop.sessions?.title || 'Untitled Workshop'}
                  </h2>
                  <div className="flex items-center text-gray-600 mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(workshop.created_at).toLocaleDateString()}
                  </div>
                  {workshop.participant_description && (
                    <p className="text-gray-600 mt-2">
                      {workshop.participant_description}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <div className="flex items-center justify-end text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{workshop.participants || 0} participants</span>
                  </div>
                  <div className="flex items-center justify-end text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Completed</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {workshops?.length === 0 && (
            <Card className="p-6">
              <p className="text-center text-gray-500">No past workshops found</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PastWorkshops;
