# Clinical Safety Decision Log

This branch intentionally prioritizes **fail-closed behavior** over feature completeness. It is not clinical approval and does not authorize patient use.

| Decision | Current branch behavior | Approval still required |
|---|---|---|
| Missing regimen | Dose calculation stops | Clinician-approved regimen workflow |
| Missing glucose | Dose calculation stops | Validation ranges and measurement freshness policy |
| Missing approval metadata | Dose calculation stops | Named clinician approval and audit workflow |
| Glucose units | Converted through a single utility before threshold checks | Clinical review of conversion and display policy |
| Photo recognition | Disabled in the mobile client | Privacy-reviewed server integration and nutrition validation |
| Manual food entry | Available with user confirmation | Dietitian/clinician review of food database and portions |
| Offline records | Account-scoped queue with idempotency keys | Encryption/storage review and offline consent policy |
| Dose result | Labeled as a calculation, not a prescription | Clinical usability review and final confirmation design |
| Emergency guidance | Existing protocol copy retained | Formal review of every threshold, translation, and escalation instruction |

No future change should introduce a default TDD, default glucose, default correction target, or silent dose fallback. Any clinically ambiguous rule must be disabled or require explicit clinician approval until resolved.
