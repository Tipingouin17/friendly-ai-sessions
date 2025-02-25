
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Number of participants</label>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setParticipantCount(Math.max(1, participantCount - 1))}
          >
            -
          </Button>
          <span className="text-xl font-semibold">{participantCount}</span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setParticipantCount(participantCount + 1)}
          >
            +
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description of the participants</label>
        <Textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Describe your participants..." 
          className="min-h-[100px]" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Facilitator's language</label>
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
        <Checkbox 
          id="terms" 
          checked={agreed} 
          onCheckedChange={checked => setAgreed(checked as boolean)} 
        />
        <label htmlFor="terms" className="text-sm">
          I agree to the{" "}
          <a href="#" className="text-primary hover:underline">
            terms and conditions
          </a>
        </label>
      </div>
    </div>
  );
};
