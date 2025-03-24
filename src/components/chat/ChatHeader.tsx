
import { Button } from "@/components/ui/button";
import { FileText, Users } from "lucide-react";
import React from "react";

interface ChatHeaderProps {
  title?: string;
  objective?: string;
  profilePicture?: string;
  participantCount?: number;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
  canGenerateReport?: boolean;
  viewMode?: "participant" | "admin";
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  isLoading?: boolean;
}

const ChatHeader = ({ 
  title, 
  objective, 
  profilePicture,
  participantCount = 1,
  onGenerateReport,
  isGeneratingReport,
  canGenerateReport,
  viewMode = "participant",
  onImageError,
  isLoading = false
}: ChatHeaderProps) => {
  return (
    <div className="border-b border-gray-200 p-6 bg-white">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={profilePicture || "/placeholder.svg"}
              alt={title || "Facilitator"}
              className="w-16 h-16 rounded-full object-cover border border-gray-200"
              onError={onImageError}
              crossOrigin="anonymous"
            />
            {viewMode === "admin" && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs rounded-full px-1.5 py-0.5 font-medium border border-white">
                Admin
              </div>
            )}
          </div>
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-gray-800">{title || "Untitled Session"}</h2>
            <p className="text-gray-600 text-sm line-clamp-2 mt-1">{objective || "No objective set"}</p>
            {viewMode === "admin" && (
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-primary">
                <Users className="w-4 h-4" />
                <span className="font-medium">{participantCount}</span>
                <span>{participantCount === 1 ? 'participant' : 'participants'}</span>
              </div>
            )}
          </div>
        </div>
        {onGenerateReport && viewMode === "admin" && (
          <div>
            <Button
              onClick={onGenerateReport}
              disabled={isGeneratingReport || !canGenerateReport}
              variant="outline"
              className="flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4" />
              {isGeneratingReport ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
