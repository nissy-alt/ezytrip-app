create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (ends_on - starts_on <= 60)
);

create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index trip_members_user_trip_idx
  on public.trip_members (user_id, trip_id);

create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_date date not null,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trip_id),
  unique (trip_id, day_date)
);

create index trip_days_trip_date_idx
  on public.trip_days (trip_id, day_date);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  trip_day_id uuid not null,
  scheduled_time time without time zone not null,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  place_name text not null check (char_length(btrim(place_name)) between 1 and 120),
  detail text not null default '' check (char_length(detail) <= 500),
  latitude double precision,
  longitude double precision,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (trip_day_id, trip_id)
    references public.trip_days (id, trip_id)
    on delete cascade,
  check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  )
);

create index activities_trip_day_time_idx
  on public.activities (trip_id, trip_day_id, scheduled_time, id);

create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  role text not null check (role in ('editor', 'viewer')),
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses between 1 and 20),
  used_count integer not null default 0 check (used_count between 0 and max_uses),
  revoked_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index invite_codes_trip_created_idx
  on public.invite_codes (trip_id, created_at desc);

create table public.invite_redemption_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.bump_activity_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trips_touch_updated_at
before update on public.trips
for each row execute function public.touch_updated_at();

create trigger trip_days_touch_updated_at
before update on public.trip_days
for each row execute function public.touch_updated_at();

create trigger activities_bump_version
before update on public.activities
for each row execute function public.bump_activity_version();

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members m
    where m.trip_id = p_trip_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members m
    where m.trip_id = p_trip_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and t.owner_id = (select auth.uid())
  );
$$;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_days enable row level security;
alter table public.activities enable row level security;
alter table public.invite_codes enable row level security;
alter table public.invite_redemption_limits enable row level security;

create policy trips_member_read
on public.trips for select
to authenticated
using ((select public.is_trip_member(id)));

create policy trips_owner_rename
on public.trips for update
to authenticated
using ((select public.is_trip_owner(id)))
with check ((select public.is_trip_owner(id)));

create policy trip_members_member_read
on public.trip_members for select
to authenticated
using ((select public.is_trip_member(trip_id)));

create policy trip_days_member_read
on public.trip_days for select
to authenticated
using ((select public.is_trip_member(trip_id)));

create policy trip_days_editor_update
on public.trip_days for update
to authenticated
using ((select public.can_edit_trip(trip_id)))
with check ((select public.can_edit_trip(trip_id)));

create policy activities_member_read
on public.activities for select
to authenticated
using ((select public.is_trip_member(trip_id)));

create policy activities_editor_insert
on public.activities for insert
to authenticated
with check (
  (select public.can_edit_trip(trip_id))
  and exists (
    select 1
    from public.trip_days d
    where d.id = trip_day_id
      and d.trip_id = activities.trip_id
  )
);

create policy activities_editor_delete
on public.activities for delete
to authenticated
using ((select public.can_edit_trip(trip_id)));

create policy invite_codes_owner_read
on public.invite_codes for select
to authenticated
using ((select public.is_trip_owner(trip_id)));

revoke all on table
  public.trips,
  public.trip_members,
  public.trip_days,
  public.activities,
  public.invite_codes,
  public.invite_redemption_limits
from anon, authenticated;

grant select on public.trips, public.trip_members, public.trip_days to authenticated;
grant update (name) on public.trips to authenticated;
grant update (title) on public.trip_days to authenticated;
grant select, insert, delete on public.activities to authenticated;
grant select (
  id, trip_id, role, expires_at, max_uses, used_count, revoked_at, created_at
) on public.invite_codes to authenticated;

grant usage on schema public to authenticated;
revoke all on function public.is_trip_member(uuid) from public, anon;
revoke all on function public.can_edit_trip(uuid) from public, anon;
revoke all on function public.is_trip_owner(uuid) from public, anon;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.can_edit_trip(uuid) to authenticated;
grant execute on function public.is_trip_owner(uuid) to authenticated;

create or replace function public.update_trip_activity(
  p_activity_id uuid,
  p_expected_version integer,
  p_scheduled_time time without time zone,
  p_title text,
  p_place_name text,
  p_detail text
)
returns public.activities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity public.activities%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select *
  into v_activity
  from public.activities a
  where a.id = p_activity_id
  for update;

  if not found or not public.can_edit_trip(v_activity.trip_id) then
    raise exception using errcode = '42501', message = 'Activity is not available';
  end if;

  if p_expected_version is null or v_activity.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Activity was updated by another member';
  end if;

  update public.activities a
  set scheduled_time = p_scheduled_time,
      title = p_title,
      place_name = p_place_name,
      detail = p_detail
  where a.id = p_activity_id
  returning * into v_activity;

  return v_activity;
end;
$$;

create or replace function public.create_trip(
  p_name text,
  p_starts_on date,
  p_ends_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
  v_day date;
  v_day_number integer := 1;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Trip name must be 1 to 80 characters';
  end if;

  if p_starts_on is null or p_ends_on is null
    or p_ends_on < p_starts_on
    or p_ends_on - p_starts_on > 60 then
    raise exception using errcode = '22023', message = 'Trip dates are invalid';
  end if;

  insert into public.trips (owner_id, name, starts_on, ends_on)
  values (v_user_id, btrim(p_name), p_starts_on, p_ends_on)
  returning id into v_trip_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, v_user_id, 'owner');

  v_day := p_starts_on;
  while v_day <= p_ends_on loop
    insert into public.trip_days (trip_id, day_date, title)
    values (v_trip_id, v_day, 'วันที่ ' || v_day_number);
    v_day := v_day + 1;
    v_day_number := v_day_number + 1;
  end loop;

  return v_trip_id;
