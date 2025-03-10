
import React from 'react';
import { Button } from "@/components/ui/button";
import { Share2, Users, QrCode } from "lucide-react";

interface AdminHeaderProps {
  sessionTitle: string;
  facilitatorTitle: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ sessionTitle, facilitatorTitle }) => {
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">{sessionTitle}</h1>
          {facilitatorTitle && (
            <span className="text-sm text-gray-500">Facilitator: {facilitatorTitle}</span>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Users size={16} />
            <span>Participants</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <QrCode size={16} />
            <span>Show QR</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Share2 size={16} />
            <span>Share</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
