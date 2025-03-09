
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
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
  onImageError
}: ChatHeaderProps) => {
  return (
    <div className="border-b border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={profilePicture || "/placeholder.svg"}
            alt={title}
            className="w-16 h-16 rounded-full"
            onError={onImageError}
          />
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-gray-600 text-sm">{objective}</p>
            {/* Only show participant count in admin view */}
            {viewMode === "admin" && (
              <p className="text-sm text-primary mt-1">
                {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
              </p>
            )}
          </div>
        </div>
        {onGenerateReport && (
          <Button
            onClick={onGenerateReport}
            disabled={isGeneratingReport || !canGenerateReport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {isGeneratingReport ? "Generating Report..." : "Generate Report"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
