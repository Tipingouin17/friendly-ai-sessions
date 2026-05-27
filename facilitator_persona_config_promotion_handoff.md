# Facilitator Persona Configuration Table — Development Implementation and Promotion Handoff

## Summary

This development branch adds a separate editable database table named `facilitator_persona_configs` connected one-to-one with each facilitator. The purpose is to avoid overloading the `facilitators` table with avatar, voice, identity-presentation, and behavior settings while still making those settings editable in the admin interface.

The implementation is currently on branch `dev/facilitator-persona-config-table`. It has not been promoted to production. The intended promotion path is to review the branch, apply the migration to the development Supabase project, test admin editing there, and only then apply the same migration and deployment to production.

## What Changed

| Area | Change |
|---|---|
| Database | Added migration `supabase/migrations/20260527120000_create_facilitator_persona_configs.sql`. |
| Data model | Added generated-style TypeScript types for `facilitator_persona_configs`. |
| App helper types | Added `DbFacilitatorPersonaConfig` alias and exported facilitator persona interfaces. |
| Admin UI | Updated `FacilitatorManagement.tsx` to fetch, edit, and upsert persona configuration records. |
| Validation | Targeted lint passed for changed files. Development Vite build completed successfully. |

## New Table

The new table is `public.facilitator_persona_configs`. It has a unique `facilitator_id` foreign key referencing `public.facilitators(id)` with cascade delete, which means each facilitator can have at most one persona configuration row and the row is removed automatically if the facilitator is deleted.

| Column | Purpose |
|---|---|
| `facilitator_id` | One-to-one link to the facilitator. |
| `display_name` | Optional override for how the persona appears. |
| `pronouns` | Optional editable pronoun list. |
| `gender_presentation` | Optional presentation label such as `feminine`, `masculine`, `neutral`, `non_binary`, `androgynous`, or `custom`. |
| `voice_id` | Voice model or vendor-specific voice identifier. |
| `voice_provider` | Provider such as OpenAI, ElevenLabs, Azure, HeyGen, or another vendor. |
| `voice_style` | Human-readable voice direction such as warm, calm, energetic, authoritative, or reflective. |
| `avatar_style` | Avatar visual style such as realistic, stylized, professional, or playful. |
| `avatar_asset_url` | Optional URL to a specific avatar asset. |
| `locale` | Locale code for voice/persona behavior, for example `en-US`. |
| `tone` | Default facilitation tone, for example warm, direct, neutral, or coach-like. |
| `animation_preset` | Default animation behavior preset. |
| `nonverbal_behavior` | JSONB settings for gaze, nodding, blinking, posture, and listening cues. |
| `speaking_behavior` | JSONB settings for pace, pauses, interruption restraint, and prosody. |
| `metadata` | Extensible JSONB field for vendor-specific or future settings. |

## Development Validation Completed

The changed files passed targeted lint:

```bash
./node_modules/.bin/eslint src/components/admin/FacilitatorManagement.tsx src/types/database.ts src/types/facilitator.ts src/integrations/supabase/types.ts
```

A development build also completed successfully:

```bash
./node_modules/.bin/vite build --mode development
```

A full repository-wide lint command still fails because the repository already contains many pre-existing lint violations unrelated to this change. The changed files themselves are clean under the targeted lint check.

## Development Test Plan

Before production promotion, apply the migration to the development Supabase project and test the following workflow in the admin UI.

| Test | Expected Result |
|---|---|
| Open facilitator management | Facilitators load normally with no regression. |
| Edit an existing facilitator | Avatar and persona configuration section appears. |
| Save display name, pronouns, gender presentation, voice provider, and voice id | A row is created or updated in `facilitator_persona_configs`. |
| Re-open the same facilitator | Saved persona fields are loaded from the joined persona config table. |
| Create a new facilitator with persona fields | Facilitator is created first, then the matching persona config row is upserted. |
| Delete a facilitator | Persona config row is removed automatically through cascade delete. |
| Query public facilitator listing | Persona config is readable according to the current public-read RLS policy. |

## Production Promotion Plan

Promotion should happen only after development testing is successful.

| Step | Action |
|---|---|
| 1 | Review and merge the development branch through the normal pull request flow. |
| 2 | Apply the Supabase migration to the development database first. |
| 3 | Validate admin create/edit workflows and direct table data. |
| 4 | Deploy the web application to the development/staging environment. |
| 5 | If all checks pass, schedule a production migration window. |
| 6 | Apply the migration to production. |
| 7 | Deploy the application build to production. |
| 8 | Smoke-test facilitator admin editing and public facilitator display. |

## Important Notes

The migration currently allows public read access to persona configurations because facilitator information appears to be used in public-facing facilitator listings. If voice provider identifiers or vendor-specific metadata become sensitive, the RLS policy should be narrowed before production. The editable `gender_presentation` field is intentionally framed as presentation metadata and should not be used as biological sex or as a rigid identity classification.
