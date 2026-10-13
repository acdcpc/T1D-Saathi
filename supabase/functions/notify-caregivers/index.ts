// Supabase Edge Function: notify-caregivers
// Sends Expo push notifications to a patient's caregivers after a low reading.
// Caller must be authenticated (verify_jwt), and must be the patient's parent,
// an assigned clinician, or a full-access staff account.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
  const caller = userData.user.id;

  let body: { patient_id?: string; value?: string; sender_token?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { patient_id, value, sender_token } = body || {};
  if (!patient_id) return json({ error: 'patient_id required' }, 400);

  const { data: patient } = await admin
    .from('patients')
    .select('id,user_id,name')
    .eq('id', patient_id)
    .maybeSingle();
  if (!patient) return json({ error: 'Patient not found' }, 404);

  let allowed = patient.user_id === caller;
  if (!allowed) {
    const { data: ct } = await admin
      .from('care_team')
      .select('id')
      .eq('patient_id', patient_id)
      .eq('clinician_id', caller)
      .maybeSingle();
    allowed = !!ct;
  }
  if (!allowed) {
    const { data: authUser } = await admin.auth.admin.getUserById(caller);
    const email = authUser?.user?.email?.toLowerCase();
    if (email) {
      const { data: ae } = await admin.from('admin_emails').select('email').eq('email', email).maybeSingle();
      allowed = !!ae;
    }
  }
  if (!allowed) return json({ error: 'Forbidden' }, 403);

  const { data: team } = await admin.from('care_team').select('clinician_id').eq('patient_id', patient_id);
  const userIds = new Set<string>([patient.user_id]);
  for (const t of team || []) userIds.add(t.clinician_id);

  const { data: tokens } = await admin
    .from('push_tokens')
    .select('expo_push_token,user_id')
    .in('user_id', Array.from(userIds));
  const targets = (tokens || []).filter((t) => t.expo_push_token && t.expo_push_token !== sender_token);
  if (!targets.length) return json({ ok: true, sent: 0 });

  const messages = targets.map((t) => ({
    to: t.expo_push_token,
    sound: 'default',
    title: '⚠️ Low glucose alert',
    body: `${patient.name}: ${value || 'a low reading'} was logged. Please check in.`,
    data: { patient_id },
  }));

  const resp = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = await resp.json().catch(() => ({}));
  return json({ ok: true, sent: messages.length, result });
});
