# T1D-Saathi Release Notes

## Release: Security and Reliability Hardening

This release improves T1D-Saathi’s protection of diabetes health data and makes high-risk clinical workflows fail closed. It also improves mobile layout behavior, data minimization, developer validation, and Supabase deployment clarity.

> This release is a security and engineering hardening milestone. It does not make T1D-Saathi a substitute for a clinician, and it does not prove that every clinical rule or nutrition estimate is medically complete.

## Security changes

The live Supabase project reported that `public.care_team` contained the sensitive `patient_id` relationship without effective RLS. The repository now includes an idempotent hardening migration that enables RLS, revokes anonymous access, revokes mobile-client writes, and restricts reads to the patient or assigned clinician. The migration is stored at `supabase/migrations/20260821000007_audit_hardening.sql` and must still be applied to each intended Supabase environment.

The signup trigger now assigns the deterministic default role `parent` rather than trusting user metadata. A profile-role trigger blocks normal users from promoting themselves to `clinician`. Administrative role changes require a protected server-side workflow.

Home and Patient Dashboard queries no longer use broad `select('*')` calls for patients, glucose logs, or sick-day episodes. They request explicit fields so future schema additions are less likely to leak sensitive values unintentionally.

The previous hardening work also removed direct third-party vision provider calls and client-side provider secrets, added patient-scoped messaging behavior, protected clinician approval metadata, and kept offline queues account-scoped and idempotent. These protections must be checked against the live database and not assumed merely because the migrations exist in Git.

## Clinical-safety changes

Dosing calculations fail closed when glucose, units, insulin sensitivity, carbohydrate ratio, correction target, total daily dose, or clinician approval is missing or invalid. Fabricated defaults are not used to produce a dose. Validation errors are intended to be visible to users rather than silently converted into a recommendation.

Clinician approval is explicit in the regimen model and database contract. A configured regimen is not automatically a clinically approved regimen. Any meal or food estimate must remain an estimate with visible assumptions and a user confirmation step; it must not be treated as a definitive insulin dose.

The clinical safety decision log and RLS test plan should be reviewed by a qualified diabetes clinician before a public clinical launch.

## Offline and privacy changes

Offline records are scoped to the signed-in account, stored in a bounded queue, retried only for transport failures, and assigned idempotency identifiers to prevent duplicate writes after reconnect. Sign-out clears account-scoped queued health data so the next user on the same device cannot inherit it.

Health images are not sent directly from the mobile bundle to a third-party vision provider. Any future image-analysis service must be server-side, privacy-reviewed, rate-limited, and explicit about retention and deletion.

## UI and accessibility changes

Home and Patient Dashboard now add device bottom-inset spacing to scroll content and floating actions. This reduces clipping behind the Android gesture area, iOS home indicator, tab bar, or other navigation chrome.

Primary actions have accessibility roles and labels. The dashboard uses a more consistent icon system rather than relying solely on emoji-like symbols. Loading, offline, conflict, and error states are exposed through the existing UI patterns and should be tested with large text and Nepali content.

The UI remains bilingual, but bilingual copy should continue to be reviewed by native Nepali speakers. Clinical warnings must not rely on color alone.

## Developer tooling and dependencies

The project now has a deterministic `npm run validate` safety suite and a Jest test command. The repair branch adds the declared Expo modules used by the codebase, React Navigation bottom tabs, image-processing packages, TensorFlow packages, and development typings. `npm run typecheck` passes after dependencies are installed from the lockfile.

The repository still requires normal dependency maintenance. Review transitive deprecation warnings during scheduled upgrades, but do not upgrade Expo or TensorFlow packages casually in a clinical release branch without a full device test.

## Supabase deployment requirement

A migration file in Git is not the same as an applied migration. Before release, run the manual procedure in `docs/SUPABASE_MANUAL_MIGRATION.md`, rerun Supabase Security Advisor, and complete the two-user negative RLS tests. Record the result for the target environment.

## Validation performed

The repair branch should pass:

```bash
npm run typecheck
npm run validate
npm test
npm run lint
npx prettier --check .
git diff --check
```

The current repository safety validator checks the clinical fail-closed contract, absence of client-side vision secrets, offline idempotency fields, care-team RLS migration content, role-protection trigger, explicit patient/health query fields, and bottom safe-area protections.

## Known limitations

The app has not been proven perfect or clinically complete. Exact dosing safety depends on clinician-reviewed rules, correct patient settings, correct user input, and device behavior. Food and nutrition estimates may be wrong because portions, cooking methods, hidden ingredients, and local recipes vary. The app requires real-device testing, bilingual review, accessibility testing, and live Supabase negative testing before public use.

## Change ownership and review

Review this release as a code-and-database change. The implementation branch should be merged only after a second developer reviews the SQL, a clinician reviews the clinical behavior, and the Supabase project owner confirms Security Advisor is clear. Keep `main` deployable and preserve the migration history for rollback and audit purposes.
