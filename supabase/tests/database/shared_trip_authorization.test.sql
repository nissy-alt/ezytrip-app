begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(36);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'editor@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'outsider@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'joiner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'viewer-joiner@example.test', '', now(), now(), now());

insert into public.trips (id, owner_id, name, starts_on, ends_on)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Shared fixture trip', '2026-11-01', '2026-11-02'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'Private fixture trip', '2026-11-01', '2026-11-01');

insert into public.trip_members (trip_id, user_id, role)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'editor'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'viewer');

insert into public.trip_days (id, trip_id, day_date, title)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-11-01', 'Day one'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '2026-11-02', 'Day two'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '2026-11-01', 'Private day');

insert into public.activities (
  id, trip_id, trip_day_id, scheduled_time, title, place_name, detail
)
values (
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '09:00',
  'Breakfast',
  'Breakfast',
  ''
);

insert into public.invite_codes (
  trip_id, code_hash, role, expires_at, max_uses, used_count, revoked_at, created_by
)
values
  ('20000000-0000-0000-0000-000000000001', encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'), 'editor', now() + interval '7 days', 2, 0, null, '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', encode(extensions.digest(repeat('b', 64), 'sha256'), 'hex'), 'viewer', now() + interval '7 days', 1, 0, null, '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', encode(extensions.digest(repeat('c', 64), 'sha256'), 'hex'), 'editor', now() - interval '1 minute', 1, 0, null, '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', encode(extensions.digest(repeat('d', 64), 'sha256'), 'hex'), 'editor', now() + interval '7 days', 1, 0, now(), '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', encode(extensions.digest(repeat('e', 64), 'sha256'), 'hex'), 'editor', now() + interval '7 days', 1, 1, null, '10000000-0000-0000-0000-000000000001');

select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.trips'::regclass),
  'RLS is enabled on trips'
);
select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.trip_members'::regclass),
  'RLS is enabled on trip_members'
);
select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.trip_days'::regclass),
  'RLS is enabled on trip_days'
);
select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.activities'::regclass),
  'RLS is enabled on activities'
);
select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.invite_codes'::regclass),
  'RLS is enabled on invite_codes'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.trips', 'select'),
  'anon has no table-level read grant'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.create_trip(text,date,date)', 'execute'),
  'anon cannot create a trip'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select extensions.is(
  (select count(*) from public.trips where id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'owner can read their trip'
);
select extensions.is(
  (select public.create_trip_invite(
    '20000000-0000-0000-0000-000000000001',
    'viewer',
    now() + interval '1 day',
    2
  )->>'role'),
  'viewer',
  'owner can create a viewer invite'
);
select extensions.lives_ok(
  $$select public.create_trip('Atomic trip', date '2026-11-03', date '2026-11-04')$$,
  'owner can create a trip'
);
reset role;
select extensions.is(
  (select count(*) from public.trip_members m
   join public.trips t on t.id = m.trip_id
   where t.name = 'Atomic trip'
     and m.user_id = '10000000-0000-0000-0000-000000000001'
     and m.role = 'owner'),
  1::bigint,
  'trip creation creates owner membership in the same transaction'
);
select extensions.is(
  (select count(*) from public.trip_days d
   join public.trips t on t.id = d.trip_id
   where t.name = 'Atomic trip'),
  2::bigint,
  'trip creation creates one day for each trip date'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select extensions.is(
  (select count(*) from public.activities where trip_id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'editor can read the shared itinerary'
);
select extensions.throws_ok(
  $$select public.create_trip_invite(
    '20000000-0000-0000-0000-000000000001',
    'viewer',
    now() + interval '1 day',
    1
  )$$,
  '42501',
  null,
  'editor cannot create owner-only invites'
);
select extensions.lives_ok(
  $$insert into public.activities (
    trip_id, trip_day_id, scheduled_time, title, place_name, detail
  ) values (
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '11:00',
    'Museum',
    'Museum',
    'Visit'
  )$$,
  'editor can add an activity'
);
select extensions.is(
  (select count(*) from public.activities where trip_id = '20000000-0000-0000-0000-000000000001'),
  2::bigint,
  'editor activity is stored'
);
select extensions.throws_ok(
  $$update public.activities
    set detail = 'Unversioned change'
    where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'editor cannot bypass the versioned update function'
);
select extensions.is(
  (select (public.update_trip_activity(
    '40000000-0000-0000-0000-000000000001',
    1,
    '09:00',
    'Breakfast',
    'Breakfast',
    'Updated'
  )).version),
  2,
  'versioned activity updates increment the optimistic version'
);
select extensions.throws_ok(
  $$select public.update_trip_activity(
    '40000000-0000-0000-0000-000000000001',
    1,
    '09:00',
    'Stale',
    'Stale',
    ''
  )$$,
  '40001',
  null,
  'stale activity edits are rejected'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select extensions.is(
  (select count(*) from public.activities where trip_id = '20000000-0000-0000-0000-000000000001'),
  2::bigint,
  'viewer can read the shared itinerary'
);
select extensions.throws_ok(
  $$insert into public.activities (
    trip_id, trip_day_id, scheduled_time, title, place_name
  ) values (
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '12:00',
    'Denied',
    'Denied'
  )$$,
  '42501',
  null,
  'viewer cannot add activities'
);
select extensions.throws_ok(
  $$update public.activities set detail = 'Viewer change'
    where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'viewer cannot update activities'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
set local role authenticated;
select extensions.is(
  (select count(*) from public.trips where id = '20000000-0000-0000-0000-000000000001'),
  0::bigint,
  'outsider cannot read another trip'
);
select extensions.is(
  (select count(*) from public.activities where trip_id = '20000000-0000-0000-0000-000000000001'),
  0::bigint,
  'outsider cannot read another itinerary'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
set local role authenticated;
select extensions.is(
  (public.redeem_trip_invite(repeat('a', 64))->>'status'),
  'joined',
  'valid invite adds a member'
);
select extensions.is(
  (public.redeem_trip_invite(repeat('a', 64))->>'status'),
  'already_member',
  'repeated redemption does not consume quota or alter membership'
);
select extensions.is(
  (public.redeem_trip_invite(repeat('b', 64))->>'status'),
  'already_member',
  'repeated redemption with a different role does not alter the existing role'
);
select extensions.is(
  (public.redeem_trip_invite(repeat('c', 64))->>'status'),
  'expired',
  'expired invite is rejected'
);
select extensions.is(
  (public.redeem_trip_invite(repeat('d', 64))->>'status'),
  'revoked',
  'revoked invite is rejected'
);
select extensions.is(
  (public.redeem_trip_invite(repeat('e', 64))->>'status'),
  'exhausted',
  'fully used invite is rejected'
);
select extensions.is(
  (public.redeem_trip_invite('invalid')->>'status'),
  'invalid',
  'malformed invite is rejected'
);
select public.redeem_trip_invite('invalid')
from generate_series(1, 6);
select extensions.is(
  (public.redeem_trip_invite('invalid')->>'status'),
  'rate_limited',
  'invite attempts are rate limited per account'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000006', true);
set local role authenticated;
select extensions.is(
  (public.redeem_trip_invite(repeat('b', 64))->>'status'),
  'joined',
  'viewer invite grants membership'
);
reset role;

select extensions.is(
  (select used_count from public.invite_codes
   where code_hash = encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex')),
  1,
  'repeated redemption consumes exactly one invite use'
);
select extensions.is(
  (select role from public.trip_members
   where trip_id = '20000000-0000-0000-0000-000000000001'
     and user_id = '10000000-0000-0000-0000-000000000005'),
  'editor',
  'membership keeps the role from the first successful redemption'
);
select extensions.is(
  (select role from public.trip_members
   where trip_id = '20000000-0000-0000-0000-000000000001'
     and user_id = '10000000-0000-0000-0000-000000000006'),
  'viewer',
  'viewer invite grants read-only role'
);
select * from extensions.finish();
rollback;
