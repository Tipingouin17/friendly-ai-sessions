
import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onClick: () => void;
}

const MessageLikeButton = ({ isLiked, likeCount, onClick }: MessageLikeButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "opacity-0 group-hover:opacity-100 transition-opacity mb-2",
        isLiked && "opacity-100"
      )}
    >
      <Heart 
        className={cn(
          "w-4 h-4 transition-colors",
          isLiked 
            ? "fill-purple-500 stroke-purple-500" 
            : "stroke-gray-400 hover:stroke-purple-500"
        )}
      />
      {likeCount > 0 && (
        <span className="text-xs text-gray-500">{likeCount}</span>
      )}
    </button>
  );
};

export default MessageLikeButton;
