# Supabase Migration Evidence — 2026-10-05

Project: `t1d-heal` (`jwslcxgnwlsqbrtmmqvf`) · Operator: agent `type-1-diabetes` (owner-provided access token) · Method: Supabase Management API (`/v1/projects/{ref}/database/query`, statement-by-statement).

## Migrations applied (in order)

1. `20261005000009_rls_helper_catchup.sql` — NEW catch-up: creates `is_patient_parent`, `is_assigned_clinician`, `is_care_team_clinician` (SECURITY DEFINER helpers); rewrites all remaining cross-table RLS policies to recursion-safe helper form; revokes trigger-function RPC execution.
2. `20260821000007_audit_hardening.sql` — care_team RLS hardening (was outstanding from the Aug 22 audit).
3. `20261005000008_batch1_features.sql` — insulin_logs diary, mood/activity/source fields, max_bolus.
4. `20261005000010_batch2_features.sql` — age bands, consents, audit log + triggers, clinician invites + redeem function, patient deletion function.

Migration history rows added to `supabase_migrations.schema_migrations` for versions `20260821000007`, `20261005000008`, `20261005000009`, `20261005000010`.

## Why the catch-up was needed

Live DB was partially drifted from the repo:
- helper functions from `20260812000005` were missing;
- several policies still used direct cross-table `EXISTS` subqueries (recursion-prone);
- a wrong `care_team` policy (`auth.uid() = patient_id …`) was present alongside the two old policies.

## Verification (post-apply)

| Check | Result |
|---|---|
| Helpers present | `is_patient_parent`, `is_assigned_clinician`, `is_care_team_clinician` — OK (EXECUTE: authenticated + service_role only; PUBLIC/anon revoked) |
| `care_team` policies | exactly 1: `care_team_patient_or_clinician_read` (TO authenticated) with `is_patient_parent(patient_id) OR clinician_id = auth.uid()` |
| `care_team` grants | `authenticated`: SELECT only; `anon`: none |
| `insulin_logs` | table + RLS enabled; policies: parent ALL (own rows), clinician SELECT (assigned); grants: authenticated only |
| Diary columns | `glucose_logs.{source,mood,activity_type,activity_minutes}`, `insulin_regimens.max_bolus` — present |
| Profiles role trigger | `protect_profile_role` present + enabled |
| Trigger fns off RPC | `handle_new_user`, `prevent_profile_role_change` — anon/authenticated revoked |

## Security Advisor (before → after)

Before: 22 lints (2× anon + 2× authenticated trigger-function executable; 18× anonymous sign-ins; 1× leaked-password protection).
After: 22 lints — trigger-function lints cleared; remaining items are accepted/documented:
- `is_*` helpers executable by authenticated — **required** for RLS policy evaluation (standard Supabase pattern; boolean-only disclosure; anon revoked).
- `auth_allow_anonymous_sign_ins` (18×) — guest mode ("Continue as Guest") depends on it; owner decision to keep.
- `auth_leaked_password_protection` — HIBP check requires a **Pro plan**; API returned HTTP 402. Noted for upgrade decision.

The original `sensitive_columns_exposed` finding for `public.care_team` is no longer present.

## Anonymous-access negative tests (live REST)

| Request | Result |
|---|---|
| anon → `care_team` | HTTP 401 `permission denied for table care_team` |
| anon → `glucose_logs` | HTTP 401 (policy helper denied) |
| anon → `rpc/is_patient_parent` | HTTP 401 `permission denied for function` |
| anon → `hospitals` | HTTP 200 (intended public read) |

## Still manual (requires real users/devices)

- Two-user negative tests (Patient B vs Patient A; unassigned clinician; etc.) per `docs/RLS_TEST_PLAN.md`.
- App smoke test after the next EAS build.
- Note: `supabase db push` remains unsuitable for this project (prior 403); use SQL Editor or Management API as done here.
