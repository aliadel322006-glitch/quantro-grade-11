-- Shared teaching materials and globally published exams.
-- Classes and memberships remain deliberately outside this content scope.

do $$ begin
  create type public.global_exam_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.global_exam_question_type as enum ('mcq', 'true_false');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.global_exam_attempt_status as enum ('in_progress', 'submitted', 'expired');
exception when duplicate_object then null; end $$;

create table public.global_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  title jsonb not null,
  description jsonb,
  storage_bucket text not null default 'teaching-materials',
  storage_path text not null,
  original_file_name text not null,
  file_type text not null,
  byte_size integer not null,
  uploaded_by_teacher_id uuid not null references public.profiles(user_id) on delete restrict default auth.uid(),
  uploaded_by_name text not null default '',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint global_resources_title_localized check (private.is_localized_text(title)),
  constraint global_resources_description_localized check (description is null or private.is_localized_text(description)),
  constraint global_resources_file_type check (file_type in ('pdf', 'ppt', 'pptx')),
  constraint global_resources_bucket check (storage_bucket = 'teaching-materials'),
  constraint global_resources_file_name check (char_length(btrim(original_file_name)) between 1 and 255),
  constraint global_resources_size check (byte_size between 1 and 20971520),
  constraint global_resources_safe_path check (storage_path !~ '(^|/)\.\.(/|$)' and storage_path !~ '^/' and char_length(storage_path) between 1 and 500),
  constraint global_resources_storage_unique unique (storage_bucket, storage_path)
);

create table public.global_exams (
  id uuid primary key default extensions.gen_random_uuid(),
  title jsonb not null,
  description jsonb,
  instructions jsonb,
  created_by_teacher_id uuid not null references public.profiles(user_id) on delete restrict default auth.uid(),
  created_by_name text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_minutes integer not null,
  status public.global_exam_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint global_exams_title_localized check (private.is_localized_text(title)),
  constraint global_exams_description_localized check (description is null or private.is_localized_text(description)),
  constraint global_exams_instructions_localized check (instructions is null or private.is_localized_text(instructions)),
  constraint global_exams_duration check (duration_minutes between 1 and 360),
  constraint global_exams_dates check (end_at > start_at),
  constraint global_exams_lifecycle check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
    or (status = 'archived' and published_at is not null)
  )
);

create table public.global_exam_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  exam_id uuid not null references public.global_exams(id) on delete cascade,
  position smallint not null,
  question_type public.global_exam_question_type not null,
  prompt jsonb not null,
  choices jsonb not null default '[]'::jsonb,
  correct_answer jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint global_exam_questions_position check (position > 0),
  constraint global_exam_questions_prompt_localized check (private.is_localized_text(prompt)),
  constraint global_exam_questions_choices_array check (jsonb_typeof(choices) = 'array' and octet_length(choices::text) <= 32768),
  constraint global_exam_questions_answer_size check (octet_length(correct_answer::text) <= 4096),
  constraint global_exam_questions_order_unique unique (exam_id, position)
);

create table public.global_exam_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  exam_id uuid not null references public.global_exams(id) on delete restrict,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  started_at timestamptz not null,
  effective_expires_at timestamptz not null,
  submitted_at timestamptz,
  status public.global_exam_attempt_status not null default 'in_progress',
  score numeric(8,2),
  max_score numeric(8,2),
  time_taken_seconds integer,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint global_exam_attempts_one_per_student unique (exam_id, student_id),
  constraint global_exam_attempts_expiry_after_start check (effective_expires_at > started_at),
  constraint global_exam_attempts_scores check ((score is null and max_score is null) or (score >= 0 and max_score >= 0 and score <= max_score)),
  constraint global_exam_attempts_time_taken check (time_taken_seconds is null or time_taken_seconds >= 0),
  constraint global_exam_attempts_submission check ((status = 'in_progress' and submitted_at is null) or (status in ('submitted', 'expired') and submitted_at is not null))
);

create table public.global_exam_answers (
  id uuid primary key default extensions.gen_random_uuid(),
  attempt_id uuid not null references public.global_exam_attempts(id) on delete cascade,
  question_id uuid not null references public.global_exam_questions(id) on delete restrict,
  answer jsonb not null,
  is_correct boolean,
  score numeric(8,2),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint global_exam_answers_once unique (attempt_id, question_id),
  constraint global_exam_answers_size check (octet_length(answer::text) <= 4096),
  constraint global_exam_answers_score check (score is null or score between 0 and 1)
);

