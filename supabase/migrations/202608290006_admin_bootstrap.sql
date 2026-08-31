-- The first administrator is provisioned through a one-time application flow.
-- No browser role flag or public registration route can create an admin.

create table if not exists public.admin_bootstrap_state (
  singleton boolean primary key default true check (singleton),
  setup_token uuid,
  reserved_until timestamptz,
  first_admin_user_id uuid references auth.users(id) on delete restrict,
  setup_completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.admin_bootstrap_state enable row level security;
revoke all on table public.admin_bootstrap_state from public, anon, authenticated;

create or replace function public.claim_first_admin_bootstrap()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim uuid := gen_random_uuid();
  state public.admin_bootstrap_state;
begin
  -- Serialises independent requests without relying on a browser session.
  perform pg_advisory_xact_lock(290006);

  if exists (select 1 from public.profiles where role = 'admin'::public.app_role) then
    raise exception using errcode = 'P0001', message = 'FIRST_ADMIN_EXISTS';
  end if;

  select * into state from public.admin_bootstrap_state where singleton = true for update;
  if found and state.setup_completed_at is not null then
    raise exception using errcode = 'P0001', message = 'FIRST_ADMIN_EXISTS';
  end if;
  if found and state.reserved_until is not null and state.reserved_until > clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'FIRST_ADMIN_SETUP_IN_PROGRESS';
  end if;

  insert into public.admin_bootstrap_state (singleton, setup_token, reserved_until)
  values (true, claim, clock_timestamp() + interval '10 minutes')
  on conflict (singleton) do update
    set setup_token = excluded.setup_token,
        reserved_until = excluded.reserved_until,
        updated_at = clock_timestamp();

  return claim;
end;
$$;

create or replace function public.complete_first_admin_bootstrap(claim uuid, admin_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  state public.admin_bootstrap_state;
begin
  select * into state from public.admin_bootstrap_state where singleton = true for update;
  if not found or state.setup_token is distinct from claim or state.reserved_until is null or state.reserved_until <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'FIRST_ADMIN_SETUP_INVALID';
  end if;
  if exists (select 1 from public.profiles where role = 'admin'::public.app_role and user_id <> admin_user_id) then
    raise exception using errcode = 'P0001', message = 'FIRST_ADMIN_EXISTS';
  end if;
  if not exists (select 1 from public.profiles where user_id = admin_user_id and role = 'admin'::public.app_role) then
    raise exception using errcode = 'P0001', message = 'FIRST_ADMIN_PROFILE_INVALID';
  end if;

  update public.admin_bootstrap_state
    set first_admin_user_id = admin_user_id,
        setup_completed_at = clock_timestamp(),
        setup_token = null,
        reserved_until = null,
        updated_at = clock_timestamp()
  where singleton = true;
end;
$$;

create or replace function public.release_first_admin_bootstrap(claim uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.admin_bootstrap_state
    set setup_token = null,
        reserved_until = null,
        updated_at = clock_timestamp()
  where singleton = true
    and setup_token = claim
    and setup_completed_at is null;
end;
$$;

revoke all on function public.claim_first_admin_bootstrap() from public, anon, authenticated;
revoke all on function public.complete_first_admin_bootstrap(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_first_admin_bootstrap(uuid) from public, anon, authenticated;
grant execute on function public.claim_first_admin_bootstrap() to service_role;
grant execute on function public.complete_first_admin_bootstrap(uuid, uuid) to service_role;
grant execute on function public.release_first_admin_bootstrap(uuid) to service_role;
