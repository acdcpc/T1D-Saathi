import { readFile } from 'node:fs/promises';

const files = {
  dosing: await readFile('src/utils/dosingCalc.ts', 'utf8'),
  food: await readFile('src/screens/FoodEstimatorScreen.tsx', 'utf8'),
  vision: await readFile('src/utils/visionAPI.ts', 'utf8'),
  queue: await readFile('src/utils/offlineQueue.ts', 'utf8'),
  schema: await readFile('supabase_schema.sql', 'utf8'),
  hardening: await readFile('supabase/migrations/20260814000005_safety_hardening.sql', 'utf8'),
  auditHardening: await readFile('supabase/migrations/20260821000007_audit_hardening.sql', 'utf8'),
  home: await readFile('src/screens/HomeScreen.tsx', 'utf8'),
  dashboard: await readFile('src/screens/PatientDashboard.tsx', 'utf8'),
};

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(!files.food.includes('|| 40'), 'Food estimator still contains a hard-coded TDD fallback.');
assert(files.food.includes('approved_by_clinician'), 'Food estimator does not require clinician approval.');
assert(files.food.includes('Glucose required'), 'Food estimator does not block missing glucose.');
assert(files.dosing.includes('DosingValidationError'), 'Dosing utility does not expose validation errors.');
assert(files.dosing.includes('glucoseToMgDl'), 'Glucose unit conversion helper is missing.');
assert(!files.vision.includes('EXPO_PUBLIC_LOGMEAL_API_KEY'), 'Vision client still references the LogMeal secret.');
assert(!files.vision.includes('FATSECRET_CLIENT_SECRET'), 'Vision client still references the FatSecret secret.');
assert(!files.vision.includes('api.logmeal.com'), 'Vision client still uploads directly to LogMeal.');
assert(!files.queue.includes('synced_from_offline'), 'Offline sync still sends an undeclared synced_from_offline field.');
assert(files.queue.includes('client_event_id'), 'Offline queue has no idempotency key.');
assert(files.queue.includes('isTransportFailure'), 'Offline queue does not distinguish transport errors.');
assert(files.schema.includes('approved_by_clinician'), 'Base schema lacks regimen approval metadata.');
assert(files.schema.includes('client_event_id'), 'Base schema lacks offline idempotency metadata.');
assert(files.hardening.includes('prevent_profile_role_change'), 'Role-protection trigger is missing.');
assert(files.hardening.includes('patient_id IS NOT NULL'), 'Message policy does not require patient context.');
assert(files.auditHardening.includes('ALTER TABLE public.care_team ENABLE ROW LEVEL SECURITY'), 'Care-team RLS hardening migration is missing.');
assert(files.auditHardening.includes('REVOKE ALL ON TABLE public.care_team FROM anon'), 'Care-team anonymous access is not revoked.');
assert(
  files.auditHardening.includes('public.is_patient_parent(patient_id)') &&
    files.auditHardening.includes('clinician_id = auth.uid()'),
  'Care-team ownership policy is missing patient/clinician scoping.',
);
assert(files.auditHardening.includes("'parent'"), 'Signup trigger does not force the parent role.');
assert(!files.home.includes(".select('*')"), 'HomeScreen still broad-selects patient records.');
assert(!files.dashboard.includes(".select('*')"), 'PatientDashboard still broad-selects health records.');
assert(files.home.includes('insets.bottom'), 'HomeScreen lacks bottom safe-area spacing.');
assert(files.dashboard.includes('insets.bottom'), 'PatientDashboard lacks bottom safe-area spacing.');

if (failures.length) {
  console.error('Repository validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Repository safety validation passed.');
