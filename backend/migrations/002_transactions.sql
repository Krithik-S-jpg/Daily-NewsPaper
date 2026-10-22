create function public.enqueue_scheduled(p_user uuid,p_due timestamptz,p_next timestamptz) returns void language plpgsql security definer set search_path=public as $$
begin
  perform 1 from delivery_preferences where user_id=p_user and next_run_at=p_due for update;
  if not found then return; end if;
  insert into generation_jobs(user_id,run_key) values(p_user,'scheduled:'||p_due::text) on conflict(user_id,run_key) do nothing;
  update delivery_preferences set next_run_at=p_next where user_id=p_user;
end $$;

create function public.save_preferences(p_user uuid,p_preferences jsonb,p_next timestamptz) returns void language plpgsql security definer set search_path=public as $$
declare topic text; tid uuid; begin
  insert into profiles(user_id,preferences,onboarded) values(p_user,p_preferences,true)
    on conflict(user_id) do update set preferences=excluded.preferences,onboarded=true;
  insert into delivery_preferences(user_id,timezone,local_time,days,email,next_run_at)
    values(p_user,p_preferences->>'timezone',(p_preferences->>'time')::time,
      array(select jsonb_array_elements_text(p_preferences->'days')::integer),
      (p_preferences->>'email')::boolean,p_next)
    on conflict(user_id) do update set timezone=excluded.timezone,local_time=excluded.local_time,
      days=excluded.days,email=excluded.email,next_run_at=excluded.next_run_at;
  delete from user_topics where user_id=p_user;
  for topic in select jsonb_array_elements_text(p_preferences->'topics') loop
    insert into topics(name,slug) values(topic,md5(topic))
      on conflict(name) do update set name=excluded.name returning id into tid;
    insert into user_topics(user_id,topic_id) values(p_user,tid) on conflict do nothing;
  end loop;
end $$;
revoke all on function public.enqueue_scheduled(uuid,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.save_preferences(uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.enqueue_scheduled(uuid,timestamptz,timestamptz) to service_role;
grant execute on function public.save_preferences(uuid,jsonb,timestamptz) to service_role;
