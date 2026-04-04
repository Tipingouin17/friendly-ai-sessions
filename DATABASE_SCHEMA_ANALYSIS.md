# Database Schema Analysis — Alfacilitator
*Generated: 2026-04-04*

This report audits every table and column in the database against actual frontend and backend usage. Each field is classified as **Active**, **Partially Used**, **Unused/Obsolete**, or **Missing** (fields that are needed but do not exist).

---

## Summary

| Status | Count |
|---|---|
| Active (used correctly) | ~65 fields |
| Partially used (set but never read, or read but never set) | 9 fields |
| Unused / Obsolete (in schema, never queried) | 22 fields |
| Missing (needed but absent) | 6 fields |
| Redundant tables (duplicated functionality) | 2 tables |

---

## Table-by-Table Analysis

### `conversations`

| Column | Status | Notes |
|---|---|---|
| `id` | Active | Primary key, used everywhere |
| `user_id` | Active | Host identity, used for RLS and session ownership |
| `created_at` | Active | Displayed in PastWorkshops |
| `participants` | Active | Max participant cap, used in join flow |
| `participant_description` | Active | Passed to AI as context |
| `language` | Active | Passed to AI for response language |
| `sessions_id` | Active | FK to sessions, used in join query |
| `is_saved` | Active | Save/unsave in PastWorkshops |
| `is_session_ended` | Active | Gates session access |
| `status` | Active | Used in join flow and session state |
| `updated_at` | Active | Used in PastWorkshops sorting |
| `ended_at` | Active | Displayed in session report |
| `current_participants` | Active | Live count in join page and session header |
| `session_started` | Active | Gates welcome message generation |
| `total_messages` | Active | Displayed in PastWorkshops and admin monitoring |
| `participant_engagement_score` | Active | Displayed in session report and PastWorkshops |
| `session_duration_minutes` | Active | Displayed in session report and admin analytics |
| `final_report_id` | Partially used | Set when report is generated, but never read back to link to a specific `session_reports` row — the report is fetched by `conversation_id` instead |
| `join_token` | Active | Used for anonymous participant auth |
| `welcome_message_status` | Active | Controls welcome message generation flow |
| `flow_config` | **Unused** | JSON field, never read or written anywhere in frontend or backend |
| `engagement_metrics` | **Unused** | JSON field, never read or written anywhere |
| `conversation_memory` | **Unused** | JSON field, never read or written anywhere |
| `accept_terms_and_conditions` | Partially used | Set on conversation creation, never read back for any gate or display |

**Recommendation:** Drop `flow_config`, `engagement_metrics`, and `conversation_memory` — they appear to be aspirational fields from an earlier design that was never implemented. `accept_terms_and_conditions` should either be enforced (gate session creation) or removed.

---

### `sessions`

| Column | Status | Notes |
|---|---|---|
| `id` | Active | Primary key |
| `facilitator` | Active | FK to facilitators |
| `title` | Active | Displayed throughout the app |
| `scope` | Active | Passed to AI as session scope context |
| `gpt_version` | Active | Used by backend to select AI model (mapped via `GPT_MODEL_MAP`) |
| `max_tokens` | Active | Used by backend as `max_tokens` for OpenAI call |
| `randomness` | Active | Used by backend as `temperature` for OpenAI call |
| `prompt` | Active | Core system prompt for AI facilitator |
| `welcome_message` | Active | Shown to participants at session start |
| `objective` | Active | Displayed in session info panel and host sidebar |
| `session_type` | Active | Used in session report badge and welcome message generation |
| `status` | Active | Gates session visibility in facilitator selection |
| `created_at` | Active | Used in admin prompt management |
| `difficulty_level` | Active | Displayed in admin prompt management and PastWorkshops |
| `tags` | Active | Displayed in PastWorkshops |
| `output_format` | **Unused** | Never read in frontend or backend — the AI output format is controlled by the `prompt` field instead |
| `lock` | **Unused** | Never read anywhere in the frontend or backend |
| `icon_type` | Partially used | Read in `WorkshopSelection` for the facilitator selection carousel, but not in the session view itself |
| `skill_level` | **Unused** | Never read in frontend or backend (different from `difficulty_level` which IS used) |
| `duration_minutes` | Partially used | Stored but only displayed in session report — not used to enforce any time limit |
| `prerequisites` | **Unused** | Never read in frontend or backend |
| `learning_outcomes` | **Unused** | Never read in frontend or backend |
| `category_id` | **Unused** | FK to `categories` table, but `categories` is never queried anywhere |

