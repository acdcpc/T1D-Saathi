# T1D-Saathi Manual Supabase Migration Guide

This guide applies to the **T1D-Saathi** Supabase project `t1d-heal` (`jwslcxgnwlsqbrtmmqvf`). It does not apply to the separate Nepali Food project.

## What this migration fixes

Supabase Security Advisor reported that `public.care_team` was exposed through the API without effective Row-Level Security even though it contains the sensitive `patient_id` column. The migration enables RLS, removes anonymous and mobile-client write access, and permits reads only when the authenticated user owns the patient record or is the assigned clinician.

The migration also makes new-account role assignment deterministic. Signup metadata cannot create a clinician account, and normal users cannot update their own profile role.

## Before you start

Use a non-production backup or confirm that your project backup and recovery plan is current. Do not paste passwords, service-role keys, database passwords, JWT secrets, or patient rows into chat or source control. Apply this only to the intended T1D-Saathi Supabase project.

Confirm the table columns before running the migration:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'care_team'
order by ordinal_position;
```

The expected columns are `id`, `patient_id`, `clinician_id`, `hospital_id`, and `role`.

## Option A: Supabase SQL Editor

Open **Supabase Dashboard → t1d-heal → SQL Editor → New query**. Copy and run the complete contents of:

`supabase/migrations/20260821000007_audit_hardening.sql`

The current repository version is:

```sql
BEGIN;

ALTER TABLE public.care_team ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.care_team FROM anon;
REVOKE ALL ON TABLE public.care_team FROM authenticated;
GRANT SELECT ON TABLE public.care_team TO authenticated;

DROP POLICY IF EXISTS "Parents can view care team" ON public.care_team;
DROP POLICY IF EXISTS "Clinicians can view own assignments" ON public.care_team;
DROP POLICY IF EXISTS "care_team_patient_or_clinician_read" ON public.care_team;

CREATE POLICY "care_team_patient_or_clinician_read"
  ON public.care_team
  FOR SELECT
  TO authenticated
  USING (public.is_patient_parent(patient_id) OR clinician_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.care_team FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'parent'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'profile role changes require an administrator';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

COMMIT;
```

Click **Run**. A successful run should complete without errors. If the project says a table, function, trigger, or policy does not exist, stop and compare the live schema with the current T1D-Saathi migrations before changing the SQL.

## Option B: Supabase CLI migration pipeline

From the T1D-Saathi repository, authenticate with the Supabase CLI, link the intended project, inspect the diff, and then apply the migration:

```bash
supabase login
supabase link --project-ref jwslcxgnwlsqbrtmmqvf
supabase db diff --linked
supabase db push
```

Review the pending migration list carefully. Never run `supabase db reset` against a production project.

## Verify the fix

In **Database → Table Editor → care_team**, confirm that RLS is enabled. In **Security Advisor**, rerun the scan and confirm the `sensitive_columns_exposed` finding for `public.care_team` is cleared.

Run these metadata checks in SQL Editor:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'care_team';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'care_team';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'care_team';
```

The table must report `rowsecurity = true`. Anonymous access must not have table privileges. The authenticated role should have only `SELECT`, and the policy predicate must use `public.is_patient_parent(patient_id)` for parent ownership plus `clinician_id = auth.uid()` for assigned clinicians.

## Two-user negative test

Create two non-production users. Create or use one care-team row for Patient A and an assigned clinician. Verify the following through the app or REST client:

| Actor | Expected result |
|---|---|
| Patient A | Can read their own care-team row. |
| Patient B | Cannot read Patient A’s row. |
| Assigned clinician | Can read the assigned patient’s row. |
| Unassigned clinician | Cannot read the row. |
| Signed-out/anonymous client | Cannot read any row. |
| Any normal client | Cannot insert, update, or delete care-team assignments. |

Do not treat a successful SQL run as proof that the app is secure. The negative tests and Security Advisor result are required evidence.

## Rollback guidance

Do not roll back by making the table public again. If the migration breaks a legitimate workflow, leave RLS enabled and temporarily disable only the affected application operation while the authorization workflow is corrected. Any emergency rollback must preserve `REVOKE ALL ... FROM anon`, preserve RLS, and be reviewed before execution.

## After migration

Commit the applied migration state in the repository, record the date and project environment in the release notes, and keep the Supabase dashboard result with the release evidence. The service-role key must remain server-side and must never be added to the mobile `.env` file.
