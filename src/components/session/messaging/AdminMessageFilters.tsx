
import React from 'react';
import { Search, Filter, EyeOff, Eye, SlidersHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface AdminMessageFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showAnonymous: boolean;
  setShowAnonymous: (show: boolean) => void;
  totalResponses: number;
  currentParticipantCount: number;
  totalQuestions?: number;
  uniqueParticipants?: number;
}

const AdminMessageFilters: React.FC<AdminMessageFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  showAnonymous,
  setShowAnonymous,
  totalResponses,
  currentParticipantCount,
  totalQuestions = 0,
  uniqueParticipants = 0
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search responses..."
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnonymous(!showAnonymous)}
            className={`px-3 py-2 text-sm rounded-md border flex items-center gap-2 ${
              showAnonymous ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'
            }`}
          >
            {showAnonymous ? (
              <>
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Show anonymous</span>
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                <span className="hidden sm:inline">Hide anonymous</span>
              </>
            )}
          </button>
          
          <Popover>
            <PopoverTrigger asChild>
              <button className="px-3 py-2 text-sm rounded-md border border-gray-200 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Filter options</h4>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-anonymous" className="flex items-center gap-2">
                    <span>Show anonymous responses</span>
                  </Label>
                  <Switch
                    id="show-anonymous"
                    checked={showAnonymous}
                    onCheckedChange={setShowAnonymous}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-empty" className="flex items-center gap-2">
                    <span>Show questions with no responses</span>
                  </Label>
                  <Switch id="show-empty" />
                </div>
                
                <Separator />
                
                <div className="pt-2 flex justify-end gap-2">
                  <button className="text-sm text-gray-500">Reset filters</button>
                  <button className="text-sm font-medium text-primary">Apply</button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {totalQuestions > 0 && (
          <Badge variant="outline">
            {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
          </Badge>
        )}
        
        <Badge variant="outline">
          {totalResponses} response{totalResponses !== 1 ? 's' : ''}
        </Badge>
        
        <Badge variant="outline">
          {uniqueParticipants} of {currentParticipantCount} participant{currentParticipantCount !== 1 ? 's' : ''} responded
        </Badge>
        
        {searchTerm && (
          <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">
            Search: "{searchTerm}"
            <button 
              className="ml-1 text-primary" 
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          </Badge>
        )}
      </div>
    </div>
  );
};

export default AdminMessageFilters;
