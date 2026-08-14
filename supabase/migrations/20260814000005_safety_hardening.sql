-- Safety hardening for T1D Saathi.
-- Apply this migration before enabling any real-patient dosing workflow.

ALTER TABLE public.insulin_regimens
  ADD COLUMN IF NOT EXISTS approved_by_clinician BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_body_length CHECK (char_length(trim(body)) BETWEEN 1 AND 4000);

-- User metadata must never grant a clinician role. Role assignment belongs to an
-- administrator/controlled server workflow.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'parent'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'profile role changes require an administrator';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own non-role profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Parents may read their own approved regimen; only assigned clinicians can
-- create or change regimen approval data.
DROP POLICY IF EXISTS "Parents can manage regimens" ON public.insulin_regimens;
CREATE POLICY "Parents can read own regimens"
  ON public.insulin_regimens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = insulin_regimens.patient_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Parents can create unapproved regimens"
  ON public.insulin_regimens FOR INSERT
  WITH CHECK (
    approved_by_clinician = false
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = insulin_regimens.patient_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "Parents can update unapproved regimens"
  ON public.insulin_regimens FOR UPDATE
  USING (
    approved_by_clinician = false
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = insulin_regimens.patient_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (approved_by_clinician = false);

DROP POLICY IF EXISTS "Clinicians can read regimens" ON public.insulin_regimens;
CREATE POLICY "Clinicians can read assigned regimens"
  ON public.insulin_regimens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.care_team ct
    WHERE ct.patient_id = insulin_regimens.patient_id AND ct.clinician_id = auth.uid()
  ));
CREATE POLICY "Clinicians can approve assigned regimens"
  ON public.insulin_regimens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.care_team ct
    WHERE ct.patient_id = insulin_regimens.patient_id AND ct.clinician_id = auth.uid()
  ))
  WITH CHECK (
    approved_by_clinician = true
    AND approved_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can send/receive messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can read related messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );
CREATE POLICY "Users can send related messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.care_team ct
      WHERE ct.patient_id = messages.patient_id
        AND (ct.clinician_id = auth.uid() OR ct.clinician_id = messages.recipient_id)
    )
  );