**Recommendation:** Drop `output_format`, `lock`, `skill_level`, `prerequisites`, `learning_outcomes`, and `category_id` (along with the `categories` table). These were added for a course-catalogue feature that was never built. `duration_minutes` should either enforce a time limit or be renamed to `estimated_duration_minutes` to clarify it is advisory only.

---

### `facilitators`

| Column | Status | Notes |
|---|---|---|
| `id` | Active | Primary key |
| `title` | Active | Displayed as facilitator name throughout the app |
| `profile_picture` | Active | Displayed in chat header, join page, and session info panel |
| `details` | Active | Used in welcome message generation and session info panel |
| `user_id` | Active | Ownership for RLS |
| `description` | Active | Fallback for `details` in welcome message generation |
| `specialties` | Active | Used in welcome message generation |
| `expertise_level` | Active | Used in welcome message generation |
| `languages` | Partially used | Stored, but only used to filter facilitators in the carousel — never surfaced to participants |
| `plan_id` | Partially used | Used to gate facilitator access by plan tier in the carousel, but this logic belongs in `plan_restrictions` |
| `is_promoted` | **Unused** | Never read anywhere |
| `lock` | **Unused** | Never read anywhere |
| `order` | **Unused** | Never read anywhere — facilitators are not sorted by this field |
| `rating` | **Unused** | Never read or written anywhere |
| `total_sessions` | **Unused** | Never read or written anywhere |
| `last_active` | **Unused** | Never read or written anywhere |
| `version` | **Unused** | Never read or written anywhere |
| `config_history` | **Unused** | JSON field, never read or written anywhere |

**Recommendation:** Drop `is_promoted`, `lock`, `order`, `rating`, `total_sessions`, `last_active`, `version`, and `config_history`. These appear to be a marketplace-style facilitator rating system that was designed but never implemented. The `plan_id` gate on facilitators should be migrated to `plan_restrictions.facilitator_limit` for consistency.

---

### `messages`

| Column | Status | Notes |
|---|---|---|
| `id` | Active | Primary key |
| `content` | Active | Message text |
| `role` | Active | `assistant`, `user`, `admin` — maps to sender |
| `created_at` | Active | Message timestamp |
| `conversation_id` | Active | FK to conversations |
| `participant_id` | Active | FK to session_participants |
| `name` | Active | Participant name stored on message for display |
| `facilitator_id` | **Unused** | Never read anywhere — the facilitator is identified via `conversation → sessions → facilitator`, not via this column |
| `user_id` | **Unused** | Never read anywhere — anonymous participants have no `user_id`, and the host is identified by `role='admin'` |
| `updated_at` | **Unused** | Never read anywhere — messages are immutable |

**Recommendation:** Drop `facilitator_id`, `user_id`, and `updated_at` from `messages`. These add noise and confusion (e.g., `user_id` on a message from an anonymous participant is always null, yet the column exists).

---

### `session_participants`

| Column | Status | Notes |
|---|---|---|
| `id` | Active | Primary key |
| `conversation_id` | Active | FK to conversations |
| `participant_id` | Active | Unique participant number within the conversation |
| `name` | Active | Participant display name |
| `avatar_seed` | Active | Used to render deterministic avatars |
| `created_at` | Active | Join timestamp |
| `is_anonymous` | Active | Controls name display in chat |
| `is_host` | Active | Identifies the host participant row |

