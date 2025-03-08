
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SessionFullAlert: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Alert className="mt-4 border-amber-500 bg-amber-50 text-amber-900">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center">
          <span>This session is full (no more spots available)</span>
        </AlertDescription>
      </Alert>
      <div className="text-center">
        <Button 
          onClick={() => navigate("/")} 
          className="mt-4 bg-[#FFC107] hover:bg-[#F5B800] text-black"
        >
          Return Home
        </Button>
      </div>
    </>
  );
};

export default SessionFullAlert;
