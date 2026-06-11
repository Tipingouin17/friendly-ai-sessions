# AIFacilitator Audit Stabilization QA Script

## Purpose and scope

This document defines the **development-branch QA script** for the audit stabilization release. It covers the functional areas remediated from the audit: authentication validation, password-reset copy, workshop scheduling, session duration and closure, participant removal and access revocation, scheduled invitations, and dashboard consistency. The objective is to prove that the application now behaves predictably at trust boundaries and that the fixes are regression-testable before any production promotion.

The test script is intentionally written as an operator-ready checklist. Each scenario should be executed against the development preview after the code has passed static validation and the targeted regression suite. Evidence should include the tester name, timestamp, browser, account used, test data, screenshots where relevant, and pass/fail notes.

## Automated validation gate

| Gate | Command | Expected result | Evidence to retain |
| --- | --- | --- | --- |
| TypeScript type safety | `npx tsc --noEmit` | The command exits with code `0`. | Terminal output. |
| Production bundle | `npm run build` | Vite and SEO page generation complete without errors. | Terminal output and build timestamp. |
| Lint | `npm run lint` | No errors. Any pre-existing warnings must be listed in the QA report. | Terminal output. |
| Audit regression logic | `pnpm test:audit-stabilization` | All targeted validation, scheduling, lifecycle, and revocation checks pass. | Terminal output. |

## Functional QA matrix

| Area | Audit risk addressed | Primary user role | Acceptance standard |
| --- | --- | --- | --- |
| Signup validation | Weak passwords and whitespace-only account names. | New facilitator | Invalid names/passwords are blocked before account creation with clear guidance. |
| Password reset | User enumeration through reset feedback. | Existing or unknown user | Reset copy is consistent and does not disclose account existence. |
| Scheduling | Past-date scheduled sessions and ambiguous immediate versus scheduled behavior. | Host | Past schedules are blocked, near-immediate starts behave as ad hoc, and future schedules persist as scheduled. |
| Session lifecycle | Inconsistent ended status, duration, and dashboard metrics. | Host | Ended sessions use canonical start/end timestamps and refresh dashboard views. |
| Participant removal | Removed participants could remain active or rejoin. | Host and participant | Removal ejects the participant and blocks same-device rejoin with clear copy. |
| Scheduled invitations | Empty, malformed, or duplicate invitee lists. | Host | Invalid rows are highlighted and cannot be saved or sent. |
| Dashboard history | Historical analytics after removal and closure. | Host/admin | Past-session cards remain readable and display consistent duration/status context. |

## Scenario 1: Signup name and password hardening

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open the development signup page in a clean browser profile. | The signup form loads without console errors. |
| 2 | Enter a name made only of spaces, a valid email, and `Strong!234`. | Submission is blocked and the name requirement is visible. |
| 3 | Enter `Ada    Lovelace` with extra spaces, a mixed-case email, and `weakpass`. | Submission is blocked and password requirements identify missing uppercase, number, or special character. |
| 4 | Enter `Ada    Lovelace`, `ADA+qa@example.com`, and `Strong!234`. | Client-side validation accepts the form. The normalized name should not preserve repeated spaces in profile metadata. |

The tester should capture screenshots for the invalid-name state and the password-requirement state. If account creation is performed, the account should be a disposable QA account and removed after testing where possible.

## Scenario 2: Password reset anti-enumeration copy

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open the forgot-password page. | The page loads with clear instructions. |
| 2 | Submit an invalid email format. | The application rejects the request locally with valid-email guidance. |
| 3 | Submit an unregistered but syntactically valid email. | The success message uses neutral copy indicating that instructions will be sent if the account exists. |
| 4 | Submit a registered QA email. | The visible success message remains materially the same as the unregistered case. |

This scenario passes only if account existence cannot be inferred from the UI copy, toast title, timing-sensitive UI state, or error state.

## Scenario 3: Scheduling guardrails

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Start creating a workshop from the facilitator setup flow. | The setup wizard loads and accepts ordinary workshop details. |
| 2 | Select a scheduled date/time five minutes in the past. | The UI prevents creation and shows a clear message that scheduled sessions must use a future date/time. |
| 3 | Select a start time less than one minute in the future. | The flow treats the session as immediate/ad hoc rather than incorrectly persisting a scheduled invitation draft. |
| 4 | Select a start time ten minutes in the future. | The session is created with scheduled context and sends the host to the scheduled invitation/waiting flow as designed. |
| 5 | Try boundary duration values below the minimum and above the maximum if the duration control is visible. | Invalid durations are blocked and valid durations are rounded to the nearest minute. |