end;
$$;

create or replace function public.create_trip_invite(
  p_trip_id uuid,
  p_role text,
  p_expires_at timestamptz,
  p_max_uses integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_invite_id uuid;
begin
  if auth.uid() is null or not public.is_trip_owner(p_trip_id) then
    raise exception using errcode = '42501', message = 'Trip owner permission required';
  end if;

  if p_role is null or p_role not in ('editor', 'viewer') then
    raise exception using errcode = '22023', message = 'Invite role must be editor or viewer';
  end if;

  if p_expires_at is null or p_expires_at <= now()
    or p_expires_at > now() + interval '30 days' then
    raise exception using errcode = '22023', message = 'Invite expiry must be within 30 days';
  end if;

  if p_max_uses is null or p_max_uses not between 1 and 20 then
    raise exception using errcode = '22023', message = 'Invite use limit must be 1 to 20';
  end if;

  v_code := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invite_codes (
    trip_id, code_hash, role, expires_at, max_uses, created_by
  )
  values (
    p_trip_id,
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    p_role,
    p_expires_at,
    p_max_uses,
    auth.uid()
  )
  returning id into v_invite_id;

  return jsonb_build_object(
    'id', v_invite_id,
    'code', v_code,
    'role', p_role,
    'expires_at', p_expires_at,
    'max_uses', p_max_uses
  );
end;
$$;

create or replace function public.revoke_trip_invite(p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.invite_codes i
  set revoked_at = now()
  where i.id = p_invite_id
    and i.revoked_at is null
    and public.is_trip_owner(i.trip_id);

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.redeem_trip_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.invite_codes%rowtype;
  v_hash text;
  v_attempts integer;
  v_existing_role text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_code is not null
    and char_length(p_code) = 64
    and p_code ~ '^[a-fA-F0-9]{64}$' then
    v_hash := encode(extensions.digest(lower(p_code), 'sha256'), 'hex');
    select *
    into v_invite
    from public.invite_codes i
    where i.code_hash = v_hash
    for update;

    if found then
      select m.role
      into v_existing_role
      from public.trip_members m
      where m.trip_id = v_invite.trip_id
        and m.user_id = v_user_id;

      if found then
        return jsonb_build_object(
          'status', 'already_member',
          'trip_id', v_invite.trip_id,
          'role', v_existing_role
        );
      end if;
    end if;
  end if;

  insert into public.invite_redemption_limits (user_id, window_started_at, attempt_count)
  values (v_user_id, now(), 1)
  on conflict (user_id) do update
  set window_started_at = case
        when public.invite_redemption_limits.window_started_at <= now() - interval '15 minutes'
          then now()
        else public.invite_redemption_limits.window_started_at
      end,
      attempt_count = case
        when public.invite_redemption_limits.window_started_at <= now() - interval '15 minutes'
          then 1
        else least(public.invite_redemption_limits.attempt_count + 1, 11)
      end
  returning attempt_count into v_attempts;

  if v_attempts > 10 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  if v_hash is null or v_invite.id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_invite.revoked_at is not null then
    return jsonb_build_object('status', 'revoked');
  end if;

  if v_invite.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    return jsonb_build_object('status', 'exhausted');
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, v_user_id, v_invite.role)
  on conflict (trip_id, user_id) do nothing;

  if not found then
    select m.role
    into v_existing_role
    from public.trip_members m
    where m.trip_id = v_invite.trip_id
      and m.user_id = v_user_id;

    return jsonb_build_object(
      'status', 'already_member',
      'trip_id', v_invite.trip_id,
      'role', v_existing_role
    );
  end if;

  update public.invite_codes
  set used_count = used_count + 1
  where id = v_invite.id;

  return jsonb_build_object(
    'status', 'joined',
    'trip_id', v_invite.trip_id,
    'role', v_invite.role
  );
end;
$$;

revoke all on function public.create_trip(text, date, date) from public, anon;
revoke all on function public.create_trip_invite(uuid, text, timestamptz, integer) from public, anon;
revoke all on function public.revoke_trip_invite(uuid) from public, anon;
revoke all on function public.redeem_trip_invite(text) from public, anon;
revoke all on function public.update_trip_activity(uuid, integer, time without time zone, text, text, text) from public, anon;
grant execute on function public.create_trip(text, date, date) to authenticated;
grant execute on function public.create_trip_invite(uuid, text, timestamptz, integer) to authenticated;
grant execute on function public.revoke_trip_invite(uuid) to authenticated;
grant execute on function public.redeem_trip_invite(text) to authenticated;
grant execute on function public.update_trip_activity(uuid, integer, time without time zone, text, text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activities'
    ) then
      alter publication supabase_realtime add table public.activities;
    end if;
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_days'
    ) then
      alter publication supabase_realtime add table public.trip_days;
    end if;
  end if;
end;
$$;
