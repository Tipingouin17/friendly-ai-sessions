
import React, { useState } from 'react';
import { Message } from '@/types/chat';
import ParticipantResponseStats from '../ParticipantResponseStats';
import { ChevronDown, ChevronUp, Search, Filter, SlidersHorizontal, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';

interface AdminMessageGroupProps {
  group: {
    question: Message;
    responses: Message[];
  };
  groupIndex: number;
  participantColors: { [key: string]: string };
  participantNameMap?: { [key: string]: string };
}

const AdminMessageGroup: React.FC<AdminMessageGroupProps> = ({
  group,
  groupIndex,
  participantColors,
  participantNameMap = {}
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Number of responses to show per page
  const RESPONSES_PER_PAGE = 10;
  
  // Helper function to get participant display name
  const getParticipantDisplayName = (participant: string | undefined): string => {
    if (!participant) return "Unknown Participant";
    
    // If it's already a name (not starting with P or contains spaces), return as is
    if (!participant.startsWith('P') || participant.includes(' ')) {
      return participant;
    }
    
    // Try to find the name in the map
    if (participantNameMap[participant]) {
      return participantNameMap[participant];
    }
    
    // If it starts with P and has a number, use "Participant X"
    const participantNumber = participant.substring(1);
    if (!isNaN(Number(participantNumber))) {
      return `Participant ${participantNumber}`;
    }
    
    // Fallback
    return participant;
  };
  
  // Filter responses based on search term
  const filteredResponses = group.responses.filter(response => 
    response.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof response.participant === 'string' && getParticipantDisplayName(response.participant).toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Sort responses based on current sort settings
  const sortedResponses = [...filteredResponses].sort((a, b) => {
    if (sortBy === 'time') {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    } else {
      const nameA = typeof a.participant === 'string' ? getParticipantDisplayName(a.participant) : '';
      const nameB = typeof b.participant === 'string' ? getParticipantDisplayName(b.participant) : '';
      return sortDirection === 'asc' 
        ? nameA.localeCompare(nameB) 
        : nameB.localeCompare(nameA);
    }
  });
  
  // Paginate responses
  const totalPages = Math.ceil(sortedResponses.length / RESPONSES_PER_PAGE);
  const paginatedResponses = sortedResponses.slice(
    (currentPage - 1) * RESPONSES_PER_PAGE,
    currentPage * RESPONSES_PER_PAGE
  );
  
  // Toggle sort direction and field
  const toggleSort = (field: 'time' | 'name') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <CollapsibleTrigger className="flex justify-between items-center w-full text-left">
          <div className="flex items-center gap-2">
            <div className="text-lg font-medium text-gray-800">Question {groupIndex + 1}</div>
            <Badge variant="outline" className="ml-2">
              {filteredResponses.length} responses
            </Badge>
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent>
        <div className="p-4 border-b border-gray-200">
          <div className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100">{group.question.content}</div>
        </div>
        
        <ParticipantResponseStats 
          responses={group.responses}
          totalParticipants={group.responses.length > 0 ? group.responses.length : 0}
          showDetailedStats={true}
        />
        
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search responses..."
              className="pl-9 h-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => toggleSort('time')}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
                sortBy === 'time' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
              }`}
            >
              Time {sortBy === 'time' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
                sortBy === 'name' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
              }`}
            >
              Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filters
            </button>
            <button className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
              <BarChart2 className="h-4 w-4 mr-1" />
              Insights
            </button>
          </div>
        </div>
        
        {filteredResponses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No responses match your search criteria
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {paginatedResponses.map((response, responseIndex) => (
                <div key={`response-${response.id}-${responseIndex}`} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: participantColors[response.participant] || '#888' }} 
                    />
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      {response.isAnonymous ? 'Anonymous participant' : getParticipantDisplayName(response.participant)}
                      {response.isAnonymous && 
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">anonymous</span>
                      }
                    </div>
                    <div className="text-xs text-gray-500 ml-auto">
                      {response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : ''}
                    </div>
                  </div>
                  <div className="text-gray-700 pl-4 border-l-2 border-gray-100">{response.content}</div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="p-3 border-t border-gray-200">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink 
                          onClick={() => setCurrentPage(i + 1)}
                          isActive={currentPage === i + 1}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdminMessageGroup;
