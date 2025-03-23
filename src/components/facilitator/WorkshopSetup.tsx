
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkshopSetupProps {
  participantCount: number;
  setParticipantCount: (count: number) => void;
  description: string;
  setDescription: (description: string) => void;
  language: string;
  setLanguage: (language: string) => void;
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
}

export const WorkshopSetup = ({
  participantCount,
  setParticipantCount,
  description,
  setDescription,
  language,
  setLanguage,
  agreed,
  setAgreed
}: WorkshopSetupProps) => {
  const navigate = useNavigate();
  const {
    maxParticipants,
    hasReachedParticipantLimit,
    isLoading
  } = usePlanLimits();
  
  const handleIncrement = () => {
    if (participantCount < maxParticipants) {
      setParticipantCount(participantCount + 1);
    }
  };
  
  const handleDecrement = () => {
    setParticipantCount(Math.max(1, participantCount - 1));
  };
  
  const handleUpgradePlan = () => {
    navigate('/pricing');
  };
  
  const limitReached = participantCount >= maxParticipants;
  
  return <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2 text-left">
          Number of participants 
          {!isLoading && <span className="text-muted-foreground ml-1">(Max: {maxParticipants === Infinity ? 'Unlimited' : maxParticipants})</span>}
        </label>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleDecrement} disabled={participantCount <= 1}>
            -
          </Button>
          <span className="text-xl font-semibold">{participantCount}</span>
          <Button variant="outline" size="icon" onClick={handleIncrement} disabled={limitReached}>
            +
          </Button>
        </div>
        
        {limitReached && <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached your plan's participant limit. 
              <Button variant="link" className="p-0 h-auto ml-1" onClick={handleUpgradePlan}>
                Upgrade for more participants.
              </Button>
            </AlertDescription>
          </Alert>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-left">Description of the participants</label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Describe your participants (e.g., "Marketing team members", "Engineering students", "Executive team") to help the AI facilitator adapt its language and examples.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          placeholder="Describe your participants (e.g., job roles, expertise level, background)..." 
          className="min-h-[100px]" 
        />
        <p className="text-xs text-muted-foreground mt-1">
          This helps the AI facilitator adapt its approach to your audience.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-left">Facilitator's language</label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger>
            <SelectValue placeholder="Select a language" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Spanish">Spanish</SelectItem>
            <SelectItem value="French">French</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="terms" checked={agreed} onCheckedChange={checked => setAgreed(checked as boolean)} />
        <label htmlFor="terms" className="text-sm text-left">
          I agree to the{" "}
          <a href="#" className="text-primary hover:underline">
            terms and conditions
          </a>
        </label>
      </div>
    </div>;
};
