# Streaming Facilitator — Next Dev-Branch Implementation Slice

This slice remains **dev-branch-only** and keeps all visible behavior feature-flagged. The goal is to make the newly added stream-aware facilitator foundation observable in the real participant room without changing the UX redesign contract or enabling production behavior.

## Scope

The implementation will expose the runtime snapshot and avatar-state recommendation through the existing session context, thread it down to the participant messaging view, and render the facilitator picture with subtle state-driven animation only when the avatar runtime flag is enabled. The stream interpreter will also emit an internal `avatar_state_changed` runtime event when the recommended avatar state changes, so future backend workers, dashboards, and avatar providers can subscribe to the same provider-neutral contract.

## Non-goals

This slice will not call an LLM, generate facilitator speech, add a vendor avatar provider, or redesign the page. It will not alter production behavior unless `VITE_STREAMING_FACILITATOR=true` and `VITE_AVATAR_STATE_RUNTIME=true` are explicitly enabled in a dev or preview environment.

## Acceptance criteria

| Area | Acceptance criteria |
|---|---|
| Runtime state | `SessionContextProps` exposes optional `facilitatorRuntime` data without breaking existing callers. |
| Avatar UI | Participant header can use the facilitator picture and state-driven CSS animation behind the avatar feature flag. |
| Persistence | Runtime service can persist `avatar_state_changed` events when persistence is enabled and avoids duplicate events for unchanged state. |
| QA | Existing build/type checks pass, and deterministic tests cover partial input, token risk, and avatar event deduplication. |
