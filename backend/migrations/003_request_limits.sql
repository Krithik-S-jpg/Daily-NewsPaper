create table public.request_budgets (
 user_id uuid not null references auth.users on delete cascade,
 operation text not null, window_start timestamptz not null default now(), requests integer not null default 1,
 primary key(user_id,operation)
);
alter table public.request_budgets enable row level security;
create function public.consume_budget(p_user uuid,p_operation text,p_limit integer) returns boolean language plpgsql security definer set search_path=public as $$
declare current_count integer; begin
 insert into request_budgets(user_id,operation) values(p_user,p_operation)
 on conflict(user_id,operation) do update set
 requests=case when request_budgets.window_start<now()-interval '1 minute' then 1 else request_budgets.requests+1 end,
 window_start=case when request_budgets.window_start<now()-interval '1 minute' then now() else request_budgets.window_start end
 returning requests into current_count;
 return current_count<=p_limit;
end $$;
revoke all on function public.consume_budget(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.consume_budget(uuid,text,integer) to service_role;
