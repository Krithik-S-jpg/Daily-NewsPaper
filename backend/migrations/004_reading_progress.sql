-- Apply after 003. Position belongs to the same user as its edition.
alter table public.editions add constraint editions_id_owner_unique unique(id,user_id);
create table public.reading_progress (
  user_id uuid not null references auth.users on delete cascade,
  edition_id uuid not null,
  mode text not null check(mode in ('phone','spread')),
  page integer not null check(page between 0 and 10000),
  updated_at timestamptz not null default now(),
  primary key(user_id,edition_id,mode),
  foreign key(edition_id,user_id) references public.editions(id,user_id) on delete cascade
);
alter table public.reading_progress enable row level security;
create policy reading_progress_owner on public.reading_progress for select to authenticated using(auth.uid()=user_id);
grant all on public.reading_progress to service_role;
grant select on public.reading_progress to authenticated;
