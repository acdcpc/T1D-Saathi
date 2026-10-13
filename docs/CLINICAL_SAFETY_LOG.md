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


## Round 6 additions (2026-10-06) — dual-insulin regimen (basal + bolus)

| Decision | Current branch behavior | Approval still required |
|---|---|---|
| Dual-insulin regimen model | Patients/regimens store basal (long-acting) AND bolus (rapid-acting) insulins separately, per ISPAD basal-bolus standard; `regimen_type` ∈ {mdi, pump, premix}. Legacy single `insulin_type` retained as fallback label. | Clinician review of insulin option lists (what is actually available in Nepal) and regimen-type defaults |
| At-least-one-insulin rule | AddPatient / Regimen settings fail closed if neither basal nor bolus is selected; TDD > 0 and correction target > 0 still required | Clinician confirmation of required-field policy |
| Basal dose field | `basal_dose` (units/day) stored separately from TDD; legacy `dose` column kept in sync for compatibility | Clinician review of dose-entry semantics (basal vs TDD round-tripping) |
| Dosing gate unchanged | Dose calculator still requires clinician-approved regimen + TDD + correction target; no gate weakened by this change (review-verified) | — (no change) |
| Insulin option lists | Basal: glargine U100/U300, detemir, degludec, NPH; bolus: aspart, lispro, glulisine, faster aspart, regular human, premix 70/30, + 'None'. Sources: ISPAD consensus chapter (2022; 2024 set context), CDC insulin types (2024) | Clinician to confirm local product names/brands to display |

## Round 6.1 content-validation fixes (2026-10-06 evening)

| Decision | Current behavior | Approval still required |
|---|---|---|
| Hypo recheck interval | Harmonized to **15 minutes** everywhere (was 20 in the rules engine vs 15 in Emergency copy) | Clinician confirmation (15/15 rule) |
| Mild-ketone supplemental insulin | Replaced contradictory legacy value (-15%) with **+5% of TDD** (low end of commonly used 5–10% range), display made consistent, dose still requires clinician-approved regimen | Clinician to confirm 5% vs 5–10% for the 0.6–1.0 mmol/L tier |
| ISPAD badge wording | "Based on ISPAD Guidelines (2022/2024)" | Nil (label) |
| Weight-based hypo treatment (~0.3 g/kg) | Not added; flagged for clinician decision | Clinician input |
| DKA "drink water en route" wording | Unchanged; flagged | Clinician wording review |


## 2026-10-07 — Food database v2: authoritative nutrition sources integrated
- `src/data/nepaliFoods.ts` reconciled against: (1) Nepal Food composition table 2017 via the clinic 100-kcal exchange list, (2) Life for a Child "Healthy eating and carbohydrate counting" (Indian Foods, Ed 1, 2021), (3) clinic 100-kcal / 6-g-protein handouts, (4) T1DM CHO portions sheet.
- These values feed the meal carb totals used by dosing suggestions (ICR math unchanged; per-food data only).
- Conflict resolutions: dal + roti densities preferred from the Nepal composition table; banana book value discarded as inconsistent; papaya exchange row flagged internally inconsistent and left unchanged.
- Full change log: `docs/FOOD_DATA_SOURCES_2026-10-07.md`. Pending: dietitian confirmation of the papaya value and of the "1 CHO portion" definition.

## Round 8 additions (2026-10-08) — bolus dose field + unified dosing engine + override handling

| Decision | Current branch behavior | Approval still required |
|---|---|---|
| Rapid-acting (bolus) dose field | `insulin_regimens.bolus_dose` + `patients.bolus_dose` (units/day) added (nullable, additive; applied to live DB). Shown beside basal on Log / regimen / clinician views. The basal+bolus sum hint never auto-overwrites TDD. | Clinician confirmation of dose-entry semantics (bolus units/day vs per-meal) and whether TDD stays explicit or becomes the basal+bolus sum |
| Unified dose engine | Log + Food both use `dosingCalc.calculateDosing` (fail-closed; approval gate; 15-min freshness; max-bolus guard). Loose helpers hardened (0 on invalid; silent 1:10 default removed); no production callers remain. | — (no thresholds changed) |
| Clinician ISF / I:C overrides | Overrides set in regimen settings are honored in BOTH dose paths (effective constants = override × TDD; else 1800/500 defaults). Previously the food path silently ignored overrides. | Clinician confirmation of per-insulin-type constants: 1800/500 for rapid analogs vs 1500/450-style for regular human insulin (e.g., Actrapid) |
| Unapproved-regimen UX | "Calculate" on an unapproved regimen shows explicit guidance (how to unlock: clinician approves; where) instead of a silent no-op. Gate itself unchanged. | — (copy review) |
| Rounding & display | 0.1 U half-up from the unrounded sum; tiny true doses (e.g. 0.04 U) may display 0.0 U; individually-rounded parts may not sum to the rounded total (±0.1 U display artifact). | Pen-device rounding policy (0.5 U / 1 U pens) |
| Max bolus semantics | `max_bolus` compares against the TOTAL suggested bolus (meal + correction); warning only, does not block. | Clinician confirmation: max applies to total vs correction-only |

## Round 9 additions (2026-10-09) — clinician-side regimen editing + family requests + clinician alerts

| Decision | Current branch behavior | Approval still required |
|---|---|---|
| Clinician direct editing | Clinicians (care-team) and staff can edit ALL regimen fields from the clinician patient view; saving writes `approved_by_clinician=true`, `approved_by=self` (RLS enforces this shape). Saving = approval, stated in UI copy. | Confirm workflow intent: any clinician save (incl. small edits) re-approves and immediately unlocks family dose help (vs. a separate two-step review state) |
| Clinician-created regimens | New RLS INSERT policies: care-team clinicians may create regimens only marked approved-by-self; staff (admin) may insert. | — |
| Family review requests | `regimen_requests` (review/change, optional note): created on explicit request AND automatically on every family regimen save; clinicians see them in the patient view; resolved manually or automatically on save/approve. | Nothing clinical (process only) |
| Clinician push alerts | `notify-clinicians` edge fn sends Expo pushes to assigned clinicians + full-access staff when a request is filed (best effort; request row is the source of truth). | — |

## Round 11 (2026-10-09) — clinician auto-calculations
- Clinician regimen form auto-suggests **ISF (correction factor) = 1800 ÷ TDD** and **I:C = 500 ÷ TDD** when basal/bolus doses or frequency change (standard starting estimates per ISPAD-style rules; fully editable; save = clinician approval). TDD auto = basal + bolus/dose × frequency.
- Assumption logged: owner's "correction factor" = ISF (same clinical parameter); labeled "ISF / correction factor" in UI.
- Existing `bolus_dose` rows entered under the previous units/day label require clinician re-entry under the new units-per-dose semantics when editing.

## Round 12 (2026-10-09) — intake data quality
- Weight (kg) required at intake (0–150 validated); height optional. (Not yet used in dosing math.)
- Years-only age → estimated DOB (Jan 1 of birth year) + `dob_precision='approx_years'`; affects age-band suggestion and the under-5 sick-day red flag with ±1-year precision — acceptable for triage, flagged approximate.
- Diagnosis-date precision options (exact / <1 mo / <1 yr / >1 yr / unknown): qualitative choices store precision only — no invented dates.
- Intake TDD now auto = basal + bolus/dose × frequency (consistent with clinician form); ISF/I:C estimates remain 1800/500 rules with clinician review.
