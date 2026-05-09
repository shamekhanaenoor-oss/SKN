DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'founder@admin.local';
  v_password text := 'Baloch@khan925454';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Founder"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, v_user_id::text, jsonb_build_object('sub', v_user_id::text, 'email', v_email), 'email', now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt(v_password, gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE id = v_user_id;
  END IF;
  INSERT INTO public.profiles (id, full_name, is_active) VALUES (v_user_id, 'Founder', true)
    ON CONFLICT (id) DO UPDATE SET is_active = true;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_usernames (user_id, username, email) VALUES (v_user_id, 'founder', v_email)
    ON CONFLICT (username) DO UPDATE SET user_id = EXCLUDED.user_id, email = EXCLUDED.email;
END $$;