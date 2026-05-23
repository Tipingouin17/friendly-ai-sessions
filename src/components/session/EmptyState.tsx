/**
 * Empty State
 *
 * Session component for the AIfacilitator application.
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const EmptyState = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(location.search);
  const idFromParams = searchParams.get('id');
  
  const handleTryAgain = () => {
    if (idFromParams) {
      toast({
        title: "Retrying session load",
        description: "Attempting to reconnect to your session...",
      });
      window.location.reload();
    } else {
      navigate('/my-facilitators');
    }
  };
  
  return (
    <div className="min-h-screen bg-indigo-600/10">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Session link not available</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {idFromParams 
                ? "We could not open this session link. The session may have ended, the link may have expired, or the room may still be starting."
                : "This page does not include a session link. Please use the link shared by the host."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={handleTryAgain} 
                className="bg-primary text-white"
              >
                {idFromParams ? "Retry session link" : "Start a New Session"}
              </Button>
              
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
              >
                Return Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
