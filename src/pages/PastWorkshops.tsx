import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Workshop } from "@/types/database";

const fetchPastWorkshops = async (): Promise<Workshop[]> => {
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
    .order('ended_at', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Workshop[];
};

const WorkshopCard = ({ workshop }: { workshop: Workshop }) => (
  <Card>
    <CardHeader className="pb-4">
      <CardTitle className="text-xl">
        {workshop.sessions?.title || 'Untitled Workshop'}
      </CardTitle>
      <div className="flex items-center text-gray-600 text-sm">
        <Calendar className="w-4 h-4 mr-2" />
        {format(new Date(workshop.created_at), 'PPP')}
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          {workshop.participant_description && (
            <p className="text-gray-600 text-sm">
              {workshop.participant_description}
            </p>
          )}
          <div className="flex items-center text-gray-600 text-sm">
            <Clock className="w-4 h-4 mr-2" />
            {workshop.ended_at ? (
              <span>Completed on {format(new Date(workshop.ended_at), 'PP')}</span>
            ) : (
              <span>Completed</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end text-gray-600 text-sm">
            <Users className="w-4 h-4 mr-2" />
            <span>{workshop.participants || 0} participants</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const LoadingState = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div className="space-y-2 w-2/3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <Card className="p-6 bg-red-50 border-red-200">
    <p className="text-red-600 font-medium">Error loading workshops</p>
    <p className="text-red-500 text-sm mt-1">{error.message}</p>
  </Card>
);

const EmptyState = () => (
  <Card className="p-6">
    <div className="text-center space-y-2">
      <p className="text-gray-500 font-medium">No past workshops found</p>
      <p className="text-gray-400 text-sm">
        Completed workshops will appear here
      </p>
    </div>
  </Card>
);

const PastWorkshops = () => {
  const { data: workshops, isLoading, error } = useQuery({
    queryKey: ['past-workshops'],
    queryFn: fetchPastWorkshops,
  });

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Past Workshops</h1>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error as Error} />
        ) : !workshops?.length ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {workshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PastWorkshops;