create index global_resources_created_idx on public.global_resources (created_at desc);
create index global_exams_status_window_idx on public.global_exams (status, start_at, end_at);
create index global_exam_questions_exam_idx on public.global_exam_questions (exam_id, position);
create index global_exam_attempts_student_idx on public.global_exam_attempts (student_id, updated_at desc);
create index global_exam_attempts_exam_idx on public.global_exam_attempts (exam_id, status);
create index global_exam_answers_attempt_idx on public.global_exam_answers (attempt_id);

-- Store author names with the global content. That makes attribution readable to
-- every authorised user without broadening profiles-table visibility.
create or replace function private.set_global_resource_attribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(p.display_name, 'Teacher')
    into new.uploaded_by_name
    from public.profiles p
   where p.user_id = new.uploaded_by_teacher_id;
  return new;
end;
$$;

create or replace function private.set_global_exam_attribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(p.display_name, 'Teacher')
    into new.created_by_name
    from public.profiles p
   where p.user_id = new.created_by_teacher_id;
  return new;
end;
$$;

create trigger global_resources_set_attribution
before insert or update of uploaded_by_teacher_id on public.global_resources
for each row execute function private.set_global_resource_attribution();

create trigger global_exams_set_attribution
before insert or update of created_by_teacher_id on public.global_exams
for each row execute function private.set_global_exam_attribution();

create trigger global_resources_updated_at before update on public.global_resources for each row execute function private.set_updated_at();
create trigger global_exams_updated_at before update on public.global_exams for each row execute function private.set_updated_at();
create trigger global_exam_questions_updated_at before update on public.global_exam_questions for each row execute function private.set_updated_at();
create trigger global_exam_attempts_updated_at before update on public.global_exam_attempts for each row execute function private.set_updated_at();
create trigger global_exam_answers_updated_at before update on public.global_exam_answers for each row execute function private.set_updated_at();

create or replace function private.is_global_content_reader()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin()
    or private.has_app_role('teacher'::public.app_role)
    or (private.has_app_role('student'::public.app_role) and private.has_curriculum_access());
$$;