**Status: All columns are active.** ✅

---

### `session_events`

| Column | Status | Notes |
|---|---|---|
| `id` | Active | Primary key |
| `conversation_id` | Active | FK to conversations |
| `event_type` | Active | Used for `participant_waiting` (new) and other event types |
| `data` | Active | JSON payload for the event |
| `created_at` | Active | Event timestamp |

**Status: All columns are active.** ✅ The table is now also used for the new "notify host when session is full" feature.

---

### `session_reports`

| Column | Status | Notes |
|---|---|---|
| `id` | Active | Primary key |
| `conversation_id` | Active | FK to conversations |
| `report_content` | Active | Markdown report text, displayed in SessionReportView |
| `report_type` | Partially used | Set to `'ai_generated'`, but never used to filter or branch |
| `generated_at` | Active | Displayed in report |
| `generated_by` | **Unused** | Never read anywhere |
| `metadata` | **Unused** | JSON field, never read or written anywhere |
| `file_url` | **Unused** | Never read or written — PDF export is done client-side |
| `file_size` | **Unused** | Never read or written |

**Recommendation:** Drop `generated_by`, `metadata`, `file_url`, and `file_size`. These were designed for a server-side PDF export feature that was never implemented (PDF export is currently done client-side via the browser print dialog).

---

### `feedback`

| Column | Status | Notes |
|---|---|---|
| `id` | Active | Primary key |
| `conversation_id` | Partially used | FK, but the table is never queried |
| `user_id` | Partially used | Same |
| `rating` | **Unused** | Never read or written anywhere in the frontend |
| `content` | **Unused** | Same |
| `facilitator_knowledge` | **Unused** | Same |
| `session_pace` | **Unused** | Same |
| `material_quality` | **Unused** | Same |
| `created_at` | **Unused** | Same |

**Recommendation:** The entire `feedback` table is unused. Either implement a post-session feedback form (which would be a valuable feature), or drop the table. The `participant_engagement_score` on `conversations` is the only engagement metric currently in use.

---

### `sessions_history`

| Column | Status | Notes |
|---|---|---|
| All columns | **Unused** | The entire table is never queried anywhere in the frontend or backend |

**Recommendation:** Drop the entire `sessions_history` table. Historical session data is already captured in `conversations` (with `ended_at`, `session_duration_minutes`, `total_messages`, `participant_engagement_score`). This table duplicates that data without being populated.

---

### `admin_notifications`

| Column | Status | Notes |
|---|---|---|
| All columns | **Unused** | The entire table is never queried anywhere |

**Recommendation:** Drop the entire `admin_notifications` table. Admin notifications are now handled via `session_events` (e.g., `participant_waiting`). This table is a legacy artefact.

---

### `conversations_config`

| Column | Status | Notes |
|---|---|---|
| All columns | **Unused** | The entire table is never queried anywhere in the frontend or backend |

**Recommendation:** Drop the entire `conversations_config` table. Per-session AI configuration is stored directly on `sessions` (`prompt`, `gpt_version`, `max_tokens`, `randomness`). This table appears to be a legacy system-prompt configuration table that was superseded.

---

### `categories`

| Column | Status | Notes |
|---|---|---|
| All columns | **Unused** | The entire table is never queried anywhere — `sessions.category_id` FK is also unused |

**Recommendation:** Drop the entire `categories` table and the `sessions.category_id` FK column.

---

### `configurations`

| Column | Status | Notes |
|---|---|---|
| `id` | — | — |
| `default_gpt_token` | **Unused** | Never read in frontend or backend |
| `languages` | **Unused** | Never read anywhere |
| `default_currency` | **Unused** | Currency is hardcoded or comes from `plans.currency` |
| `google_capcha_key` | **Unused** | No reCAPTCHA implementation exists |
| `secret_message` | **Unused** | Never read anywhere |
| `free_plan_message_limit` | **Unused** | Message limits are enforced via `plan_restrictions.question_limit`, not this table |

