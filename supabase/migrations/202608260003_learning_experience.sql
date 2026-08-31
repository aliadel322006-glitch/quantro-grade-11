-- Quantro AI learning-experience records. These complement the immutable
-- learning event log with the student-facing views used by the platform.

create or replace function private.student_has_assignment(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments a
    join public.memberships m on m.class_id = a.class_id
    where a.id = target_assignment_id
      and m.user_id = auth.uid()
      and m.member_role = 'student'
  );
$$;

create table public.student_lesson_progress (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  lesson_version_id uuid not null references public.lesson_versions(id) on delete restrict,
  current_section text not null default 'overview',
  completed_block_ids text[] not null default '{}',
  percent_complete numeric(5,2) not null default 0,
  completed_at timestamptz,
  last_accessed_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint student_lesson_progress_once unique (student_id, assignment_id),
  constraint student_lesson_progress_section check (current_section in ('overview', 'learn', 'examples', 'activities', 'practice', 'quiz', 'mistakes', 'key-terms', 'key-takeaways', 'resources')),
  constraint student_lesson_progress_percent check (percent_complete between 0 and 100),
  constraint student_lesson_progress_block_ids check (cardinality(completed_block_ids) <= 500)
);

create table public.quiz_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  lesson_version_id uuid not null references public.lesson_versions(id) on delete restrict,
  quiz_block_id text not null,
  attempt_number integer not null,
  score numeric(8,2),
  max_score numeric(8,2),
  grading_state public.grading_state not null default 'ungraded',
  completed_at timestamptz not null default statement_timestamp(),
  constraint quiz_attempts_number_positive check (attempt_number > 0),
  constraint quiz_attempts_block_id check (quiz_block_id ~ '^[A-Za-z0-9._:-]{1,100}$'),
  constraint quiz_attempts_scores check ((score is null and max_score is null) or (score >= 0 and max_score > 0 and score <= max_score)),
  constraint quiz_attempts_once unique (student_id, assignment_id, quiz_block_id, attempt_number)
);

create table public.student_mistakes (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  lesson_version_id uuid not null references public.lesson_versions(id) on delete restrict,
  quiz_block_id text not null,
  first_incorrect_event_id uuid references public.learning_events(client_event_id) on delete set null,
  last_response jsonb not null default 'null'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint student_mistakes_block_id check (quiz_block_id ~ '^[A-Za-z0-9._:-]{1,100}$'),
  constraint student_mistakes_response_size check (octet_length(last_response::text) <= 65536),
  constraint student_mistakes_once unique (student_id, assignment_id, quiz_block_id)
);

create table public.lesson_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  lesson_version_id uuid not null references public.lesson_versions(id) on delete restrict,
  title jsonb not null,
  description jsonb,
  storage_bucket text not null default 'lesson-resources',
  storage_path text not null,
  original_file_name text not null,
  file_type text not null,
  byte_size integer not null,
  uploaded_by uuid not null references public.profiles(user_id) on delete restrict default auth.uid(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint lesson_resources_title_localized check (private.is_localized_text(title)),
  constraint lesson_resources_description_localized check (description is null or private.is_localized_text(description)),
  constraint lesson_resources_file_type check (file_type in ('pdf', 'ppt', 'pptx')),
  constraint lesson_resources_bucket check (storage_bucket = 'lesson-resources'),
  constraint lesson_resources_file_name check (char_length(btrim(original_file_name)) between 1 and 255),
  constraint lesson_resources_size check (byte_size between 1 and 20971520),
  constraint lesson_resources_safe_path check (storage_path !~ '(^|/)\.\.(/|$)' and storage_path !~ '^/' and char_length(storage_path) between 1 and 500),
  constraint lesson_resources_storage_unique unique (storage_bucket, storage_path)
);

