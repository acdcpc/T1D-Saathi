# Round 13b — console/user-side flip: device root cause + fix (2026-10-13)

## Symptom (device, A24, v10 build)
Tapping "User side" (or pressing ENTER on the TAB-focused button) on the clinician console
looked like a complete no-op: UI, accessibility tree and screenshots stayed identical.

## Investigation (mainline)
- Input eliminated: 8 tap variants + slow press + cold restart + keyboard ENTER activation
  (calibrated: ENTER on "Log out" opens its dialog) — all produced "no-op".
- Crash eliminated: PID stable, no logcat errors, ErrorBoundary never shown.
- Source verified: a325e26 fix present in HEAD and in the built commit 6d72105; single
  StaffViewContext module (no duplicate context).

## Root cause (deep-link oracle)
`com.t1dsaathi.app://emergency` only routes when the FAMILY stack is active.
- Clean mode: deep link ignored (route not registered). (control)
- After tapping "User side": deep link OPENS Emergency -> **personalView DID flip; the
  family stack IS active — but the navigator keeps rendering the previous route
  (ClinicianPatientList is registered in both stacks), so the switch looks like a no-op.**
- Conclusion: the key-based `<Stack.Navigator key={navigatorKey}>` remount (a325e26) does NOT
  re-land the route on device. Same failure shape as v9; mechanism: route state kept.

## Fix (commit 96f1905)
App.tsx: when `personalView` flips (and user/role are known), explicitly
`navigationRef.resetRoot({ index: 0, routes: [{ name: target }] })` shortly after the
screen-set swap (target = 'Home' for user side, 'ClinicianPatientList' for console).
Deterministic and independent of remount semantics. Navigator key kept as secondary.

## Verification
- tsc 0 · jest 85/85 · validate-repo pass.
- On-device verification pending next build (round 13b included): tap User side -> must land
  on family Home; "Clinician console" -> must land on My Patients. Evidence: screenshots +
  the deep-link oracle method above.

## Debug lessons (kept for future rounds)
- Verify UI flips with the deep-link oracle (family-only route) instead of eyeballing; it
  worked when screenshot forensics could not distinguish the states.
- Keyboard ENTER on a TAB-focused node is a clean input-stack bypass for such debugging.
