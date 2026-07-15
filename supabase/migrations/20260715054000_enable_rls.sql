alter table public.users enable row level security;
alter table public.cycles enable row level security;
alter table public.notifications enable row level security;
alter table public.donations enable row level security;
alter table public.feedback enable row level security;
alter table public.symptoms enable row level security;

notify pgrst, 'reload schema';
