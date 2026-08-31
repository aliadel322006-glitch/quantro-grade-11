-- Private fixed-curriculum access. Raw access codes are never stored.

alter table public.profiles
  add column if not exists curriculum_access_granted_at timestamptz;

-- Existing rostered students retain their learning access during the migration.
update public.profiles p
set curriculum_access_granted_at = coalesce(p.curriculum_access_granted_at, statement_timestamp())
where p.role = 'student'
  and exists (select 1 from public.memberships m where m.user_id = p.user_id and m.member_role = 'student');

create type public.access_code_type as enum ('general', 'class');

create table public.access_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  code_hash text not null unique,
  code_type public.access_code_type not null,
  class_id uuid references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id) on delete restrict default auth.uid(),
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz,
  max_uses integer,
  current_uses integer not null default 0,
  active boolean not null default true,
  revoked_at timestamptz,
  constraint access_codes_hash check (code_hash ~ '^[a-f0-9]{64}$'),
  constraint access_codes_class_shape check ((code_type = 'general' and class_id is null) or (code_type = 'class' and class_id is not null)),
  constraint access_codes_usage check (current_uses >= 0 and (max_uses is null or max_uses between 1 and 10000 and current_uses <= max_uses)),
  constraint access_codes_expiry check (expires_at is null or expires_at > created_at),
  constraint access_codes_revoked check ((active and revoked_at is null) or (not active))
);

create table public.access_code_redemptions (
  id uuid primary key default extensions.gen_random_uuid(),
  access_code_id uuid not null references public.access_codes(id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  redeemed_at timestamptz not null default statement_timestamp(),
  constraint access_code_redemptions_once unique (access_code_id, student_id)
);

create index access_codes_creator_idx on public.access_codes (created_by, active, created_at desc);
create index access_codes_class_idx on public.access_codes (class_id, active, created_at desc) where class_id is not null;
create index access_code_redemptions_student_idx on public.access_code_redemptions (student_id, redeemed_at desc);

create or replace function private.has_curriculum_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (p.role in ('teacher', 'admin') or p.curriculum_access_granted_at is not null)
  );
$$;

-- A server-only, row-locking redemption flow. A class code grants curriculum
-- access and safely adds a student to its class in the same transaction.
create or replace function public.redeem_curriculum_access_code(
  input_code_hash text,
  target_student_id uuid
)
returns table(status text, class_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_row public.access_codes%rowtype;
  target_role public.app_role;
  generated_learner_id text;
begin
  if not private.is_service_context() and auth.uid() is distinct from target_student_id then
    raise exception using errcode = '42501', message = 'server redemption required';
  end if;

  select * into access_row from public.access_codes where code_hash = input_code_hash for update;
  if not found then return query select 'INVALID'::text, null::uuid; return; end if;
  if not access_row.active then return query select 'DISABLED'::text, null::uuid; return; end if;
  if access_row.expires_at is not null and access_row.expires_at <= statement_timestamp() then return query select 'EXPIRED'::text, null::uuid; return; end if;
  if access_row.max_uses is not null and access_row.current_uses >= access_row.max_uses then return query select 'LIMIT_REACHED'::text, null::uuid; return; end if;

  select role into target_role from public.profiles where user_id = target_student_id for update;
  if target_role is distinct from 'student'::public.app_role then
    return query select 'INVALID'::text, null::uuid; return;
  end if;

  if exists (select 1 from public.access_code_redemptions r where r.access_code_id = access_row.id and r.student_id = target_student_id) then
    update public.profiles set curriculum_access_granted_at = coalesce(curriculum_access_granted_at, statement_timestamp()) where user_id = target_student_id;
    return query select 'ALREADY_REDEEMED'::text, access_row.class_id; return;
  end if;

  update public.access_codes set current_uses = current_uses + 1 where id = access_row.id;
  update public.profiles set curriculum_access_granted_at = coalesce(curriculum_access_granted_at, statement_timestamp()) where user_id = target_student_id;
  insert into public.access_code_redemptions (access_code_id, student_id, class_id) values (access_row.id, target_student_id, access_row.class_id);

  if access_row.class_id is not null then
    generated_learner_id := 'QAI-' || upper(replace(substr(target_student_id::text, 1, 12), '-', ''));
    insert into public.memberships (class_id, user_id, member_role, learner_id)
    values (access_row.class_id, target_student_id, 'student', generated_learner_id)
    on conflict (class_id, user_id) do nothing;
  end if;
  return query select 'REDEEMED'::text, access_row.class_id;
end;
$$;

alter table public.access_codes enable row level security;
alter table public.access_code_redemptions enable row level security;

create policy access_codes_select_manager on public.access_codes for select to authenticated
  using (private.is_admin() or (created_by = auth.uid() and private.has_app_role('teacher')) or (class_id is not null and private.teaches_class(class_id)));
create policy access_codes_insert_manager on public.access_codes for insert to authenticated
  with check (private.is_admin() or (created_by = auth.uid() and private.has_app_role('teacher') and (class_id is null or private.teaches_class(class_id))));
create policy access_codes_update_manager on public.access_codes for update to authenticated
  using (private.is_admin() or (created_by = auth.uid() and private.has_app_role('teacher')) or (class_id is not null and private.teaches_class(class_id)))
  with check (private.is_admin() or (created_by = auth.uid() and private.has_app_role('teacher') and (class_id is null or private.teaches_class(class_id))));
create policy access_codes_delete_manager on public.access_codes for delete to authenticated
  using (private.is_admin() or (created_by = auth.uid() and private.has_app_role('teacher')));
create policy access_code_redemptions_select_scoped on public.access_code_redemptions for select to authenticated
  using (student_id = auth.uid() or private.is_admin() or (class_id is not null and private.teaches_class(class_id)) or exists (select 1 from public.access_codes c where c.id = access_code_id and c.created_by = auth.uid()));

revoke all on table public.access_codes, public.access_code_redemptions from public, anon, authenticated;
grant select, insert, update, delete on public.access_codes to authenticated;
grant select on public.access_code_redemptions to authenticated;
grant all on public.access_codes, public.access_code_redemptions to service_role;
grant execute on function private.has_curriculum_access() to authenticated;
revoke all on function public.redeem_curriculum_access_code(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_curriculum_access_code(text, uuid) to service_role;

-- Curriculum metadata may be listed only after a student has been granted access.
drop policy if exists lessons_select_catalog on public.lessons;
create policy lessons_select_catalog on public.lessons for select to authenticated
  using (private.is_admin() or private.has_app_role('teacher') or (is_active and private.has_published_lesson(id) and private.has_curriculum_access()));
