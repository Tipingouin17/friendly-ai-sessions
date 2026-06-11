# AIFacilitator Audit Stabilization Implementation Plan

## Objective

This implementation program converts the external audit findings into a controlled development-branch stabilization release. The work is intentionally sequenced from **security and trust-boundary risks** to **session lifecycle correctness**, then **live-session reliability**, **onboarding/referral UX**, and finally **visual polish**. Production promotion remains out of scope until the development branch has passed automated validation, scenario-based QA, and a preview smoke test.

## Release principles

| Principle | Implementation rule |
| --- | --- |
| Defense in depth | Critical validations must exist in shared utilities and service boundaries, not only in visible form components. |
| Canonical lifecycle | Session state should be derived from durable timestamps and explicit status fields rather than stale client state. |
| Revocation over hiding | Removing a participant must revoke future access, not merely hide the participant tile. |
| Non-enumerating auth | Password reset messaging must avoid disclosing whether an email is registered while remaining clear and useful. |
| QA before promotion | `dev` must pass static checks, production build, targeted regression scripts, and manual scenario testing before any production action. |

## Implementation backlog

| Priority | Workstream | Changes to implement in development |
| --- | --- | --- |
| P0/P1 | Authentication | Enforce strong password complexity; normalize and reject whitespace-only names; align password guidance and reset messaging. |
| P0/P1 | Scheduling | Reject past schedule dates in the setup UI and service layer; normalize immediate versus scheduled creation behavior; constrain duration values. |
| P0/P1 | Session lifecycle | Calculate duration from actual `session_started_at` where available; mark ended sessions consistently; invalidate active and past dashboard queries immediately. |
| P0/P1 | Participant access | Persist revocation evidence for removed participants and block same-device rejoin after removal; surface clear removal feedback. |
| P2 | Dashboard | Preserve historical analytics after participant removal; clarify engagement metric fallbacks; improve alignment of active/past cards. |
| P2 | Referral | Validate empty invite lists and malformed emails before invite submission; surface delivery warnings consistently. |
| P2/P3/P4 | UX polish | Improve loading alignment, date-time field affordance, low-contrast labels, spacing, empty states, and non-functional controls where localized fixes are safe. |

## Engineering acceptance gates

| Gate | Command or evidence |
| --- | --- |
| Type safety | `npx tsc --noEmit` passes. |
| Production bundle | `npm run build` passes. |
| Lint | `npm run lint` has no new errors; existing warnings must be documented. |
| Targeted logic regression | A dedicated audit-stabilization script verifies validation, scheduling, duration, and participant-revocation helper behavior. |
| Manual QA scenarios | Authentication, scheduling, closure, participant removal, dashboard, referral, and live-session scenarios are documented with expected results and execution notes. |

## Initial implementation slice

The first development slice will focus on changes that can be implemented safely in the current frontend/service code without destructive database migrations: shared input validation, scheduling guards, duration calculation, participant revocation metadata, dashboard copy/alignment, and QA automation. Backend-only items such as email-provider deliverability, WebRTC transport-level defects, and durable database constraints will be documented as follow-up work if the current repository does not contain the deployable server implementation required to fix them safely.
