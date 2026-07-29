-- Demo seed data for local development (plan §21 "Seed-Skript für Demo-Daten").
-- Runs after migrations on `supabase db reset`. Creates one demo account
-- with a published example form so the app has something to look at
-- immediately, without requiring a fresh registration + manual build.
--
-- Login: demo@example.com / demo-password-123!

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_workspace_id uuid;
  v_form_id uuid := '00000000-0000-0000-0000-000000000002';
  v_version_id uuid := '00000000-0000-0000-0000-000000000003';
  v_definition jsonb;
begin
  -- Seeding auth.users directly (rather than through the Auth API) is the
  -- standard local-dev approach; the `handle_new_user` trigger (0002) fires
  -- on this insert exactly as it would for a real signup, creating the
  -- profile + personal workspace + owner membership automatically.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'demo@example.com',
    crypt('demo-password-123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Demo Nutzer"}',
    now(),
    now()
  )
  on conflict (id) do nothing;

  select id into v_workspace_id from public.workspaces where owner_id = v_user_id limit 1;

  v_definition := '{
    "schemaVersion": 1,
    "metadata": { "title": "Kontaktformular", "description": "Beispiel-Formular", "language": "de" },
    "settings": {
      "progressDisplay": "bar",
      "allowBack": true,
      "allowMultipleSubmissions": true,
      "captchaEnabled": false,
      "honeypotEnabled": true
    },
    "theme": {
      "colorPrimary": "#0d9488",
      "colorBackground": "#f8fafc",
      "colorText": "#0f172a",
      "fontFamily": "Inter",
      "fontSizeBase": 16,
      "containerWidth": 680,
      "spacing": "comfortable",
      "borderRadius": "md",
      "buttonStyle": "solid",
      "inputStyle": "outline"
    },
    "pages": [
      {
        "id": "pg_contact",
        "title": "Kontaktdaten",
        "fields": [
          {
            "id": "fld_name",
            "key": "name",
            "type": "short_text",
            "label": "Dein Name",
            "required": true
          },
          {
            "id": "fld_email",
            "key": "email",
            "type": "email",
            "label": "Deine E-Mail-Adresse",
            "required": true
          },
          {
            "id": "fld_message",
            "key": "message",
            "type": "long_text",
            "label": "Deine Nachricht",
            "required": false
          }
        ]
      }
    ],
    "conditions": [],
    "endings": [
      { "id": "end_default", "title": "Vielen Dank!", "description": "Wir melden uns bald.", "isDefault": true }
    ]
  }'::jsonb;

  insert into public.forms (
    id, workspace_id, title, slug, status,
    draft_definition, draft_revision, schema_version,
    published_version_id, created_by
  ) values (
    v_form_id, v_workspace_id, 'Kontaktformular', 'kontaktformular-demo', 'published',
    v_definition, 1, 1,
    v_version_id, v_user_id
  )
  on conflict (id) do nothing;

  insert into public.form_versions (id, form_id, version_number, schema_version, definition, created_by)
  values (v_version_id, v_form_id, 1, 1, v_definition, v_user_id)
  on conflict (id) do nothing;

  update public.forms set published_version_id = v_version_id, status = 'published'
  where id = v_form_id and published_version_id is null;
end $$;
