
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface WorkshopSetupProps {
  participantCount: number;
  setParticipantCount: (count: number) => void;
  description: string;
  setDescription: (desc: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
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
}: WorkshopSetupProps) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Label htmlFor="participants">Number of Participants</Label>
      <Input
        id="participants"
        type="number"
        min={1}
        max={10}
        value={participantCount}
        onChange={(e) => setParticipantCount(Number(e.target.value))}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="description">Description of Participants</Label>
      <Textarea
        id="description"
        placeholder="Describe your participants..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="language">Preferred Language</Label>
      <Input
        id="language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      />
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox
        id="terms"
        checked={agreed}
        onCheckedChange={(checked) => setAgreed(checked as boolean)}
      />
      <Label htmlFor="terms" className="text-sm">
        I agree to the terms and conditions
      </Label>
    </div>
  </div>
);
