# T1D-Saathi Security and Release Checklist

## What changed on `agent/t1d-saathi-audit-fixes`

| Area | Change | Why |
|---|---|---|
| Care-team privacy | Added `supabase/migrations/20260821000007_audit_hardening.sql` | Makes `care_team` RLS, grants, and patient/clinician visibility deterministic instead of relying on an older migration having been applied. |
| Role safety | Signup trigger always creates `parent`; role-change trigger blocks normal-user escalation | Prevents user metadata or profile updates from creating clinician access. |
| Query minimization | Home and patient dashboard now request explicit fields instead of `select('*')` | Reduces accidental exposure of health and identity fields. |
| Layout safety | Home and patient dashboard use bottom safe-area insets and extra scroll space | Prevents content and actions from being hidden behind device/navigation chrome. |
| Validation | `scripts/validate-repo.mjs` checks the new migration, query minimization, and inset protections | Makes the high-risk invariants visible in CI and during local review. |

## Required Supabase steps

1. Review the new migration in `supabase/migrations/20260821000007_audit_hardening.sql`.
2. Apply it to the intended Supabase environment using the Supabase SQL Editor or migration pipeline.
3. Rerun Supabase Security Advisor and confirm the `care_team` sensitive-column warning is cleared.
4. Test with two non-production users: each patient sees only their own relationship; an assigned clinician sees only assigned patients; an unassigned clinician sees none; anonymous requests see none.
5. Confirm that mobile users cannot insert, update, or delete `care_team` assignments.
6. Verify that the live signup trigger sets `profiles.role` to `parent` even if signup metadata includes a different role.

## Pre-release security checks

Before release, confirm that RLS is enabled on every health-data table and that every `INSERT`, `UPDATE`, `DELETE`, and `SELECT` policy is ownership- or assignment-scoped. Confirm private storage buckets for patient documents. Confirm no service-role key, provider secret, database password, bearer token, or patient row is present in the mobile bundle or logs.

## Pre-release clinical checks

Run the dosing tests and verify that incomplete, invalid, stale, or unapproved regimen inputs fail closed. Confirm that clinicians can approve only assigned patient regimens. Review dosing copy and emergency guidance with a qualified diabetes clinician before public use.

## Pre-release UI checks

Test Home, Patient Dashboard, Food Estimator, Log Glucose, Sick Day, Regimen Settings, Messages, clinician patient list/detail, and settings on small Android and iOS devices. Test bottom insets, keyboard avoidance, large text, Nepali text, loading/error/empty/offline states, and accessibility labels. Confirm that no primary action is obscured by the tab bar, home indicator, or a floating action.

## Local validation

```bash
npm run typecheck
npm run validate
npm test
npm run lint
git diff --check
```

The migration is not considered deployed merely because it exists in Git. The live Supabase Security Advisor result and two-user negative tests are the source of truth for production readiness.
