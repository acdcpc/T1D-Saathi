# Clinical Safety Decision Log

This branch intentionally prioritizes **fail-closed behavior** over feature completeness. It is not clinical approval and does not authorize patient use.

| Decision | Current branch behavior | Approval still required |
|---|---|---|
| Missing regimen | Dose calculation stops | Clinician-approved regimen workflow |
| Missing glucose | Dose calculation stops | Validation ranges and measurement freshness policy |
| Stale glucose (>15 min) | Dose calculation fails closed | 15-minute freshness window (TODO clinician sign-off) |
| Missing approval metadata | Dose calculation stops | Named clinician approval and audit workflow |
| Glucose units | mg/dL + mmol/L toggle in food and glucose entry; single 18.0182 conversion constant (MMOL_TO_MGDL) | Clinical review of conversion and display policy |
| Photo recognition | Disabled in the mobile client | Privacy-reviewed server integration and nutrition validation |
| Manual food entry | Available with user confirmation | Dietitian/clinician review of food database and portions |
| Offline records | Account-scoped queue with idempotency keys | Encryption/storage review and offline consent policy |
| Dose result | Labeled as a calculation, not a prescription | Clinical usability review and final confirmation design |
| Emergency guidance | Existing protocol copy retained | Formal review of every threshold, translation, and escalation instruction |

No future change should introduce a default TDD, default glucose, default correction target, or silent dose fallback. Any clinically ambiguous rule must be disabled or require explicit clinician approval until resolved.

## Batch 1 additions (2026-10-05) — decisions awaiting clinician review

| Decision | Current behavior | Approval still required |
|---|---|---|
| Maximum bolus guard | Warns and blocks dose saving when a calculated total exceeds the clinician-set `max_bolus`; no cap is applied when unset | Clinician to set a per-patient max bolus value |
| Insulin stacking notice | At dose time, shows the estimated active insulin (IOB, 4-hour linear decay) from recent doses with a non-directive warning | Clinician to review wording and any timing guidance |
| 15/15 hypoglycemia card | Emergency screen shows mild-hypo steps (15 g fast carbs → recheck 15 min) | Clinician review of wording and examples |
| Long-acting dose log | Manual long-acting entries recorded in the insulin diary, separate from bolus IOB | Confirm logging expectations for MDI regimens |
| Mood / activity diary fields | Optional non-clinical fields on glucose logs | Nil (label review only) |