**Recommendation:** Drop the entire `configurations` table. All its intended purposes are either handled elsewhere (`plan_restrictions`, `sessions`) or were never implemented.

---

### `plan_features` (view)

| Status | Notes |
|---|---|
| **Unused** | The app uses `plan_restrictions` for all plan gating. `plan_features` is a redundant view that duplicates some of the same columns. It is never queried. |

**Recommendation:** Drop `plan_features`. Use only `plan_restrictions` for plan enforcement.

---

### Active and Healthy Tables (no changes needed)

| Table | Notes |
|---|---|
| `plans` | Active — used for pricing page and checkout |
| `plan_restrictions` | Active — used for all plan gating |
| `profiles` | Active — user auth and subscription state |
| `login_activity` | Active — displayed in user profile security tab |
| `user_sessions` | Active — displayed in user profile device management |
| `security_audit_log` | Active — written by `useSecurityAudit` hook |
| `contact_form` | Active — written by Contact page |
| `faqs` | Active — read by FAQs page |
| `admin_profiles_view` | Active — used in admin user management |

---

## Missing Fields (Needed but Absent)

| Table | Missing Column | Reason Needed |
|---|---|---|
| `conversations` | `host_name` | The host's display name is never stored — the host sidebar shows the user's email instead of a name |
| `conversations` | `share_url` | The shareable join URL is constructed client-side every time — storing it would allow analytics and QR code regeneration |
| `session_participants` | `left_at` | No way to know when a participant left — needed for accurate `session_duration_minutes` per participant and for the "spot opened" auto-refresh feature |
| `session_participants` | `device_type` | Useful for diagnosing mobile vs. desktop issues (like the ones fixed in this sprint) |
| `session_events` | `participant_id` | Currently `data` is a free JSON blob — adding a typed FK would allow querying events by participant |
| `messages` | `is_pinned` | The host can pin messages (the `AdminMessageInput` component has `isPinned` param), but there is no column to store this state — pinned messages are lost on reload |

---

## Recommended Migration Script (Summary)

```sql
-- Drop unused columns
ALTER TABLE conversations   DROP COLUMN flow_config, DROP COLUMN engagement_metrics, DROP COLUMN conversation_memory;
ALTER TABLE sessions        DROP COLUMN output_format, DROP COLUMN lock, DROP COLUMN skill_level, DROP COLUMN prerequisites, DROP COLUMN learning_outcomes, DROP COLUMN category_id;
ALTER TABLE facilitators    DROP COLUMN is_promoted, DROP COLUMN lock, DROP COLUMN "order", DROP COLUMN rating, DROP COLUMN total_sessions, DROP COLUMN last_active, DROP COLUMN version, DROP COLUMN config_history;
ALTER TABLE messages        DROP COLUMN facilitator_id, DROP COLUMN user_id, DROP COLUMN updated_at;
ALTER TABLE session_reports DROP COLUMN generated_by, DROP COLUMN metadata, DROP COLUMN file_url, DROP COLUMN file_size;

-- Drop unused tables
DROP TABLE sessions_history;
DROP TABLE admin_notifications;
DROP TABLE conversations_config;
DROP TABLE categories;
DROP TABLE configurations;
DROP TABLE feedback;          -- unless feedback form is implemented
DROP VIEW  plan_features;

-- Add missing columns
ALTER TABLE conversations       ADD COLUMN host_name TEXT;
ALTER TABLE conversations       ADD COLUMN share_url TEXT;
ALTER TABLE session_participants ADD COLUMN left_at TIMESTAMPTZ;
ALTER TABLE session_participants ADD COLUMN device_type TEXT;
ALTER TABLE messages            ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
```

> **Note:** Run all `DROP` statements only after verifying no external services (e.g., Supabase Edge Functions, external analytics pipelines) depend on these columns. The `feedback` table drop should be deferred until a decision is made on whether to implement a post-session feedback form.