Evidence should include a screenshot of the past-date rejection and the resulting scheduled-session summary for the valid future case.

## Scenario 4: Scheduled invitation validation

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open the scheduled invitation page for a future scheduled session. | The invitee roster and email draft fields load. |
| 2 | Leave all invitee rows empty and click the primary action. | The primary action is disabled or submission is blocked with an instruction to add at least one participant. |
| 3 | Add one row with a valid name and malformed email. | The row is highlighted, the error text identifies the invalid email, and submission remains disabled. |
| 4 | Add two rows with the same valid email. | Both relevant rows are treated as invalid because invitation emails must be unique. |
| 5 | Add two rows with visible names and unique valid emails. | The form can be saved. If verification is unavailable, the UI says the roster is saved and email handoff is skipped. |

The tester should verify that the UI and service-layer errors agree. A direct API or mocked service call with duplicate emails should also fail rather than silently deduplicating.

## Scenario 5: Session closure and canonical duration

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create and start a short QA workshop with at least one participant. | The host view shows an active session and `session_started_at` is persisted. |
| 2 | Allow the session to run for at least two minutes, then end it through the normal host control. | The closure succeeds without a visible error. |
| 3 | Open the Past Workshops dashboard. | The session appears as ended and its duration is based on actual start and end timestamps, not only creation time. |
| 4 | Refresh the dashboard. | The duration/status remain stable after reload. |
| 5 | If a report-generating closure path is available, repeat closure through that path. | Both closure modes produce consistent status and duration behavior. |

This scenario passes when active dashboard data and past dashboard data update without requiring manual cache clearing.

## Scenario 6: Live participant removal and rejoin denial

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Join a live QA session as a participant in a second browser or private window. | The participant can contribute normally before removal. |
| 2 | From the host view, remove that participant. | The participant is immediately ejected or navigated away with clear access-revoked copy. |
| 3 | Attempt to rejoin from the same browser/device using the same join link and name. | The backend denies access and the UI surfaces the revoked-access message. |
| 4 | Join from a different QA identity/device if allowed by the test design. | A different participant is not incorrectly blocked unless the facilitator removes them too. |
| 5 | Open dashboard/history views after removal. | Historical metrics remain coherent and the removed participant does not appear as an active participant. |

This scenario is critical because it verifies **revocation rather than host-only hiding**. Evidence should include host-side removal state, participant-side ejection message, and the failed same-device rejoin attempt.

## Scenario 7: Dashboard consistency after remediation

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open the host dashboard after creating immediate, scheduled, demo, and ended QA sessions. | Cards are aligned and badges remain readable at desktop and mobile widths. |
| 2 | Open a session details panel from Past Workshops. | Session type, initiator, scheduling state, status, timestamps, and conversation ID are visible. |
| 3 | Compare an ended session with removed participants against its live-session history. | Duration and engagement fallbacks remain explainable and do not show impossible values. |
| 4 | Reload the page and repeat. | The same data appears without stale active-session artifacts. |

Screenshots should be collected at desktop width and a narrow mobile viewport.

## Scenario 8: Regression smoke checks

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Visit the public homepage and facilitator list. | Pages load with HTTP 200 and no critical console errors. |
| 2 | Log in as a QA facilitator. | Authentication completes and protected routes remain accessible. |
| 3 | Create an ad hoc session without using scheduling. | The existing immediate-session path remains functional. |
| 4 | Start, join, message, and close a session. | The critical live-session loop remains operational after the remediation changes. |

## Defect triage rule

A defect found during this QA run should be classified by release impact rather than cosmetic preference. **Blockers** are defects that prevent signup, login, workshop creation, participant join, participant removal, or session closure. **High-priority defects** are defects that allow invalid data, stale revoked access, misleading dashboard state, or broken scheduled invitations. **Medium-priority defects** are visible UX inconsistencies that do not compromise trust boundaries. **Low-priority defects** are copy, spacing, or visual polish items that do not affect successful completion of the workflow.

## Sign-off template

| Field | Value |
| --- | --- |
| Development commit | To be filled after commit. |
| Development preview URL | To be filled after deployment. |
| Test operator |  |
| Test date/time |  |
| Browser/device |  |
| Automated checks passed | Yes / No |
| Manual scenarios passed | Yes / No |
| Open blockers |  |
| Production promotion recommendation | Promote / Do not promote |
