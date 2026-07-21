alter table public.users
add column if not exists health_data_consent_at timestamptz;

comment on column public.users.health_data_consent_at is
  'Timestamp of explicit consent to process cycle-related health data.';

notify pgrst, 'reload schema';
