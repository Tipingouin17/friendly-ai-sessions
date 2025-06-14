
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MessageSquare, 
  Users, 
  BarChart2, 
  Clock,
  FileText,
  ChevronDown, 
  Filter,
  Search,
  Eye
} from "lucide-react";
import AdminHeader from "./AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

interface AdminDashboardProps {
  conversationData: any;
  messages: any[];
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  handleAdminMessage: (message: string) => void;
  exportSessionData: () => void;
  participants: any[];
  currentParticipantCount: number;
  maxParticipants: number;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  showAnonymous?: boolean;
  setShowAnonymous?: (show: boolean) => void;
  children: React.ReactNode;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  conversationData,
  messages,
  isSessionPaused,
  toggleSessionState,
  handleAdminMessage,
  exportSessionData,
  participants,
  currentParticipantCount,
  maxParticipants,
  searchTerm = '',
  setSearchTerm = () => {},
  showAnonymous = true,
  setShowAnonymous = () => {},
  children
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Calculate session statistics
  const totalMessages = messages.length;
  const userMessages = messages.filter(m => m.sender === "user").length;
  const facilitatorMessages = messages.filter(m => m.sender === "assistant").length;
  const averageResponsesPerQuestion = 
    Math.round((userMessages / (facilitatorMessages || 1)) * 10) / 10;
  
  // Session start time calculation
  const sessionStartTime = conversationData?.created_at 
    ? new Date(conversationData.created_at) 
    : new Date();
  
  // Calculate session duration in minutes
  const sessionDurationMinutes = Math.round(
    (new Date().getTime() - sessionStartTime.getTime()) / (1000 * 60)
  );
  
  return (
    <div className="flex flex-col h-full">
      {/* Sticky header with controls and analytics */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <AdminHeader 
          conversation={conversationData}
          isSessionPaused={isSessionPaused}
          toggleSessionState={toggleSessionState}
          onExportData={exportSessionData}
        />
        
        {/* Analytics cards */}
        <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="bg-white">
            <CardContent className="p-3 flex items-center">
              <div className="bg-blue-50 p-2 rounded-full mr-3">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Participants</p>
                <div className="flex items-center gap-1">
                  <p className="text-xl font-semibold">{currentParticipantCount}</p>
                  <span className="text-xs text-gray-500">/ {maxParticipants}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-3 flex items-center">
              <div className="bg-amber-50 p-2 rounded-full mr-3">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Messages</p>
                <div className="flex items-center gap-1">
                  <p className="text-xl font-semibold">{totalMessages}</p>
                  <span className="text-xs text-gray-500">total</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-3 flex items-center">
              <div className="bg-green-50 p-2 rounded-full mr-3">
                <BarChart2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg. Responses</p>
                <div className="flex items-center gap-1">
                  <p className="text-xl font-semibold">{averageResponsesPerQuestion}</p>
                  <span className="text-xs text-gray-500">per question</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-3 flex items-center">
              <div className="bg-purple-50 p-2 rounded-full mr-3">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <div className="flex items-center gap-1">
                  <p className="text-xl font-semibold">{sessionDurationMinutes}</p>
                  <span className="text-xs text-gray-500">minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs navigation */}
        <Tabs defaultValue="overview" className="px-4 pt-2">
          <TabsList className="mb-3">
            <TabsTrigger 
              value="overview"
              onClick={() => setActiveTab("overview")}
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              onClick={() => setActiveTab("analytics")}
              className="flex items-center gap-1"
            >
              <BarChart2 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          {/* Search and filter toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAnonymous(!showAnonymous)}
                className={`text-xs ${showAnonymous ? 'bg-primary/10' : ''}`}
              >
                <Filter className="mr-1 h-3.5 w-3.5" />
                {showAnonymous ? 'Showing' : 'Hiding'} anonymous
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={exportSessionData}>
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export session data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Statistics summary badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
              {currentParticipantCount} Active Participants
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
              {userMessages} User Messages
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-100">
              {facilitatorMessages} Facilitator Messages
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-100">
              {sessionDurationMinutes} Minutes Duration
            </Badge>
          </div>
        </Tabs>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default AdminDashboard;
