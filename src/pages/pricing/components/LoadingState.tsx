
import { Card } from "@/components/ui/card";

export const LoadingState = () => (
  <div className="grid md:grid-cols-3 gap-8">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded w-2/3" />
          <div className="space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-4 bg-gray-200 rounded w-full" />
            ))}
          </div>
        </div>
      </Card>
    ))}
  </div>
);