create or replace function private.can_manage_global_exam(target_exam_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists (
    select 1 from public.global_exams e
    where e.id = target_exam_id and e.created_by_teacher_id = auth.uid()
      and private.has_app_role('teacher'::public.app_role)
  );
$$;

alter table public.global_resources enable row level security;
alter table public.global_exams enable row level security;
alter table public.global_exam_questions enable row level security;
alter table public.global_exam_attempts enable row level security;
alter table public.global_exam_answers enable row level security;

create policy global_resources_select_all_readers on public.global_resources for select to authenticated using (private.is_global_content_reader());
create policy global_resources_insert_teacher on public.global_resources for insert to authenticated with check ((private.is_admin() or private.has_app_role('teacher'::public.app_role)) and uploaded_by_teacher_id = auth.uid());
create policy global_resources_update_owner on public.global_resources for update to authenticated using (private.is_admin() or (uploaded_by_teacher_id = auth.uid() and private.has_app_role('teacher'::public.app_role))) with check (private.is_admin() or (uploaded_by_teacher_id = auth.uid() and private.has_app_role('teacher'::public.app_role)));
create policy global_resources_delete_owner on public.global_resources for delete to authenticated using (private.is_admin() or (uploaded_by_teacher_id = auth.uid() and private.has_app_role('teacher'::public.app_role)));

create policy global_exams_select_global_or_owned on public.global_exams for select to authenticated using (
  private.is_admin() or (status = 'published' and private.is_global_content_reader()) or (created_by_teacher_id = auth.uid() and private.has_app_role('teacher'::public.app_role))
);
create policy global_exams_insert_teacher on public.global_exams for insert to authenticated with check ((private.is_admin() or private.has_app_role('teacher'::public.app_role)) and created_by_teacher_id = auth.uid() and status = 'draft');
create policy global_exams_update_owner on public.global_exams for update to authenticated using (private.is_admin() or (created_by_teacher_id = auth.uid() and status = 'draft' and private.has_app_role('teacher'::public.app_role))) with check (private.is_admin() or (created_by_teacher_id = auth.uid() and private.has_app_role('teacher'::public.app_role)));
create policy global_exams_delete_owner_draft on public.global_exams for delete to authenticated using (private.is_admin() or (created_by_teacher_id = auth.uid() and status = 'draft' and private.has_app_role('teacher'::public.app_role)));

create policy global_exam_questions_select_staff on public.global_exam_questions for select to authenticated using (private.is_admin() or (private.has_app_role('teacher'::public.app_role) and exists (select 1 from public.global_exams e where e.id = exam_id and e.created_by_teacher_id = auth.uid())));
create policy global_exam_questions_manage_owner_draft on public.global_exam_questions for all to authenticated using (private.is_admin() or exists (select 1 from public.global_exams e where e.id = exam_id and e.status = 'draft' and e.created_by_teacher_id = auth.uid() and private.has_app_role('teacher'::public.app_role))) with check (private.is_admin() or exists (select 1 from public.global_exams e where e.id = exam_id and e.status = 'draft' and e.created_by_teacher_id = auth.uid() and private.has_app_role('teacher'::public.app_role)));

create policy global_exam_attempts_select_scoped on public.global_exam_attempts for select to authenticated using (student_id = auth.uid() or private.is_admin() or private.teacher_can_access_user(student_id));
create policy global_exam_answers_select_scoped on public.global_exam_answers for select to authenticated using (exists (select 1 from public.global_exam_attempts a where a.id = attempt_id and (a.student_id = auth.uid() or private.is_admin() or private.teacher_can_access_user(a.student_id))));

revoke all on table public.global_resources, public.global_exams, public.global_exam_questions, public.global_exam_attempts, public.global_exam_answers from public, anon, authenticated;
grant select, insert, update, delete on public.global_resources, public.global_exams, public.global_exam_questions to authenticated;
grant select on public.global_exam_attempts, public.global_exam_answers to authenticated;
grant all on public.global_resources, public.global_exams, public.global_exam_questions, public.global_exam_attempts, public.global_exam_answers to service_role;

-- Starting, saving and submission use database time and row locks; browser time
-- and client scores are never accepted.
create or replace function public.start_global_exam_attempt(input_exam_id uuid)
returns public.global_exam_attempts language plpgsql security definer set search_path = '' as $$
declare exam_row public.global_exams%rowtype; attempt_row public.global_exam_attempts%rowtype; now_at timestamptz := clock_timestamp();
begin
  if auth.uid() is null or not private.has_app_role('student'::public.app_role) or not private.has_curriculum_access() then
    raise exception using errcode = '42501', message = 'student curriculum access required';
  end if;
  select * into exam_row from public.global_exams where id = input_exam_id for update;
  if not found or exam_row.status <> 'published' or now_at < exam_row.start_at or now_at >= exam_row.end_at then
    raise exception using errcode = '22023', message = 'exam is not available';
  end if;
  insert into public.global_exam_attempts (exam_id, student_id, started_at, effective_expires_at)
  values (exam_row.id, auth.uid(), now_at, least(now_at + make_interval(mins => exam_row.duration_minutes), exam_row.end_at))
  returning * into attempt_row;
  return attempt_row;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'exam attempt already exists';
end;
$$;

create or replace function public.save_global_exam_answers(input_exam_id uuid, input_answers jsonb)
returns public.global_exam_attempts language plpgsql security definer set search_path = '' as $$
declare attempt_row public.global_exam_attempts%rowtype; now_at timestamptz := clock_timestamp(); item jsonb; question_uuid uuid;
begin
  if jsonb_typeof(input_answers) <> 'array' then raise exception using errcode = '22023', message = 'answers must be an array'; end if;
  select * into attempt_row from public.global_exam_attempts where exam_id = input_exam_id and student_id = auth.uid() for update;
  if not found then raise exception using errcode = '22023', message = 'exam attempt not found'; end if;
  if attempt_row.status <> 'in_progress' or now_at >= attempt_row.effective_expires_at then
    if attempt_row.status = 'in_progress' then
      return public.submit_global_exam_attempt(input_exam_id);
    end if;
    return attempt_row;
  end if;
  for item in select value from jsonb_array_elements(input_answers) loop
    question_uuid := (item ->> 'questionId')::uuid;
    if not exists (select 1 from public.global_exam_questions q where q.id = question_uuid and q.exam_id = input_exam_id) then
      raise exception using errcode = '22023', message = 'invalid exam question';
    end if;
    insert into public.global_exam_answers (attempt_id, question_id, answer)
    values (attempt_row.id, question_uuid, coalesce(item -> 'answer', 'null'::jsonb))
    on conflict (attempt_id, question_id) do update set answer = excluded.answer, is_correct = null, score = null, updated_at = statement_timestamp();
  end loop;
  return attempt_row;
end;
$$;

-- Reads also enforce the deadline. This closes an abandoned browser session on
-- the next server request using database time, not a device clock.
create or replace function public.read_global_exam_attempt(input_exam_id uuid)
returns public.global_exam_attempts language plpgsql security definer set search_path = '' as $$
declare attempt_row public.global_exam_attempts%rowtype;
begin
  select * into attempt_row from public.global_exam_attempts where exam_id = input_exam_id and student_id = auth.uid() for update;
  if not found then return null; end if;
  if attempt_row.status = 'in_progress' and clock_timestamp() >= attempt_row.effective_expires_at then
    return public.submit_global_exam_attempt(input_exam_id);
  end if;
  return attempt_row;
end;
$$;

create or replace function public.submit_global_exam_attempt(input_exam_id uuid)
returns public.global_exam_attempts language plpgsql security definer set search_path = '' as $$
declare attempt_row public.global_exam_attempts%rowtype; now_at timestamptz := clock_timestamp(); is_expired boolean; calculated_score numeric(8,2); calculated_max numeric(8,2);
begin
  select * into attempt_row from public.global_exam_attempts where exam_id = input_exam_id and student_id = auth.uid() for update;
  if not found then raise exception using errcode = '22023', message = 'exam attempt not found'; end if;
  if attempt_row.status <> 'in_progress' then return attempt_row; end if;
  is_expired := now_at >= attempt_row.effective_expires_at;
  update public.global_exam_answers a set
    is_correct = (a.answer = q.correct_answer), score = case when a.answer = q.correct_answer then 1 else 0 end
  from public.global_exam_questions q where q.id = a.question_id and a.attempt_id = attempt_row.id;
  select count(*)::numeric, coalesce(sum(case when a.is_correct then 1 else 0 end), 0)::numeric
    into calculated_max, calculated_score
  from public.global_exam_questions q left join public.global_exam_answers a on a.question_id = q.id and a.attempt_id = attempt_row.id
  where q.exam_id = input_exam_id;
  update public.global_exam_attempts set status = case when is_expired then 'expired'::public.global_exam_attempt_status else 'submitted'::public.global_exam_attempt_status end,
    submitted_at = case when is_expired then effective_expires_at else now_at end, score = calculated_score, max_score = calculated_max,
    time_taken_seconds = greatest(0, floor(extract(epoch from ((case when is_expired then effective_expires_at else now_at end) - started_at)))::integer)
  where id = attempt_row.id returning * into attempt_row;
  return attempt_row;
end;
$$;

revoke all on function public.start_global_exam_attempt(uuid) from public, anon;
revoke all on function public.read_global_exam_attempt(uuid) from public, anon;
revoke all on function public.save_global_exam_answers(uuid, jsonb) from public, anon;
revoke all on function public.submit_global_exam_attempt(uuid) from public, anon;
grant execute on function public.start_global_exam_attempt(uuid), public.read_global_exam_attempt(uuid), public.save_global_exam_answers(uuid, jsonb), public.submit_global_exam_attempt(uuid) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teaching-materials', 'teaching-materials', false, 20971520, array['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists teaching_materials_select_global_reader on storage.objects;
create policy teaching_materials_select_global_reader on storage.objects for select to authenticated using (bucket_id = 'teaching-materials' and private.is_global_content_reader());

grant execute on function private.is_global_content_reader() to authenticated;
grant execute on function private.can_manage_global_exam(uuid) to authenticated;
