/**
 * Workshop Setup
 *
 * Facilitator component for the AIfacilitator application.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { createLogger } from '@/utils/debugLogger';

const log = createLogger('WorkshopSetup', 'session');
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CalendarClock, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { validateScheduledStartAt } from "@/services/facilitatorService";

const formatLocalDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseLocalDateTime = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

// ── SessionTimePicker ────────────────────────────────────────────────────────
interface SessionTimePickerProps {
  scheduledStartAt: Date | undefined;
  setScheduledStartAt: (date: Date | undefined) => void;
  minScheduleValue: string;
  scheduleValidation: { isValid: boolean; isScheduled: boolean; error?: string };
}

const SessionTimePicker: React.FC<SessionTimePickerProps> = ({
  scheduledStartAt,
  setScheduledStartAt,
  minScheduleValue,
  scheduleValidation,
}) => {
  // isScheduledMode: true only when user has picked a future date (> 1 min ahead)
  const isScheduledMode = React.useMemo(() => {
    if (!scheduledStartAt) return false;
    const diffMs = scheduledStartAt.getTime() - Date.now();
    return diffMs > 60_000;
  }, [scheduledStartAt]);

  const handleSelectNow = () => {
    // Pass undefined so validateScheduledStartAt returns { isValid: true, isScheduled: false }
    setScheduledStartAt(undefined);
  };

  const handleSelectSchedule = () => {
    // Default to tomorrow at the same hour, rounded to the next 30 min
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() >= 30 ? 60 : 30, 0, 0);
    setScheduledStartAt(tomorrow);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-3 text-left">Session date and time</label>

      {/* Toggle pill */}
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1 mb-3">
        <button
          type="button"
          onClick={handleSelectNow}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            !isScheduledMode
              ? 'bg-white shadow-sm text-indigo-700 border border-indigo-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="text-base">⚡</span>
          Start Now
        </button>
        <button
          type="button"
          onClick={handleSelectSchedule}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            isScheduledMode
              ? 'bg-white shadow-sm text-indigo-700 border border-indigo-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          Schedule for Later
        </button>
      </div>

      {/* Datetime picker — only shown in scheduled mode */}
      {isScheduledMode && scheduledStartAt && (
        <div className="space-y-1.5">
          <div className="relative">
            <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="datetime-local"
              value={(() => {
                const pad = (n: number) => String(n).padStart(2, '0');
                const d = scheduledStartAt;
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
              })()}
              min={minScheduleValue}
              onChange={(e) => {
                const parsed = new Date(e.target.value);
                if (!Number.isNaN(parsed.getTime())) setScheduledStartAt(parsed);
              }}
              className={scheduleValidation.isValid ? 'pl-10' : 'border-red-500 pl-10'}
              aria-invalid={!scheduleValidation.isValid}
            />
          </div>
          {!scheduleValidation.isValid ? (
            <p className="text-xs text-red-600" role="alert">{scheduleValidation.error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Participants will receive an invitation with this scheduled time.
            </p>
          )}
        </div>
      )}

      {/* "Start Now" confirmation hint */}
      {!isScheduledMode && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          The session will open immediately when you click <strong>Create Session</strong>.
        </p>
      )}
    </div>
  );
};

interface WorkshopSetupProps {
  participantCount: number;
  setParticipantCount: (count: number) => void;
  description: string;
  setDescription: (description: string) => void;
  language: string;
  setLanguage: (language: string) => void;
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
  durationMinutes: number | "";
  setDurationMinutes: (v: number | "") => void;
  defaultDurationMinutes?: number | null;
  scheduledStartAt: Date | undefined;
  setScheduledStartAt: (date: Date | undefined) => void;
}

export const WorkshopSetup = ({
  participantCount,
  setParticipantCount,
  description,
  setDescription,
  language,
  setLanguage,
  agreed,
  setAgreed,
  durationMinutes,
  setDurationMinutes,
  defaultDurationMinutes,
  scheduledStartAt,
  setScheduledStartAt,
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
  
  // Workshop setup collects attendee count; facilitatorService stores attendees + 1 host.
  const selectedAttendeeCount = participantCount;
  const planAttendeeLimit = maxParticipants;
  const limitReached = selectedAttendeeCount >= planAttendeeLimit;
  const minScheduleValue = formatLocalDateTime(new Date());
  const scheduleValidation = validateScheduledStartAt(scheduledStartAt);
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2 text-left">
          Number of participants 
          {!isLoading && <span className="text-muted-foreground ml-1">(Max: {maxParticipants === Infinity ? 'Unlimited' : maxParticipants})</span>}
        </label>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" aria-label="Decrease participant count" onClick={handleDecrement} disabled={participantCount <= 1}>
            -
          </Button>
          <span className="text-xl font-semibold">{participantCount}</span>
          <Button variant="outline" size="icon" aria-label="Increase participant count" onClick={handleIncrement} disabled={limitReached}>
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
          <label className="block text-sm font-medium text-left">Description of the participants <span className="text-red-500">*</span></label>
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
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
            <SelectItem value="ar">Arabic</SelectItem>
          </SelectContent>
        </Select>
      </div>


      <SessionTimePicker
        scheduledStartAt={scheduledStartAt}
        setScheduledStartAt={setScheduledStartAt}
        minScheduleValue={minScheduleValue}
        scheduleValidation={scheduleValidation}
      />

      <div>
        <label className="block text-sm font-medium mb-2 text-left">
          Session Duration (minutes)
        </label>
        <Input
          type="number"
          min={5}
          max={480}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={defaultDurationMinutes ? `Default: ${defaultDurationMinutes} min` : "e.g. 60 (optional)"}
        />
        {durationMinutes !== "" && (Number(durationMinutes) < 5 || Number(durationMinutes) > 480) && (
          <p className="text-xs text-red-600 mt-1" role="alert">Duration must be between 5 and 480 minutes.</p>
        )}
        {(durationMinutes === "" || (Number(durationMinutes) >= 5 && Number(durationMinutes) <= 480)) && (
          <p className="text-xs text-muted-foreground mt-1">
            The AI facilitator will begin wrapping up 10 minutes before the session ends.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="terms" checked={agreed} onCheckedChange={checked => setAgreed(checked as boolean)} />
        <label htmlFor="terms" className="text-sm text-left">
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            terms and conditions
          </a>
        </label>
      </div>
    </div>
  );
};
