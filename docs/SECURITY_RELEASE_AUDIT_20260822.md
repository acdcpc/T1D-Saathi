# T1D-Saathi Security and Release Audit

## Executive summary

The T1D-Saathi repository was reviewed for clinical-safety hardening, offline health-data synchronization, Supabase authorization, dependency vulnerabilities, and GitHub integration status. The code-level validation is passing after adding deterministic high-risk tests and correcting the `care_team` parent ownership predicate. The live Supabase migration remains **not verified/applied** and must still be executed manually in the intended project before release.

## Confirmed changes

| Area | Evidence | Status |
|---|---|---|
| Clinical dosing | `src/utils/dosingCalc.ts`, `__tests__/dosingCalc.test.ts` | Fail-closed validation and boundary coverage pass |
| Offline sync | `src/utils/offlineQueue.ts`, `__tests__/offlineQueue.test.ts` | Account scoping, transport retry, conflict retention, and cleanup coverage pass |
| Care-team RLS | `supabase/migrations/20260821000007_audit_hardening.sql` | Repository migration enables RLS, revokes client writes, and scopes reads correctly |
| Parent authorization | `public.is_patient_parent(patient_id)` in migration and guide | Correctly checks `patients.user_id = auth.uid()`; do not compare `auth.uid()` directly to `patients.id` |
| Role protection | `prevent_profile_role_change` trigger and forced parent signup role | Repository hardening present |
| Safe-area/UI hardening | Existing screen and layout changes on `main` | Repository changes present; real-device visual validation remains separate |
| Reusable workflow | `/home/ubuntu/skills/t1d-saathi-security-release/SKILL.md` | Official skill validator passes |

## Validation results

| Check | Result |
|---|---|
| Jest, serial execution | 3 suites passed, 34 tests passed |
| TypeScript | Passed with no reported errors |
| Repository safety validator | Passed |
| `git diff --check` | Passed |
| Skill validation | Passed |
| GitHub pull-request list | No pull requests currently exist for `acdcpc/T1D-Saathi` |
| Branch comparison | `agent/t1d-typescript-and-docs` is 1 commit ahead and 0 behind `main`; no conflict markers found |

## Dependency scan

`npm audit --omit=dev --audit-level=high` reported **18 vulnerabilities: 12 moderate and 6 high, with no critical findings** in the installed dependency graph. The high-severity findings are transitive and include `@expo/metro`, `metro`, `metro-config`, `metro-transform-worker`, `image-size`, and `nanoid`. They should be triaged against the Expo SDK 57 compatibility matrix and updated through a controlled lockfile change. Do not run `npm audit fix --force` without reviewing the resulting Expo and React Native compatibility impact.

## Supabase release gate

The repository migration is not evidence that the live database is protected. Apply `supabase/migrations/20260821000007_audit_hardening.sql` manually to the intended `t1d-heal` project using the instructions in `docs/SUPABASE_MANUAL_MIGRATION.md`. Then verify `care_team.rowsecurity = true`, anonymous access has no table privileges, authenticated users have only the required `SELECT` privilege, and the Security Advisor finding `sensitive_columns_exposed` is cleared.

Complete the documented two-user negative tests: Patient B must not read Patient A’s care-team row; an unassigned clinician must not read it; anonymous access must fail; and normal clients must not insert, update, or delete care-team assignments. Record the Security Advisor result and migration date in the release evidence.

## Known limitations

No live Supabase SQL execution, Security Advisor result, real-device safe-area test, clinician review, or production dependency remediation was performed in this audit. These are release prerequisites rather than claims of completion.
