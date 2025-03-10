
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Crown, BarChart, Users, Settings, Home } from 'lucide-react';

const AdminHeader = () => {
  const navigate = useNavigate();
  
  return (
    <div className="border-b border-slate-200 bg-slate-50">
      <div className="container px-4 mx-auto">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg font-semibold">Session Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1.5" 
              onClick={() => {
                // TODO: Implement analytics view when available
              }}
            >
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1.5" 
              onClick={() => {
                // TODO: Implement participant management when available
              }}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Participants</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1.5" 
              onClick={() => {
                // TODO: Implement settings when available
              }}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1.5" 
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
