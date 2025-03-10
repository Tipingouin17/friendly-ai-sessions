
import React from 'react';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Filter } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface AdminMessageFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showAnonymous: boolean;
  setShowAnonymous: (show: boolean) => void;
  totalResponses: number;
  currentParticipantCount: number;
}

const AdminMessageFilters: React.FC<AdminMessageFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  showAnonymous,
  setShowAnonymous,
  totalResponses,
  currentParticipantCount
}) => {
  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex-1">
          <Input
            placeholder="Search responses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Toggle 
          pressed={showAnonymous} 
          onPressedChange={setShowAnonymous}
          size="sm"
          aria-label="Toggle anonymous responses"
          className="flex items-center gap-1"
        >
          {showAnonymous ? 
            <Eye className="h-4 w-4" /> : 
            <EyeOff className="h-4 w-4" />
          }
          Anonymous
        </Toggle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setShowAnonymous(!showAnonymous)}>
              {showAnonymous ? "Hide Anonymous" : "Show Anonymous"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSearchTerm('')}>
              Clear Search
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-sm text-gray-500">
        Showing {totalResponses} responses 
        from {currentParticipantCount || 0} participants
      </div>
    </div>
  );
};

export default AdminMessageFilters;
