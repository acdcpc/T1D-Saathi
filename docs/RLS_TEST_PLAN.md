# T1D-Saathi RLS and Pilot Test Plan

This document is a release gate for the Supabase schema and migrations. Run the cases against a disposable Supabase project with separate test accounts. Do not use production patient data.

| Actor | Expected access |
|---|---|
| Anonymous user | No health data, no profiles, no messages, no patient documents; only intentionally public hospitals, helplines, and education |
| Parent A | Own profile, own patients, own logs, own unapproved regimens, and messages for their own assigned patient |
| Parent B | None of Parent A’s patients, logs, regimens, meal records, documents, or messages |
| Assigned clinician | Read assigned patient data and approve assigned regimens; no unrelated patient access |
| Revoked clinician | No access after care-team removal |
| Service/admin workflow | Controlled role assignment and audit-only operations |

## Required negative cases

A parent must not be able to update their own `profiles.role` to `clinician`, insert a regimen with `approved_by_clinician = true`, or approve a regimen. A parent must not be able to read or write another parent’s patient, glucose, ketone, sick-day, meal, assessment, or document records.

An assigned clinician must not be able to read an unrelated patient, change patient ownership, or access a patient after the care-team assignment is revoked. A clinician may approve only a regimen for a patient in their current care team, and the approval must record the approving user and timestamp.

A user must not be able to send a message with an arbitrary recipient UUID, omit `patient_id`, or message a user outside the patient’s care team. A user must not be able to read messages for a different patient by changing a client-side filter.

An anonymous user must not be able to insert into any health table, enumerate profiles, read messages, or obtain private Storage URLs. A signed-out client must not be able to replay queued records.

## Data-integrity cases

Insert the same `client_event_id` twice for each offline-supported table and verify that the second insert is rejected or treated idempotently according to the chosen API behavior. Test expired sessions, transient network failure, validation failure, RLS rejection, duplicate replay, and schema mismatch separately. Permanent errors must not remain in an infinite retry loop.

## Clinical gates

Before pilot release, a qualified clinician must approve the regimen approval workflow, dose calculation assumptions, unit conversion behavior, sick-day thresholds, emergency copy, translations, and the distinction between estimated carbohydrates and confirmed carbohydrates. The app must fail closed when any approval metadata or current measurement is missing.
