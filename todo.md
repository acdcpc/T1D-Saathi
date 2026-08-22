
## Security audit: Supabase exposure review

- [x] Audit all public tables for missing RLS and sensitive columns
- [x] Audit grants and policies for cross-user access
- [x] Audit client code for exposed secrets and unsafe data access
- [x] Produce prioritized remediation SQL and verification steps

## Re-audit: Git changes, UI/design, and security

- [x] Verify relevant branches, commits, and working-tree state
- [x] Confirm Supabase/RLS remediation exists in repository code and migrations
- [x] Recheck secret handling and client-side data access
- [x] Review UI safe areas, responsiveness, accessibility, and design consistency
- [x] Report confirmed changes and remaining priorities

## Corrected scope: T1D-Saathi-only agent prompt

- [x] Create a prompt that excludes the separate Nepali Food app
- [x] Focus the prompt on T1D-Saathi clinical safety, Supabase/RLS, privacy, offline sync, UI, design, testing, and release hardening

## Implementation request: apply audited fixes and document changes

- [x] Create isolated implementation branch
- [x] Add deterministic care_team RLS hardening migration
- [x] Harden remaining RLS, role escalation, messages, and public-table policies
- [x] Improve clinical fail-closed validation and offline queue safety
- [x] Improve UI safe areas, accessibility, and visual consistency
- [x] Add developer-facing change log, security checklist, and migration guide
- [x] Add or update automated validation for security and clinical safeguards
- [x] Commit and push the review branch without changing main

## Merge request: code only, no Supabase execution

- [x] Merge `agent/t1d-saathi-audit-fixes` into `main` without executing the Supabase migration
- [x] Verify `main` contains the migration file and document that live RLS remains pending

## Repair request: migration guide, release notes, and TypeScript dependencies

- [x] Create repair branch from current main
- [x] Add manual Supabase SQL Editor migration guide
- [x] Add detailed security and UI release notes
- [x] Add missing Expo dependencies and compatible versions
- [x] Add TensorFlow typings/dependencies or safe platform shims
- [x] Fix all remaining TypeScript errors
- [x] Validate, commit, and push the repair branch

- [x] Add deterministic offline-sync unit tests for account isolation, idempotency, retry classification, and sign-out cleanup.
- [x] Expand clinical-safety tests for invalid constants, stale readings, extreme values, and fail-closed behavior.
- [x] Validate dependency vulnerability scan and Supabase policy audit results.
- [x] Finalize and validate the reusable t1d-saathi-security-release skill.
- [x] Review GitHub pull request/branch mergeability and document whether conflicts remain.
