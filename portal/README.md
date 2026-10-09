# Sano Bir — Clinician Portal (web)

A lightweight, single-file web portal for clinicians:

- Secure email/password sign-in (Supabase Auth; clinician accounts only)
- Patient list (assigned patients for clinicians; **all patients** for full-access staff)
- Per-patient: flags (latest glucose, lows in 7 days, active sick day, approval status, consent), KPI row (TIR / mean / SD / CV / checks-per-day / est. HbA1c), 14-day trend, glucose + insulin tables, sick-day history
- **Approve insulin regimens** (audited)
- **Manage care-team links** (full-access staff): link/unlink clinicians to patients by email
- **CSV export** per patient

## Setup

1. Copy `config.example.js` → `config.js` and fill in your Supabase URL + anon key.
2. Serve the folder locally:
   ```bash
   cd portal && python3 -m http.server 8787
   ```
   Then open http://localhost:8787
3. Sign in with a clinician account.

## Accounts & access model

- **Full-access staff** (see `admin_emails` in the database): Prakash (thisispratha@gmail.com) and Dr. Archana (archananepal@pahs.edu.np).
- Any other account signs in as a clinician only if an administrator upgrades its role (or if its email is added to `admin_emails` before/after signup — signup auto-assigns the clinician role for staff emails).
- Clinicians see only patients where they are in `care_team`. Full-access staff see everything and can manage links.
- Row-Level Security enforces all of this server-side; the portal has no privileged keys.

## Deploying

Any static host works (Netlify / Vercel / Cloudflare Pages / GitHub Pages / an internal server).
Upload `index.html` + `config.js`. HTTPS recommended (required for some browsers' clipboard/other APIs; localhost is fine for testing).

## Security notes

- Only the public anon key is used; all access is enforced by Postgres RLS.
- Regimen approvals and role changes are recorded in the audit log.
- Never put the service_role key in this portal.
