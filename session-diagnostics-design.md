# Session Diagnostics Design

## Goal

Add admin-facing diagnostics that explain where a session may have stalled without exposing full participant answer content. The feature should use the existing `session_events` table whenever possible and add only privacy-safe event metadata for participant blockers.

## Privacy boundary

The diagnostics panel should show event types, timestamps, participants, severity, and operational clues such as message length, error stage, participant status, and fallback outcomes. It should not show full participant answer text. Existing private host-message content is already stored in events today; the diagnostics UI will redact content-like keys by default.

## Additional event capture

The participant send path should log these operational events:

| Event | When | Diagnostic value | Payload policy |
|---|---|---|---|
| `participant_message_send_started` | Immediately after send validation passes | Confirms the participant clicked or submitted an answer | Conversation ID, participant ID/name, message length, view mode |
| `participant_message_send_failed` | When saving a participant answer fails | Shows the exact blocker stage and error message | Error message, stage, message length, no answer text |
| `participant_continuation_check_started` | Before the delayed fallback checks whether facilitator continuation is needed | Shows whether the client attempted recovery after a participant response | Expected participants, participant ID |
| `participant_continuation_waiting_for_more_responses` | Fallback sees not all participants answered | Explains stalls caused by waiting for other participants | Respondent count and expected participants |
| `participant_continuation_skipped_assistant_already_replied` | Fallback sees an assistant reply already exists | Confirms no client-side continuation was necessary | Last message role |
| `participant_continuation_triggered` | Fallback invokes facilitator response generation | Shows auto-recovery was attempted | Message count and respondent count |
| `participant_continuation_failed` | Fallback invocation fails | Shows why a session can stop after a few messages | Error message, stage |

## Admin presentation

Add a diagnostics panel to the existing session analytics card because the admin already uses that area to review sessions. The panel should summarize health and list the most recent events in reverse chronological order. It should include a status hint: healthy, warning, or error. Warnings should appear when there are failures, participants paused/skipped, or the last event indicates the flow is waiting for more responses.

## Implementation notes

Create a new hook `useSessionDiagnostics` that reads `session_events`, sanitizes event payloads, and derives timeline rows plus summary counters. Then embed a compact diagnostics section in `SessionAnalyticsDashboard`. This keeps the change frontend-only and avoids database migrations because the event table already exists and is subscribed in the current analytics code.
