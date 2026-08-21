
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

- [ ] Merge `agent/t1d-saathi-audit-fixes` into `main` without executing the Supabase migration
- [ ] Verify `main` contains the migration file and document that live RLS remains pending
