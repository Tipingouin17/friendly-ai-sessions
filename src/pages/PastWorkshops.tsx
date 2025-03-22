
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock, PlusCircle, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Workshop } from "@/types/database";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const fetchPastWorkshops = async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions!conversations_sessions_id_fkey (
        title,
        facilitator
      )
    `)
    .eq('is_session_ended', true)
    .order('ended_at', { ascending: false });

  if (error) throw error;
  return data as Workshop[];
};

const fetchActiveWorkshops = async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions!conversations_sessions_id_fkey (
        title,
        facilitator
      )
    `)
    .eq('is_session_ended', false)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Workshop[];
};

const WorkshopCard = ({ workshop, isActive }: { workshop: Workshop, isActive: boolean }) => {
  const navigate = useNavigate();
  
  const handleAdminView = () => {
    if (isActive) {
      navigate(`/session/admin?id=${workshop.id}`);
    }
  };
  
  return (
    <Card className={isActive ? "border-green-300" : ""}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex justify-between">
          <span>{workshop.sessions?.title || 'Untitled Workshop'}</span>
          {isActive && (
            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Active
            </span>
          )}
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
                <span>In progress</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end text-gray-600 text-sm mb-2">
              <Users className="w-4 h-4 mr-2" />
              <span>{workshop.participants || 0} participants</span>
            </div>
            {isActive && (
              <Button size="sm" onClick={handleAdminView}>
                Manage Session
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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

const EmptyState = ({ isActive = false }) => (
  <Card className="p-6">
    <div className="text-center space-y-2">
      <p className="text-gray-500 font-medium">
        {isActive ? "No active sessions found" : "No past workshops found"}
      </p>
      <p className="text-gray-400 text-sm">
        {isActive ? "Start a new session to see it here" : "Completed workshops will appear here"}
      </p>
    </div>
  </Card>
);

const PastWorkshops = () => {
  const navigate = useNavigate();
  
  const { data: pastWorkshops, isLoading: isPastLoading, error: pastError } = useQuery({
    queryKey: ['past-workshops'],
    queryFn: fetchPastWorkshops,
  });
  
  const { data: activeWorkshops, isLoading: isActiveLoading, error: activeError } = useQuery({
    queryKey: ['active-workshops'],
    queryFn: fetchActiveWorkshops,
  });
  
  const handleCreateNew = () => {
    navigate('/my-facilitators');
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-gray-500 mt-2">Manage and view all your session data</p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Create New Session
          </Button>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">Active Sessions</h2>
        {isActiveLoading ? (
          <LoadingState />
        ) : activeError ? (
          <ErrorState error={activeError as Error} />
        ) : !activeWorkshops?.length ? (
          <EmptyState isActive={true} />
        ) : (
          <div className="space-y-4 mb-8">
            {activeWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} isActive={true} />
            ))}
          </div>
        )}
        
        <h2 className="text-2xl font-semibold mb-4 mt-12">Past Workshops</h2>
        {isPastLoading ? (
          <LoadingState />
        ) : pastError ? (
          <ErrorState error={pastError as Error} />
        ) : !pastWorkshops?.length ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {pastWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} isActive={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PastWorkshops;
