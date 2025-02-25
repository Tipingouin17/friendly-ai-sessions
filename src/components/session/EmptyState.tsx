
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const EmptyState = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen pt-16 bg-[#FFC107]/10">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="text-center">
            <p className="text-lg mb-4">No active conversation found.</p>
            <Button onClick={() => navigate('/my-facilitators')} className="bg-primary text-white">
              Start a New Conversation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
