alter table public.users
add column if not exists timezone text not null default 'Asia/Seoul';

notify pgrst, 'reload schema';
