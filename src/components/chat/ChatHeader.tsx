
import React from 'react';
import { ChevronLeft, UserRound, MessageSquare, Bot, BookOpen, ArrowUpDown, Users, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatHeaderProps {
  title: string;
  objective?: string;
  profilePicture?: string;
  participantCount?: number;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
  canGenerateReport?: boolean;
  viewMode?: "participant" | "admin";
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  isLoading?: boolean;
  needsCrossOrigin?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  title, 
  objective, 
  profilePicture, 
  participantCount = 0,
  onGenerateReport,
  isGeneratingReport = false,
  canGenerateReport = false,
  viewMode = "participant",
  onImageError,
  isLoading = false,
  needsCrossOrigin = false
}) => {
  return (
    <div className="w-full relative px-4 py-3 flex items-center gap-3 border-b bg-white">
      <div className="flex items-center gap-3">
        {/* Profile picture with loading state */}
        {isLoading ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : (
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={profilePicture} 
              alt={title || 'Chat profile'} 
              onError={onImageError}
              crossOrigin={needsCrossOrigin ? "anonymous" : undefined}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </>
          ) : (
            <>
              <h2 className="font-semibold text-base flex items-center gap-1.5">
                {title}
                {viewMode === "admin" && (
                  <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-800">Admin</Badge>
                )}
              </h2>
              {objective && (
                <p className="text-sm text-gray-600 truncate">{objective}</p>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="ml-auto flex items-center gap-2">
        {/* Participant count */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md text-sm text-gray-600">
                <Users className="h-3.5 w-3.5" />
                <span>{participantCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {participantCount === 1 
                  ? "1 participant in this session" 
                  : `${participantCount} participants in this session`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Report generation button - only show for participant view */}
        {viewMode === "participant" && onGenerateReport && canGenerateReport && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onGenerateReport}
            disabled={isGeneratingReport}
            className="text-xs h-8"
          >
            <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
            {isGeneratingReport ? "Generating Report..." : "Get Report"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
