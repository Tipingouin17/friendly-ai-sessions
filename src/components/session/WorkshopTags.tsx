
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface WorkshopTagsProps {
  difficulty?: string;
  tags?: string[];
  isActive?: boolean;
}

const WorkshopTags: React.FC<WorkshopTagsProps> = ({
  difficulty,
  tags,
  isActive = false
}) => {
  const getDifficultyVariant = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {isActive && (
        <Badge variant="success" className="text-xs">
          Active
        </Badge>
      )}
      {difficulty && (
        <Badge variant={getDifficultyVariant(difficulty)} className="text-xs">
          {difficulty}
        </Badge>
      )}
      {tags?.slice(0, 2).map((tag, index) => (
        <Badge key={index} variant="outline" className="text-xs">
          {tag}
        </Badge>
      ))}
      {tags && tags.length > 2 && (
        <Badge variant="outline" className="text-xs">
          +{tags.length - 2}
        </Badge>
      )}
    </div>
  );
};

export default WorkshopTags;
