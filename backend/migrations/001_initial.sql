-- Run in a new Supabase project's SQL editor. Service role stays on the backend.
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null default '', preferences jsonb not null default '{}',
  onboarded boolean not null default false, created_at timestamptz not null default now()
);
create table public.topics (id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique);
create table public.user_topics (user_id uuid references auth.users on delete cascade, topic_id uuid references public.topics on delete cascade, weight numeric default 1, primary key(user_id,topic_id));
create table public.connected_sources (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  kind text not null check(kind in ('rss','github','youtube','reddit')), name text not null,
  url text not null, enabled boolean not null default true, status text not null default 'Ready',
  last_retrieved_at timestamptz, created_at timestamptz not null default now(), unique(user_id,kind,url)
);
create table public.source_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  source_id uuid not null references public.connected_sources on delete cascade,
  content_hash text not null, url text not null, content jsonb not null,
  retrieved_at timestamptz not null default now(), unique(source_id,content_hash)
);
create table public.editions (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  date date not null, timezone text not null, title text not null,
  content jsonb not null, created_at timestamptz not null default now()
);
create table public.articles (
  id uuid primary key, edition_id uuid not null references public.editions on delete cascade,
  user_id uuid not null references auth.users on delete cascade, position integer not null, content jsonb not null,
  unique(edition_id,position), unique(id,user_id)
);
create table public.user_bookmarks (
  user_id uuid not null references auth.users on delete cascade, article_id uuid not null,
  created_at timestamptz not null default now(), primary key(user_id,article_id),
  foreign key(article_id,user_id) references public.articles(id,user_id) on delete cascade
);
create table public.delivery_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  timezone text not null default 'Asia/Kolkata', local_time time not null default '07:00',
  days integer[] not null default array[0,1,2,3,4,5,6], email boolean not null default false,
  next_run_at timestamptz
);
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  edition_id uuid not null default gen_random_uuid(), run_key text not null,
  status text not null default 'queued' check(status in ('queued','collecting','processing','composing','publishing','completed','failed')),
  attempts integer not null default 0, available_at timestamptz not null default now(),
  locked_until timestamptz, lease_token uuid, error text, created_at timestamptz not null default now(),
  completed_at timestamptz, unique(user_id,run_key)
);
create table public.delivery_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  edition_id uuid not null references public.editions on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','delivered','failed','disabled','unconfigured')),
  provider_message_id text, attempts integer not null default 0, created_at timestamptz not null default now(),
  unique(edition_id)
);
create index on public.connected_sources(user_id);
create index on public.editions(user_id,created_at desc);
create index on public.generation_jobs(status,available_at);
create index on public.delivery_preferences(next_run_at);
create index on public.articles(user_id);

do $$ declare tab text; begin
  foreach tab in array array['profiles','user_topics','connected_sources','source_items','editions','articles','user_bookmarks','delivery_preferences','generation_jobs','delivery_logs'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)',tab);
  end loop;
end $$;
alter table public.topics enable row level security;
create policy topics_read on public.topics for select to authenticated using (true);
-- All mutations go through authenticated server endpoints. Authenticated clients cannot
-- create their own editions, jobs, delivery statuses, or change ownership.

create function public.claim_job() returns setof public.generation_jobs language plpgsql security definer set search_path=public as $$
begin
  update generation_jobs set status='failed',error='Retry limit exceeded',locked_until=null
    where attempts>=3 and status not in ('completed','failed') and locked_until<now();
  return query update generation_jobs set status='collecting', attempts=attempts+1,
    lease_token=gen_random_uuid(), locked_until=now()+interval '10 minutes'
    where id=(select id from generation_jobs where attempts<3 and available_at<=now()
      and (status='queued' or (status not in ('completed','failed') and locked_until<now()))
      order by created_at for update skip locked limit 1) returning *;
end $$;

create function public.enqueue_manual(p_user uuid) returns public.generation_jobs language plpgsql security definer set search_path=public as $$
declare result generation_jobs; begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  select * into result from generation_jobs where user_id=p_user and status not in ('completed','failed') order by created_at desc limit 1;
  if found then return result; end if;
  if exists(select 1 from generation_jobs where user_id=p_user and created_at>now()-interval '5 minutes') then
    raise exception 'Please wait five minutes between editions';
  end if;
  insert into generation_jobs(user_id,run_key) values(p_user,'manual:'||gen_random_uuid()) returning * into result;
  return result;
end $$;

create function public.publish_edition(p_job uuid,p_lease uuid,p_content jsonb,p_timezone text) returns void language plpgsql security definer set search_path=public as $$
declare job generation_jobs; story jsonb; pos integer:=0; begin
  select * into job from generation_jobs where id=p_job and lease_token=p_lease and locked_until>now() for update;
  if not found then raise exception 'Lease expired'; end if;
  if exists(select 1 from editions where id=job.edition_id) then return; end if;
  insert into editions(id,user_id,date,timezone,title,content) values(job.edition_id,job.user_id,(p_content->>'date')::date,p_timezone,p_content->>'title',p_content);
  for story in select * from jsonb_array_elements(p_content->'articles') loop
    insert into articles(id,edition_id,user_id,position,content) values((story->>'id')::uuid,job.edition_id,job.user_id,pos,story);
    pos:=pos+1;
  end loop;
  insert into delivery_logs(user_id,edition_id) values(job.user_id,job.edition_id) on conflict do nothing;
end $$;
-- RPCs are worker/server only: never callable with an anonymous or user JWT.
revoke all on function public.claim_job() from public,anon,authenticated;
revoke all on function public.enqueue_manual(uuid) from public,anon,authenticated;
revoke all on function public.publish_edition(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_job() to service_role;
grant execute on function public.enqueue_manual(uuid) to service_role;
grant execute on function public.publish_edition(uuid,uuid,jsonb,text) to service_role;
