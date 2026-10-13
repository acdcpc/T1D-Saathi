// Supabase Edge Function: notify-clinicians
// Sends Expo push notifications to the patient's assigned clinicians and full-access staff
// when the family requests a regimen review/change.
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

  let body: { patient_id?: string; note?: string; sender_token?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { patient_id, note, sender_token } = body || {};
  if (!patient_id) return json({ error: 'patient_id required' }, 400);

  const { data: patient } = await admin
    .from('patients')
    .select('id,user_id,name')
    .eq('id', patient_id)
    .maybeSingle();
  if (!patient) return json({ error: 'Patient not found' }, 404);

  // Authorize the caller: parent of the patient, assigned clinician, or full-access staff.
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
      const { data: ae } = await admin
        .from('admin_emails')
        .select('email')
        .eq('email', email)
        .eq('full_access', true)
        .maybeSingle();
      allowed = !!ae;
    }
  }
  if (!allowed) return json({ error: 'Forbidden' }, 403);

  // Recipients: the patient's care-team clinicians and full-access staff, minus the caller.
  const recipientIds = new Set<string>();
  const { data: team } = await admin
    .from('care_team')
    .select('clinician_id')
    .eq('patient_id', patient_id);
  for (const t of team || []) recipientIds.add(t.clinician_id);

  const { data: staff } = await admin
    .from('admin_emails')
    .select('email')
    .eq('full_access', true);
  const staffEmails = new Set(
    (staff || []).map((s) => (s.email || '').toLowerCase()).filter(Boolean),
  );
  if (staffEmails.size > 0) {
    const { data: userPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of userPage?.users || []) {
      const em = (u.email || '').toLowerCase();
      if (em && staffEmails.has(em)) recipientIds.add(u.id);
    }
  }

  recipientIds.delete(caller);

  const ids = Array.from(recipientIds);
  if (!ids.length) return json({ ok: true, sent: 0 });

  const { data: tokens } = await admin
    .from('push_tokens')
    .select('expo_push_token,user_id')
    .in('user_id', ids);
  const targets = (tokens || []).filter(
    (t) => t.expo_push_token && t.expo_push_token !== sender_token,
  );
  if (!targets.length) return json({ ok: true, sent: 0 });

  const trimmedNote = (note || '').trim();
  const alertBody = trimmedNote
    ? trimmedNote.slice(0, 140)
    : 'The family asked for a regimen review. Open your clinician view to review and update it.';

  const messages = targets.map((t) => ({
    to: t.expo_push_token,
    sound: 'default',
    title: `🩺 ${patient.name}: regimen review requested`,
    body: alertBody,
    data: { patient_id },
  }));

  try {
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await resp.json().catch(() => ({}));
    return json({ ok: true, sent: messages.length, result });
  } catch (sendErr) {
    console.error('notify-clinicians: push send failed', sendErr);
    return json({ ok: true, sent: 0 });
  }
});
