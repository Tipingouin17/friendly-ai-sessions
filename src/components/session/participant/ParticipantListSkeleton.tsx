
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

interface ParticipantListSkeletonProps {
  count: number;
}

const ParticipantListSkeleton: React.FC<ParticipantListSkeletonProps> = ({ count }) => {
  return (
    <>
      {Array.from({ length: count || 3 }).map((_, index) => (
        <div 
          key={`skeleton-${index}`}
          className="p-3 mb-2 rounded-lg border border-gray-100 flex items-center gap-2"
        >
          <Skeleton className="w-2 h-2 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </>
  );
};

export default ParticipantListSkeleton;