create table public.class_announcements (
  id uuid primary key default extensions.gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title jsonb not null,
  body jsonb not null,
  published_at timestamptz,
  created_by uuid not null references public.profiles(user_id) on delete restrict default auth.uid(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint class_announcements_title_localized check (private.is_localized_text(title)),
  constraint class_announcements_body_localized check (private.is_localized_text(body))
);

create table public.student_bookmarks (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  lesson_version_id uuid not null references public.lesson_versions(id) on delete cascade,
  block_id text,
  note text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint student_bookmarks_block_id check (block_id is null or block_id ~ '^[A-Za-z0-9._:-]{1,100}$'),
  constraint student_bookmarks_note_size check (note is null or char_length(note) <= 5000),
  constraint student_bookmarks_once unique nulls not distinct (student_id, lesson_version_id, block_id)
);

create index student_lesson_progress_student_idx on public.student_lesson_progress (student_id, last_accessed_at desc);
create index quiz_attempts_assignment_idx on public.quiz_attempts (assignment_id, quiz_block_id, completed_at desc);
create index student_mistakes_student_idx on public.student_mistakes (student_id, resolved_at, updated_at desc);
create index lesson_resources_class_version_idx on public.lesson_resources (class_id, lesson_version_id, created_at desc);
create index class_announcements_class_idx on public.class_announcements (class_id, published_at desc);

create trigger student_lesson_progress_updated_at before update on public.student_lesson_progress for each row execute function private.set_updated_at();
create trigger student_mistakes_updated_at before update on public.student_mistakes for each row execute function private.set_updated_at();
create trigger lesson_resources_updated_at before update on public.lesson_resources for each row execute function private.set_updated_at();
create trigger class_announcements_updated_at before update on public.class_announcements for each row execute function private.set_updated_at();
create trigger student_bookmarks_updated_at before update on public.student_bookmarks for each row execute function private.set_updated_at();

alter table public.student_lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.student_mistakes enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.class_announcements enable row level security;
alter table public.student_bookmarks enable row level security;

create policy student_lesson_progress_select_scoped on public.student_lesson_progress for select to authenticated using (student_id = auth.uid() or private.is_admin() or private.teaches_assignment(assignment_id));
create policy student_lesson_progress_insert_self on public.student_lesson_progress for insert to authenticated with check (student_id = auth.uid() and private.student_has_assignment(assignment_id));
create policy student_lesson_progress_update_self on public.student_lesson_progress for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid() and private.student_has_assignment(assignment_id));

create policy quiz_attempts_select_scoped on public.quiz_attempts for select to authenticated using (student_id = auth.uid() or private.is_admin() or private.teaches_assignment(assignment_id));
-- Scores and assessed attempts are created by trusted sync code, not the browser.

create policy student_mistakes_select_scoped on public.student_mistakes for select to authenticated using (student_id = auth.uid() or private.is_admin() or private.teaches_assignment(assignment_id));
-- Trusted synchronization owns insert/update so learners cannot write an answer key or resolution state.

create policy lesson_resources_select_class on public.lesson_resources for select to authenticated using (private.is_admin() or private.is_class_member(class_id));
create policy lesson_resources_insert_teacher on public.lesson_resources for insert to authenticated with check (private.is_admin() or (private.teaches_class(class_id) and uploaded_by = auth.uid()));
create policy lesson_resources_update_teacher on public.lesson_resources for update to authenticated using (private.is_admin() or private.teaches_class(class_id)) with check (private.is_admin() or private.teaches_class(class_id));
create policy lesson_resources_delete_teacher on public.lesson_resources for delete to authenticated using (private.is_admin() or private.teaches_class(class_id));

create policy class_announcements_select_class on public.class_announcements for select to authenticated using (private.is_admin() or (published_at is not null and private.is_class_member(class_id)) or private.teaches_class(class_id));
create policy class_announcements_insert_teacher on public.class_announcements for insert to authenticated with check (private.is_admin() or (private.teaches_class(class_id) and created_by = auth.uid()));
create policy class_announcements_update_teacher on public.class_announcements for update to authenticated using (private.is_admin() or private.teaches_class(class_id)) with check (private.is_admin() or private.teaches_class(class_id));
create policy class_announcements_delete_teacher on public.class_announcements for delete to authenticated using (private.is_admin() or private.teaches_class(class_id));

create policy student_bookmarks_select_self on public.student_bookmarks for select to authenticated using (student_id = auth.uid() or private.is_admin());
create policy student_bookmarks_insert_self on public.student_bookmarks for insert to authenticated with check (student_id = auth.uid());
create policy student_bookmarks_update_self on public.student_bookmarks for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy student_bookmarks_delete_self on public.student_bookmarks for delete to authenticated using (student_id = auth.uid() or private.is_admin());

revoke all on table public.student_lesson_progress, public.quiz_attempts, public.student_mistakes, public.lesson_resources, public.class_announcements, public.student_bookmarks from public, anon, authenticated;
grant select, insert, update on table public.student_lesson_progress to authenticated;
grant select on table public.quiz_attempts, public.student_mistakes to authenticated;
grant select, insert, update, delete on table public.lesson_resources, public.class_announcements, public.student_bookmarks to authenticated;
grant all on table public.student_lesson_progress, public.quiz_attempts, public.student_mistakes, public.lesson_resources, public.class_announcements, public.student_bookmarks to service_role;
grant execute on function private.student_has_assignment(uuid) to authenticated;

-- Never expose resources publicly. The server verifies membership, then creates
-- short-lived signed URLs. Browser Storage writes are deliberately prohibited.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-resources', 'lesson-resources', false, 20971520, array[
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]) on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
