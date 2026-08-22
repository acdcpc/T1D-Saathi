# T1D-Saathi Supabase Production Migration Verification Checklist

Use this checklist only for the intended T1D-Saathi Supabase project. The repository migration is `supabase/migrations/20260821000007_audit_hardening.sql`. Completing the SQL Editor run alone is not sufficient evidence of production safety.

## 1. Confirm the target and prepare evidence

- [ ] Confirm the Supabase project name and project reference match the intended T1D-Saathi production project.
- [ ] Confirm the current repository commit and migration filename in the release record.
- [ ] Confirm the project backup/recovery process is current. Do not proceed if the target project is uncertain.
- [ ] Open a release evidence document and record the operator, date/time, project reference, migration filename, and screenshots or copied metadata results.
- [ ] Do not paste service-role keys, database passwords, JWT secrets, or patient records into chat, issues, or source control.

## 2. Inspect the live schema before execution

Run the following in the Supabase SQL Editor and save the result:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'care_team'
order by ordinal_position;
```

- [ ] Confirm `care_team` contains `id`, `patient_id`, `clinician_id`, `hospital_id`, and `role` with compatible UUID/reference types.
- [ ] Confirm `patients.id` and `patients.user_id` exist and that `patients.user_id` references the authenticated user identity as expected.
- [ ] Confirm the helper function `public.is_patient_parent(uuid)` exists, or include the earlier migration that creates it before applying the audit-hardening migration.
- [ ] Stop if the live schema differs materially from the repository migrations. Do not improvise production SQL.

## 3. Apply the migration

- [ ] Open **Supabase Dashboard → SQL Editor → New query** for the confirmed project.
- [ ] Paste the complete contents of `supabase/migrations/20260821000007_audit_hardening.sql`.
- [ ] Review the SQL for the expected safeguards: RLS enablement, anonymous/client privilege revocation, authenticated `SELECT`, the `public.is_patient_parent(patient_id)` ownership predicate, clinician self-assignment predicate, forced parent signup role, and role-change trigger.
- [ ] Execute the migration once.
- [ ] Confirm the SQL Editor reports success without warnings or partial statements.
- [ ] If an object is missing, stop and investigate the migration order. Do not disable RLS or replace the policy with a public policy.

## 4. Verify table security metadata

Run and save the results:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'care_team';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'care_team'
order by grantee, privilege_type;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'care_team';
```

- [ ] Confirm `rowsecurity = true` for `care_team`.
- [ ] Confirm `anon` has no table privileges.
- [ ] Confirm `authenticated` has only the required `SELECT` privilege; it must not have `INSERT`, `UPDATE`, or `DELETE`.
- [ ] Confirm exactly one effective read policy is present for this migration and that it includes both `public.is_patient_parent(patient_id)` and `clinician_id = auth.uid()`.
- [ ] Confirm no broad `USING (true)` or `WITH CHECK (true)` policy exists on `care_team`.

## 5. Verify role protection metadata

```sql
select routine_schema, routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('handle_new_user', 'prevent_profile_role_change');

select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.profiles'::regclass
  and tgname = 'protect_profile_role';
```

- [ ] Confirm `prevent_profile_role_change` exists as a security-definer trigger function.
- [ ] Confirm `protect_profile_role` exists and is enabled on `public.profiles`.
- [ ] Confirm new signup metadata cannot select the `clinician` role; clinician assignment is an administrative workflow.

## 6. Run the Security Advisor check

- [ ] Open **Supabase Dashboard → Security Advisor**.
- [ ] Rerun the scan after the migration completes.
- [ ] Confirm the `sensitive_columns_exposed` finding for `public.care_team` is cleared.
- [ ] Review any new warnings rather than assuming they are unrelated.
- [ ] Save the Security Advisor result with the release evidence, including the scan timestamp.

## 7. Run controlled two-user negative tests

Use non-production test identities and synthetic, non-sensitive records only. Run through the app or an authenticated REST client with the intended user sessions.

| Actor and action | Expected result | Evidence |
|---|---|---|
| Patient A reads their own care-team row | Allowed | Response or screen capture |
| Patient B reads Patient A’s row | Denied or empty result | Response/status |
| Assigned clinician reads Patient A’s row | Allowed | Response/status |
| Unassigned clinician reads Patient A’s row | Denied or empty result | Response/status |
| Anonymous/signed-out client reads any row | Denied | Response/status |
| Normal client inserts a care-team row | Denied | Response/status |
| Normal client updates a care-team row | Denied | Response/status |
| Normal client deletes a care-team row | Denied | Response/status |
| Normal client changes its profile role to clinician | Denied with administrator-required error | Response/status |

- [ ] Confirm denial is enforced by the database/API, not only hidden by the UI.
- [ ] Confirm a denied request does not reveal another user’s row count, identifiers, or relationship metadata beyond the minimum necessary error behavior.
- [ ] Delete test identities and test records through the approved administrative process after evidence is captured.

## 8. Verify application behavior after the migration

- [ ] Sign in as a parent and confirm the care-team screen loads only the parent’s assignments.
- [ ] Sign in as an assigned clinician and confirm only assigned patients are visible.
- [ ] Confirm glucose logs, insulin regimens, sick-day episodes, messages, and assessment records still honor their own RLS policies.
- [ ] Confirm offline sync handles a denied insert as a retained conflict rather than retrying forever.
- [ ] Confirm sign-out clears only the current account’s local queue and does not expose data after account switching.
- [ ] Confirm dosing remains fail-closed when regimen approval or required inputs are missing.

## 9. Release decision and rollback-safe response

- [ ] Mark the migration **verified** only when metadata checks, Security Advisor, two-user negatives, and application smoke tests are all recorded.
- [ ] If any authorization test fails, stop release and leave RLS enabled. Do not roll back by making `care_team` public.
- [ ] If a legitimate workflow breaks, disable or gate that application operation while correcting the authorization policy through a reviewed migration.
- [ ] Record the final decision, open findings, operator, timestamp, and next owner in the release notes.
