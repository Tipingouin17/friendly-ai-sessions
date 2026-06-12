# Full Dev Audit — Finding Classification Register

Author: Manus AI  
Branch: `dev`  
Baseline commit: `d6fda754ad6f34e7bc183372e3017d11608fc933`  
Scope: Development environment behavior, code quality, host/session/participant flows, and UX/process risks. Database data-population completeness is explicitly excluded.

## Classification principles

Findings are classified as **fix-now defects** only when the evidence points to an objective code, security, accessibility, behavior, or consistency issue that can be corrected safely without changing product intent. Findings are classified as **UX/process assessment items** when the issue may be a deliberate product decision, content strategy, support workflow choice, or database-state artifact.

| ID | Area | Evidence | Classification | Proposed Action |
|---|---|---|---|---|
| FDA-001 | Dependency security | `pnpm audit --prod` reports vulnerable transitive `lodash` through `recharts`; installed lockfile resolves `lodash@4.17.23`, which is not a real public lodash release and is suspicious for audit hygiene. | Fix-now defect | Normalize dependency resolution to a safe published lodash version and validate build/audit. |
| FDA-002 | Lint/code quality | ESLint reports unused `react-refresh/only-export-components` disable comments in UI primitives. | Fix-now defect | Remove stale disable comments or allow autofix; rerun lint. |
| FDA-003 | Lint/code quality | ESLint reports unnecessary `maxParticipantsForSession` dependency in a join-session hook effect. | Fix-now defect | Remove invalid dependency and rerun lint. |
| FDA-004 | Participant join copy | Join form and participant waiting-room copy uses **Already joined** even for first-time/current participant state, producing semantically awkward UX after a successful join. | Fix-now UX defect | Replace generic label with clearer current-state wording, without changing behavior or database semantics. |
| FDA-005 | Switch-session menu distinguishability | Host switch-session menu lists repeated session names with only participant count as secondary metadata. This makes similarly named dev/live sessions hard to identify. | Fix-now UX defect | Add safe, non-invasive metadata such as session ID and scheduled/created time to each row. |
| FDA-006 | Invite-link visibility | Host invite UI and QR modal visually truncate the participant link, though copy feedback works. | UX/process assessment | Report for product decision; not fixed unless user wants more supportability affordance such as `Show full link`. |
| FDA-007 | Dashboard tab URL styling ambiguity | Initial note suggested `tab=active` may visually emphasize All Workshops before data resolution. After counts load, this needs broader browser confirmation and may be hydration/timing only. | UX/process assessment | Monitor in follow-up QA; avoid code change until reproduced consistently. |
| FDA-008 | Participant count eventual consistency | Immediately after join, the participant page briefly showed `0 / 2 joined`, then resolved to `1 / 2 joined` with `+1 with you`. | UX/process assessment | Treat as real-time reconciliation/product feedback issue, not database correctness. Consider skeleton/intermediate copy in future. |

## Fix plan for this pass

The safe implementation pass should correct FDA-001 through FDA-005 on the `dev` branch only, then run `pnpm audit --prod`, `pnpm lint`, TypeScript/build gates, and focused regression checks. FDA-006 through FDA-008 should be preserved in the final audit report for product assessment.
