-- Keep one canonical row for start dates that were accidentally delivered
-- more than once before database-level idempotency was added. Prefer a closed
-- row, then the oldest row, so completed history is not replaced by an open
-- duplicate.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, period_start
      order by (period_end is not null) desc, created_at asc, id asc
    ) as duplicate_rank
  from public.cycles
)
delete from public.cycles
where id in (select id from ranked where duplicate_rank > 1);

create unique index if not exists cycles_user_period_start_unique_idx
  on public.cycles(user_id, period_start);

notify pgrst, 'reload schema';
