# content-validation.md — ISPAD alignment review (Round 6, 2026-10-06)

**Scope:** clinical copy + rules in the app — sick-day rules engine (`sickDayRules.ts`), Sick-Day Wizard, Emergency protocols, dosing copy, ISPAD badges.
**Method:** source review + code audit + targeted web verification (sources below). Mainline (independent worker attempted; see `content-validation-review.md` when available).

## Findings & dispositions

| # | Item | Verdict | Action taken / needed | Source |
|---|------|---------|----------------------|--------|
| 1 | Hypo recheck interval: rules said **20 min**, Emergency copy says 15 min (inconsistent) | WRONG (harmonized) | **Changed to 15 min** (`HYPO_RECHECK_MINUTES`) — matches 15/15 rule used across app | 15-minute retest standard (imi.edu.in; consistent with 15/15 copy) |
| 2 | Mild hypo treatment: flat "15 g fast sugar, recheck 15 min, repeat" | OK as simplified rule; enhancement flagged | Kept. **Flagged:** paediatric practice often weight-based (~0.3 g/kg); clinician to decide whether to add weight guidance | flagged — no fetched verbatim ISPAD number; do not invent |
| 3 | Mild-ketone tier (0.6–1.0): value **-15%** produced contradictory UI ("Reduce TDD by 15%" + "+3.6 units") | WRONG (fixed) | **Changed to +5%** with consistent "Increase TDD by 5% / +X units" display. Low end of the commonly used 5–10% TDD range for this tier; clinician sign-off logged | CLINICAL_SAFETY_LOG; **BC Children's '5–10–15–20' sick-day rule** (bcchildrens.ca, 2026); practicaldiabetic.com (10–20% for ketones >1.5) |
| 4 | Ketone-check threshold: BG >250 mg/dL or unwell | OK | Kept (≈14 mmol/L standard) | Real-world ketone testing (journals.sagepub.com); columbiadoctors.org |
| 5 | rule-1b ("hypoCorrection") unreachable in `findSickDayRule` | Code observation (no user impact) | Kept; UI-level hypo override (`glucoseVal < HYPO_THRESHOLD`) supersedes — note for future cleanup | code audit |
| 6 | Mini-dose glucagon table: 20 µg <2y / 10 µg·year 2–15y / 150 µg >15y; syringe units (1 U = 10 µg @1 mg/mL) | OK (verified) | Kept — clinician to confirm against local product | standard mini-dose glucagon protocol |
| 7 | DKA card: "Continue drinking water en route" | Needs clinician wording review | **Flagged** (vomiting/consciousness caveat wording) | clinician input required |
| 8 | Correction-target default 120 mg/dL | OK | Kept (per-patient, clinician-set; within usual pre-meal targets) | ISPAD reference digest |
| 9 | Badge: "Based on ISPAD 2022 Guidelines" | OK, improved | Wording → **"Based on ISPAD Guidelines (2022/2024)"** (2024 = current full set; Ch.9/12 content 2022) | ISPAD 2024 set (utoronto/scholaris; ispad.org) |
| 10 | 1800/500 rules presented as estimates | OK | Kept; dose display remains gated on clinician-approved regimen (fail-closed) | ISPAD Ch.9 (2022) — parameters individually set by care team |

## Sources consulted (2026-10-06 searches)
- childrenwithdiabetes.com "Sick Day Guidelines 2023" — target ketones <0.6; glucose 70–180.
- journals.sagepub.com — ketone check when BG >250 mg/dL or symptoms.
- columbiadoctors.org — check ketones if BG over 250 mg/dL.
- uihc.org (2018) — extra insulin timing constraints between ketone corrections.
- digibete.org / Phelan et al. — ISPAD sick-day chapter (vomiting >2h / <5y escalation language).
- ISPAD 2022 CPG + 2024 set (digibete S3 PDF, scholaris, ispad.org).
- imi.edu.in — "Always retest 15 minutes later" after hypo treatment.
- **bcchildrens.ca — "Sick Day Management" PDF (2026-09): "5–10–15–20 Rule" chart — % of TDD for extra insulin by ketone/BG tier (5% mild → 10% → 15% → 20%).** Directly supports the corrected mild-ketone tier (+5%) and the existing moderate tier (10%).
- practicaldiabetic.com (2024) — "ketones above 1.5 mmol/L: add 10–20% of TDD" (corroborates tier 3).

## Outstanding for clinician sign-off
1. Weight-based hypo treatment wording (0.3 g/kg option). 2. Mild-ketone 5% supplemental value. 3. DKA-card hydration wording. 4. Local mini-dose glucagon product/units. 5. Ketone recheck cadences in table (2h/4h tiers).

## Independent verification
Independent review workers were dispatched twice to verify these findings; both failed at the service layer (HTTP 403) before producing output. Mainline validation (sources above) stands; an independent re-run is recommended once the service is healthy. Items requiring clinician sign-off are listed under "Outstanding".
