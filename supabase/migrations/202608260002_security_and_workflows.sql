-- Unit 1 pilot: authorization, publishing, login throttling, retention, and
-- private Storage configuration.

-- Missing JSON properties must fail localized-content checks instead of
-- producing SQL NULL (which a CHECK constraint would otherwise accept).
create or replace function private.is_localized_text(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(value) = 'object'
    and jsonb_typeof(value -> 'en') = 'string'
    and jsonb_typeof(value -> 'ar') = 'string'
    and length(btrim(value ->> 'en')) > 0
    and length(btrim(value ->> 'ar')) > 0,
    false
  );
$$;

create or replace function private.has_app_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid() and p.role = required_role
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_app_role('admin'::public.app_role)
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function private.is_service_context()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin', 'service_role');
$$;

create or replace function private.assert_admin_or_service()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not private.is_admin() and not private.is_service_context() then
    raise exception using errcode = '42501', message = 'administrator access with MFA is required';
  end if;
end;
$$;

create or replace function private.teaches_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = target_class_id
      and (
        c.teacher_id = auth.uid()
        or exists (
          select 1 from public.memberships m
          where m.class_id = c.id
            and m.user_id = auth.uid()
            and m.member_role = 'teacher'
        )
      )
  );
$$;

create or replace function private.is_class_member(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.class_id = target_class_id and m.user_id = auth.uid()
  );
$$;

create or replace function private.has_published_lesson(target_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_versions lv
    where lv.lesson_id = target_lesson_id and lv.status = 'published'
  );
$$;

create or replace function private.teacher_can_access_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships learner
    where learner.user_id = target_user_id
      and learner.member_role = 'student'
      and private.teaches_class(learner.class_id)
  );
$$;

create or replace function private.teaches_assignment(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = target_assignment_id and private.teaches_class(a.class_id)
  );
$$;

create or replace function private.student_owns_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.learning_events e
    where e.client_event_id = target_event_id and e.student_id = auth.uid()
  );
$$;

-- Content audit rows are append-only and are created by trusted triggers.
create or replace function private.audit_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  audit_action text;
  audit_type text;
  audit_id uuid;
  audit_details jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  audit_type := case tg_table_name
    when 'lessons' then 'lesson'
    when 'lesson_versions' then 'lesson_version'
    when 'assets' then 'asset'
  end;
  audit_id := (row_data ->> 'id')::uuid;

  if tg_op = 'INSERT' then
    audit_action := case
      when tg_table_name = 'lesson_versions' and row_data ->> 'status' = 'published' then 'publish'
      else 'create'
    end;
  elsif tg_op = 'DELETE' then
    audit_action := 'delete';
  elsif tg_table_name = 'lesson_versions'
        and (to_jsonb(old) ->> 'status') is distinct from (to_jsonb(new) ->> 'status') then
    audit_action := case to_jsonb(new) ->> 'status' when 'published' then 'publish' else 'archive' end;
  elsif tg_table_name = 'assets'
        and (to_jsonb(old) ->> 'status') is distinct from (to_jsonb(new) ->> 'status')
        and to_jsonb(new) ->> 'status' = 'retired' then
    audit_action := 'retire';
  else
    audit_action := 'update';
  end if;

  audit_details := jsonb_strip_nulls(jsonb_build_object(
    'version', row_data -> 'version',
    'status', row_data -> 'status',
    'contentHash', row_data -> 'content_hash',
    'sourceVersionId', row_data -> 'source_version_id'
  ));

  insert into public.content_audit_logs (
    actor_id, entity_type, entity_id, action, details
  ) values (
    auth.uid(), audit_type, audit_id, audit_action, audit_details
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger lessons_audit
  after insert or update or delete on public.lessons
  for each row execute function private.audit_content_change();
create trigger lesson_versions_audit
  after insert or update or delete on public.lesson_versions
  for each row execute function private.audit_content_change();
create trigger assets_audit
  after insert or update or delete on public.assets
  for each row execute function private.audit_content_change();

-- Validate the publishable lesson document. This deliberately validates a
-- structured block schema instead of accepting arbitrary HTML or JavaScript.
create or replace function private.lesson_document_errors(
  lesson_title jsonb,
  lesson_content jsonb
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  errors text[] := array[]::text[];
  objective jsonb;
  block jsonb;
  item jsonb;
  nested_item jsonb;
  objective_ref text;
  objective_ids text[] := array[]::text[];
  block_ids text[] := array[]::text[];
  phases_seen text[] := array[]::text[];
  review_days integer[] := array[]::integer[];
  phase_name text;
  asset_ref jsonb;
  asset_uuid uuid;
  total_download_bytes bigint := octet_length(lesson_content::text);
  block_number integer := 0;
  item_number integer;
begin
  if not private.is_localized_text(lesson_title) then
    errors := array_append(errors, 'lesson.title must contain non-empty en and ar text');
  end if;
  if jsonb_typeof(lesson_content) <> 'object' then
    return array_append(errors, 'content must be a JSON object');
  end if;
  if not private.is_localized_text(lesson_content -> 'summary') then
    errors := array_append(errors, 'content.summary must contain non-empty en and ar text');
  end if;
  if jsonb_typeof(lesson_content -> 'estimatedMinutes') <> 'number'
     or coalesce((lesson_content ->> 'estimatedMinutes')::integer, 0) <= 0 then
    errors := array_append(errors, 'content.estimatedMinutes must be a positive integer');
  end if;
  if not private.is_localized_text(lesson_content -> 'sourcePolicy') then
    errors := array_append(errors, 'content.sourcePolicy must contain non-empty en and ar text');
  end if;

  if jsonb_typeof(lesson_content -> 'objectives') <> 'array'
     or jsonb_array_length(lesson_content -> 'objectives') = 0 then
    errors := array_append(errors, 'content.objectives must be a non-empty array');
  else
    for objective in select value from jsonb_array_elements(lesson_content -> 'objectives') loop
      if coalesce(objective ->> 'id', '') !~ '^[A-Za-z0-9._:-]{1,100}$' then
        errors := array_append(errors, 'each objective requires a stable id');
      else
        objective_ids := array_append(objective_ids, objective ->> 'id');
      end if;
      if not private.is_localized_text(objective -> 'text')
         and not (
           private.is_localized_text(objective -> 'title')
           and private.is_localized_text(objective -> 'description')
         ) then
        errors := array_append(errors, 'objective ' || coalesce(objective ->> 'id', '?') || ' requires en/ar text or title/description');
      end if;
    end loop;
    if cardinality(objective_ids) <> cardinality(array(select distinct unnest(objective_ids))) then
      errors := array_append(errors, 'objective ids must be unique');
    end if;
  end if;

  if jsonb_typeof(lesson_content -> 'keyConcepts') <> 'array'
     or jsonb_array_length(lesson_content -> 'keyConcepts') = 0 then
    errors := array_append(errors, 'content.keyConcepts must be a non-empty array');
  else
    for item in select value from jsonb_array_elements(lesson_content -> 'keyConcepts') loop
      if coalesce(item ->> 'id', '') !~ '^[A-Za-z0-9._:-]{1,100}$'
         or not private.is_localized_text(item -> 'term')
         or not private.is_localized_text(item -> 'definition') then
        errors := array_append(errors, 'every key concept requires a stable id and en/ar term and definition');
      end if;
    end loop;
  end if;

  if jsonb_typeof(lesson_content -> 'blocks') <> 'array'
     or jsonb_array_length(lesson_content -> 'blocks') = 0 then
    errors := array_append(errors, 'content.blocks must be a non-empty array');
  else
    for block in select value from jsonb_array_elements(lesson_content -> 'blocks') loop
      block_number := block_number + 1;
      if coalesce(block ->> 'id', '') !~ '^[A-Za-z0-9._:-]{1,100}$' then
        errors := array_append(errors, 'block ' || block_number || ' requires a stable id');
      else
        block_ids := array_append(block_ids, block ->> 'id');
      end if;
      if coalesce(block ->> 'type', '') not in (
        'narrative', 'vocabulary', 'quiz', 'worked-example', 'hint',
        'discussion', 'open-response', 'rubric', 'retrieval', 'simulation'
      ) then
        errors := array_append(errors, 'block ' || block_number || ' has an unsupported type');
      end if;
      if coalesce(block ->> 'phase', '') not in (
        'predict', 'explore', 'explain', 'practice', 'engineer',
        'transfer', 'reflect', 'review'
      ) then
        errors := array_append(errors, 'block ' || coalesce(block ->> 'id', block_number::text) || ' requires a valid learning phase');
      else
        phases_seen := array_append(phases_seen, block ->> 'phase');
      end if;
      if not private.is_localized_text(block -> 'title') then
        errors := array_append(errors, 'block ' || coalesce(block ->> 'id', block_number::text) || ' requires an en/ar title');
      end if;
      if jsonb_typeof(block -> 'objectiveIds') <> 'array'
         or jsonb_array_length(block -> 'objectiveIds') = 0 then
        errors := array_append(errors, 'block ' || coalesce(block ->> 'id', block_number::text) || ' requires objectiveIds');
      else
        for objective_ref in select value from jsonb_array_elements_text(block -> 'objectiveIds') loop
          if not (objective_ref = any(objective_ids)) then
            errors := array_append(errors, 'block ' || coalesce(block ->> 'id', block_number::text) || ' references unknown objective ' || objective_ref);
          end if;
        end loop;
      end if;

      if block ->> 'type' = 'narrative'
         and not private.is_localized_text(coalesce(block -> 'body', block -> 'content')) then
        errors := array_append(errors, 'narrative ' || coalesce(block ->> 'id', block_number::text) || ' requires an en/ar body');
      end if;

      if block ->> 'type' = 'vocabulary' then
        if jsonb_typeof(block -> 'terms') <> 'array' or jsonb_array_length(block -> 'terms') = 0 then
          errors := array_append(errors, 'vocabulary block ' || coalesce(block ->> 'id', block_number::text) || ' requires terms');
        else
          for item in select value from jsonb_array_elements(block -> 'terms') loop
            if not private.is_localized_text(item -> 'term')
               or not private.is_localized_text(item -> 'definition')
               or (item ? 'example' and not private.is_localized_text(item -> 'example')) then
              errors := array_append(errors, 'every vocabulary term requires complete en/ar text');
            end if;
          end loop;
        end if;
      end if;

      if block ->> 'type' = 'quiz' then
        if not private.is_localized_text(block -> 'prompt')
           or not private.is_localized_text(coalesce(block -> 'answerExplanation', block -> 'explanation')) then
          errors := array_append(errors, 'quiz ' || coalesce(block ->> 'id', block_number::text) || ' requires en/ar prompt and explanation');
        end if;
        if not (
          block ? 'answerKey' or block ? 'correctChoiceId' or block ? 'correctChoiceIds'
          or block ? 'correctAnswer' or block ? 'correctOrder' or block ? 'pairs'
          or block ? 'acceptedAnswers'
          or exists (
            select 1 from jsonb_array_elements(coalesce(block -> 'items', '[]'::jsonb)) value
            where value ? 'correctCategoryId'
          )
        ) then
          errors := array_append(errors, 'quiz ' || coalesce(block ->> 'id', block_number::text) || ' requires a server grading key');
        end if;
        if jsonb_typeof(block -> 'hints') <> 'array'
           or jsonb_array_length(block -> 'hints') = 0 then
          errors := array_append(errors, 'quiz ' || coalesce(block ->> 'id', block_number::text) || ' requires progressive hints');
        else
          item_number := 0;
          for item in select value from jsonb_array_elements(block -> 'hints') loop
            item_number := item_number + 1;
            if not private.is_localized_text(item) then
              errors := array_append(errors, 'hint ' || item_number || ' in block ' || coalesce(block ->> 'id', block_number::text) || ' requires en/ar text');
            end if;
          end loop;
        end if;
        if jsonb_typeof(block -> 'assessment') <> 'object'
           or coalesce(block #>> '{assessment,kind}', '') not in ('pre', 'practice', 'post')
           or coalesce(block #>> '{assessment,feedbackMode}', '') not in ('immediate', 'after-sync') then
          errors := array_append(errors, 'quiz ' || coalesce(block ->> 'id', block_number::text) || ' requires valid assessment metadata');
        end if;
        if jsonb_typeof(block -> 'choices') = 'array' then
          for item in select value from jsonb_array_elements(block -> 'choices') loop
            if not private.is_localized_text(item -> 'text') then
              errors := array_append(errors, 'every quiz choice requires en/ar text');
            end if;
          end loop;
        end if;
        if block ? 'statement' and not private.is_localized_text(block -> 'statement') then
          errors := array_append(errors, 'true/false statement requires en/ar text');
        end if;
        if block ? 'text' and not private.is_localized_text(block -> 'text') then
          errors := array_append(errors, 'cloze text requires en/ar text');
        end if;
        if jsonb_typeof(block -> 'pairs') = 'array' then
          for item in select value from jsonb_array_elements(block -> 'pairs') loop
            if not private.is_localized_text(item -> 'left') or not private.is_localized_text(item -> 'right') then
              errors := array_append(errors, 'every matching pair requires en/ar left and right text');
            end if;
          end loop;
        end if;
        if jsonb_typeof(block -> 'categories') = 'array' then
          for item in select value from jsonb_array_elements(block -> 'categories') loop
            if not private.is_localized_text(item -> 'label') then
              errors := array_append(errors, 'every classification category requires an en/ar label');
            end if;
          end loop;
        end if;
        if jsonb_typeof(block -> 'items') = 'array' then
          for item in select value from jsonb_array_elements(block -> 'items') loop
            if not private.is_localized_text(item -> 'text') then
              errors := array_append(errors, 'every ordering/classification item requires en/ar text');
            end if;
          end loop;
        end if;
      end if;

      if block ->> 'type' = 'worked-example' then
        if not private.is_localized_text(block -> 'challenge')
           or not private.is_localized_text(block -> 'attemptPrompt')
           or not private.is_localized_text(block -> 'solution')
           or block ->> 'revealAfterAttempt' <> 'true' then
          errors := array_append(errors, 'worked example ' || coalesce(block ->> 'id', block_number::text) || ' requires bilingual challenge/attempt/solution and reveal-after-attempt');
        end if;
        if jsonb_typeof(block -> 'reasoningSteps') <> 'array' or jsonb_array_length(block -> 'reasoningSteps') = 0 then
          errors := array_append(errors, 'worked example requires bilingual reasoning steps');
        else
          for item in select value from jsonb_array_elements(block -> 'reasoningSteps') loop
            if not private.is_localized_text(item) then
              errors := array_append(errors, 'every reasoning step requires en/ar text');
            end if;
          end loop;
        end if;
      end if;

      if block ->> 'type' = 'hint' then
        if not private.is_localized_text(block -> 'prompt')
           or jsonb_typeof(block -> 'levels') <> 'array'
           or jsonb_array_length(block -> 'levels') = 0 then
          errors := array_append(errors, 'hint block requires an en/ar prompt and progressive levels');
        else
          for item in select value from jsonb_array_elements(block -> 'levels') loop
            if not private.is_localized_text(item) then
              errors := array_append(errors, 'every progressive hint level requires en/ar text');
            end if;
          end loop;
        end if;
      end if;

      if block ->> 'type' = 'discussion' then
        if block ->> 'pairing' <> 'in-person' or block ->> 'noChat' <> 'true'
           or not private.is_localized_text(block -> 'instructions')
           or not private.is_localized_text(block -> 'individualConclusionPrompt')
           or jsonb_typeof(block -> 'prompts') <> 'array' then
          errors := array_append(errors, 'discussion block must be in-person/no-chat with bilingual instructions, prompts, and conclusion');
        else
          for item in select value from jsonb_array_elements(block -> 'prompts') loop
            if not private.is_localized_text(item) then
              errors := array_append(errors, 'every discussion prompt requires en/ar text');
            end if;
          end loop;
        end if;
      end if;

      if block ->> 'type' = 'open-response' then
        if not private.is_localized_text(block -> 'prompt')
           or (block ? 'guidance' and not private.is_localized_text(block -> 'guidance'))
           or (block ? 'sampleAnswer' and not private.is_localized_text(block -> 'sampleAnswer')) then
          errors := array_append(errors, 'open-response block requires complete en/ar prompt/guidance/sample text');
        end if;
        if block ->> 'responseKind' in ('engineer', 'six-mark') then
          if jsonb_typeof(block -> 'rubric') <> 'array' or jsonb_array_length(block -> 'rubric') = 0 then
            errors := array_append(errors, 'engineer and six-mark responses require a rubric');
          else
            for item in select value from jsonb_array_elements(block -> 'rubric') loop
              if not private.is_localized_text(item -> 'label')
                 or not private.is_localized_text(item -> 'description')
                 or jsonb_typeof(item -> 'maxPoints') <> 'number'
                 or (item ->> 'maxPoints')::numeric <= 0 then
                errors := array_append(errors, 'every response rubric criterion requires bilingual text and positive maxPoints');
              end if;
            end loop;
          end if;
        end if;
      end if;

      if block ->> 'type' = 'simulation' then
        if coalesce(block ->> 'simulationId', '') not in (
          'technology-timeline', 'moores-law-graph', 'edge-cloud-latency',
          'cashless-stakeholder-decision', 'ai-ml-dl-hierarchy',
          'rules-vs-learning-sorter', 'dataset-coverage', 'hallucination-detective',
          'recommendation-data', 'industry-mission-map', 'human-oversight-decision',
          'privacy-library-recommender', 'hiring-bias', 'black-box-explainability',
          'accountability-mapper', 'school-face-recognition-hearing'
        ) or jsonb_typeof(block -> 'config') <> 'object' then
          errors := array_append(errors, 'simulation ' || coalesce(block ->> 'id', block_number::text) || ' requires an approved config object');
        end if;
        if not private.is_localized_text(coalesce(block -> 'accessibleAlternative', block -> 'textAlternative'))
           or not private.is_localized_text(block -> 'instructions') then
          errors := array_append(errors, 'simulation ' || coalesce(block ->> 'id', block_number::text) || ' requires an en/ar text alternative');
        end if;
        if jsonb_typeof(block -> 'successCriteria') = 'array' then
          for item in select value from jsonb_array_elements(block -> 'successCriteria') loop
            if not private.is_localized_text(item) then
              errors := array_append(errors, 'every simulation success criterion requires en/ar text');
            end if;
          end loop;
        end if;
      end if;

      if block ->> 'type' = 'rubric' then
        if jsonb_typeof(block -> 'criteria') <> 'array'
           or jsonb_array_length(block -> 'criteria') = 0 then
          errors := array_append(errors, 'rubric ' || coalesce(block ->> 'id', block_number::text) || ' requires criteria');
        else
          for item in select value from jsonb_array_elements(block -> 'criteria') loop
            if not private.is_localized_text(item -> 'label') then
              errors := array_append(errors, 'every rubric criterion requires an en/ar label and positive maxScore');
            else
              begin
                if coalesce((item ->> 'maxScore')::numeric, 0) <= 0 then
                  errors := array_append(errors, 'every rubric criterion requires an en/ar label and positive maxScore');
                end if;
              exception when invalid_text_representation then
                errors := array_append(errors, 'every rubric criterion requires an en/ar label and positive maxScore');
              end;
            end if;
          end loop;
        end if;
      end if;

      if block ->> 'type' = 'retrieval' then
        if not private.is_localized_text(block -> 'prompt')
           or not private.is_localized_text(block -> 'answer')
           or block ->> 'revealAfterAttempt' <> 'true'
           or jsonb_typeof(block -> 'scheduleDays') <> 'array' then
          errors := array_append(errors, 'retrieval block requires bilingual prompt/answer, scheduleDays, and reveal-after-attempt');
        else
          for item in select value from jsonb_array_elements(block -> 'scheduleDays') loop
            begin
              review_days := array_append(review_days, (item #>> '{}')::integer);
            exception when invalid_text_representation then
              errors := array_append(errors, 'retrieval scheduleDays must contain integers');
            end;
          end loop;
        end if;
      end if;
    end loop;
    if cardinality(block_ids) <> cardinality(array(select distinct unnest(block_ids))) then
      errors := array_append(errors, 'block ids must be unique');
    end if;
  end if;

  foreach phase_name in array array[
    'predict', 'explore', 'explain', 'practice', 'engineer',
    'transfer', 'reflect', 'review'
  ] loop
    if not (phase_name = any(phases_seen)) then
      errors := array_append(errors, 'lesson is missing the ' || phase_name || ' phase');
    end if;
  end loop;
  if not (1 = any(review_days)) or not (7 = any(review_days)) then
    errors := array_append(errors, 'retrieval cards must schedule review after both 1 and 7 days');
  end if;

  if jsonb_typeof(lesson_content -> 'assetIds') not in ('array', 'null')
     and lesson_content ? 'assetIds' then
    errors := array_append(errors, 'content.assetIds must be an array');
  elsif jsonb_typeof(lesson_content -> 'assetIds') = 'array' then
    for asset_ref in select value from jsonb_array_elements(lesson_content -> 'assetIds') loop
      begin
        asset_uuid := (asset_ref #>> '{}')::uuid;
        if not exists (
          select 1 from public.assets a
          where a.id = asset_uuid
            and a.status = 'ready'
            and private.is_localized_text(a.alt_text)
            and length(btrim(a.rights_holder)) > 0
            and length(btrim(a.rights_basis)) > 0
        ) then
          errors := array_append(errors, 'asset ' || asset_uuid || ' is missing, not ready, or lacks rights/alt-text metadata');
        else
          select total_download_bytes + a.byte_size into total_download_bytes
          from public.assets a where a.id = asset_uuid;
        end if;
      exception when invalid_text_representation then
        errors := array_append(errors, 'assetIds contains an invalid UUID');
      end;
    end loop;
  end if;

  if total_download_bytes > 1048576 then
    errors := array_append(errors, 'lesson package exceeds the 1 MiB download budget');
  end if;
  return errors;
end;
$$;

create or replace function public.validate_lesson_version(target_version_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  validation_errors text[];
begin
  perform private.assert_admin_or_service();
  select private.lesson_document_errors(l.title, lv.content)
    into validation_errors
  from public.lesson_versions lv
  join public.lessons l on l.id = lv.lesson_id
  where lv.id = target_version_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'lesson version not found';
  end if;
  return validation_errors;
end;
$$;

create or replace function public.publish_lesson_version(target_version_id uuid)
returns public.lesson_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.lesson_versions%rowtype;
  errors text[];
begin
  perform private.assert_admin_or_service();
  select * into target
  from public.lesson_versions lv
  where lv.id = target_version_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'lesson version not found';
  end if;
  if target.status <> 'draft' then
    raise exception using errcode = '55000', message = 'only draft versions can be published';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target.lesson_id::text, 0));
  select private.lesson_document_errors(l.title, target.content)
    into errors from public.lessons l where l.id = target.lesson_id;
  if cardinality(errors) > 0 then
    raise exception using
      errcode = '23514',
      message = 'lesson version failed publication validation',
      detail = array_to_string(errors, E'\n');
  end if;

  perform set_config('app.lesson_publish_context', 'on', true);
  update public.lesson_versions
  set status = 'archived', archived_at = statement_timestamp()
  where lesson_id = target.lesson_id and status = 'published';

  update public.lesson_versions
  set status = 'published', published_at = statement_timestamp(), archived_at = null
  where id = target.id
  returning * into target;
  return target;
end;
$$;

create or replace function public.rollback_lesson_version(
  target_lesson_id uuid,
  source_version_id uuid
)
returns public.lesson_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.lesson_versions%rowtype;
  restored public.lesson_versions%rowtype;
  next_version integer;
  errors text[];
begin
  perform private.assert_admin_or_service();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_lesson_id::text, 0));

  select * into source
  from public.lesson_versions lv
  where lv.id = source_version_id
    and lv.lesson_id = target_lesson_id
    and lv.status in ('published', 'archived');
  if not found then
    raise exception using errcode = 'P0002', message = 'published source version not found for lesson';
  end if;

  select private.lesson_document_errors(l.title, source.content)
    into errors from public.lessons l where l.id = target_lesson_id;
  if cardinality(errors) > 0 then
    raise exception using
      errcode = '23514',
      message = 'source version no longer satisfies publication validation',
      detail = array_to_string(errors, E'\n');
  end if;

  select coalesce(max(lv.version), 0) + 1 into next_version
  from public.lesson_versions lv where lv.lesson_id = target_lesson_id;

  perform set_config('app.lesson_publish_context', 'on', true);
  update public.lesson_versions
  set status = 'archived', archived_at = statement_timestamp()
  where lesson_id = target_lesson_id and status = 'published';

  insert into public.lesson_versions (
    lesson_id, version, status, content, source_version_id, created_by, published_at
  ) values (
    target_lesson_id, next_version, 'published', source.content,
    source.id, auth.uid(), statement_timestamp()
  ) returning * into restored;

  insert into public.content_audit_logs (
    actor_id, entity_type, entity_id, action, details
  ) values (
    auth.uid(), 'lesson_version', restored.id, 'rollback',
    jsonb_build_object('sourceVersionId', source.id, 'newVersion', restored.version)
  );
  return restored;
end;
$$;

-- Server-only login throttling. The API checks status before attempting Auth,
-- then records success/failure. Five failures in a rolling 15-minute window
-- produce a 15-minute lockout. API responses remain deliberately generic.
create or replace function public.student_login_status(identifier_sha256 text)
returns table (allowed boolean, remaining_attempts integer, locked_until timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  row_data public.login_lockouts%rowtype;
  current_time timestamptz := clock_timestamp();
begin
  if not private.is_service_context() then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  if identifier_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid identifier hash';
  end if;
  select * into row_data from public.login_lockouts l
  where l.identifier_hash = identifier_sha256;

  if not found
     or row_data.window_started_at < current_time - interval '15 minutes'
     or (row_data.locked_until is not null and row_data.locked_until <= current_time) then
    return query select true, 5, null::timestamptz;
  elsif row_data.locked_until > current_time then
    return query select false, 0, row_data.locked_until;
  else
    return query select true, greatest(0, 5 - row_data.failed_count::integer), null::timestamptz;
  end if;
end;
$$;

create or replace function public.record_student_login_attempt(
  identifier_sha256 text,
  login_succeeded boolean,
  target_membership_id uuid default null,
  ip_sha256 text default null,
  user_agent_sha256 text default null
)
returns table (allowed boolean, remaining_attempts integer, locked_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data public.login_lockouts%rowtype;
  current_time timestamptz := clock_timestamp();
  next_count integer;
begin
  if not private.is_service_context() then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  if identifier_sha256 !~ '^[a-f0-9]{64}$'
     or (ip_sha256 is not null and ip_sha256 !~ '^[a-f0-9]{64}$')
     or (user_agent_sha256 is not null and user_agent_sha256 !~ '^[a-f0-9]{64}$') then
    raise exception using errcode = '22023', message = 'invalid hash input';
  end if;

  insert into public.login_attempts (
    membership_id, identifier_hash, ip_hash, user_agent_hash, succeeded
  ) values (
    target_membership_id, identifier_sha256, ip_sha256, user_agent_sha256, login_succeeded
  );

  if login_succeeded then
    delete from public.login_lockouts l where l.identifier_hash = identifier_sha256;
    return query select true, 5, null::timestamptz;
    return;
  end if;

  select * into row_data from public.login_lockouts l
  where l.identifier_hash = identifier_sha256 for update;

  if not found
     or row_data.window_started_at < current_time - interval '15 minutes'
     or (row_data.locked_until is not null and row_data.locked_until <= current_time) then
    next_count := 1;
    insert into public.login_lockouts (
      identifier_hash, membership_id, failed_count, window_started_at, locked_until, updated_at
    ) values (
      identifier_sha256, target_membership_id, next_count, current_time, null, current_time
    ) on conflict (identifier_hash) do update set
      membership_id = excluded.membership_id,
      failed_count = excluded.failed_count,
      window_started_at = excluded.window_started_at,
      locked_until = excluded.locked_until,
      updated_at = excluded.updated_at
    returning * into row_data;
  elsif row_data.locked_until > current_time then
    return query select false, 0, row_data.locked_until;
    return;
  else
    next_count := least(row_data.failed_count::integer + 1, 100);
    update public.login_lockouts l set
      membership_id = coalesce(target_membership_id, l.membership_id),
      failed_count = next_count,
      locked_until = case when next_count >= 5 then current_time + interval '15 minutes' else null end,
      updated_at = current_time
    where l.identifier_hash = identifier_sha256
    returning * into row_data;
  end if;

  return query select
    row_data.locked_until is null,
    greatest(0, 5 - row_data.failed_count::integer),
    row_data.locked_until;
end;
$$;

create or replace function public.reset_student_login_security(target_membership_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if not private.is_service_context() then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  delete from public.login_lockouts l where l.membership_id = target_membership_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- This function is intentionally not scheduled. The operator must export a
-- class first, then call it explicitly. Returned orphan student IDs must be
-- deleted through the Supabase Auth Admin API by the trusted server.
create or replace function public.delete_expired_archived_class_data(
  retention_period interval default interval '90 days'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  class_ids uuid[] := array[]::uuid[];
  orphan_student_ids uuid[] := array[]::uuid[];
  deleted_attempts integer := 0;
begin
  perform private.assert_admin_or_service();
  if retention_period < interval '90 days' then
    raise exception using errcode = '22023', message = 'retention period cannot be shorter than 90 days';
  end if;

  select coalesce(array_agg(c.id order by c.archived_at), array[]::uuid[])
    into class_ids
  from public.classes c
  where c.status = 'archived'
    and c.archived_at < statement_timestamp() - retention_period;

  if cardinality(class_ids) = 0 then
    return jsonb_build_object(
      'deletedClassIds', '[]'::jsonb,
      'orphanStudentUserIds', '[]'::jsonb,
      'deletedLoginAttempts', 0
    );
  end if;

  select coalesce(array_agg(p.user_id), array[]::uuid[])
    into orphan_student_ids
  from public.profiles p
  where p.role = 'student'
    and exists (
      select 1 from public.memberships m
      where m.user_id = p.user_id and m.class_id = any(class_ids)
    )
    and not exists (
      select 1 from public.memberships m
      where m.user_id = p.user_id and not (m.class_id = any(class_ids))
    );

  delete from public.classes c where c.id = any(class_ids);
  delete from public.login_attempts a
    where a.attempted_at < statement_timestamp() - retention_period;
  get diagnostics deleted_attempts = row_count;

  return jsonb_build_object(
    'deletedClassIds', to_jsonb(class_ids),
    'orphanStudentUserIds', to_jsonb(orphan_student_ids),
    'deletedLoginAttempts', deleted_attempts
  );
end;
$$;

-- Enable RLS on every exposed application table. Service-role requests bypass
-- RLS but still must perform the authorization checks described in docs/API.md.
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.memberships enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_versions enable row level security;
alter table public.assignments enable row level security;
alter table public.learning_events enable row level security;
alter table public.teacher_reviews enable row level security;
alter table public.assets enable row level security;
alter table public.content_audit_logs enable row level security;
alter table public.login_attempts enable row level security;
alter table public.login_lockouts enable row level security;

create policy profiles_select_scoped on public.profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or private.is_admin()
    or private.teacher_can_access_user(user_id)
  );
create policy profiles_update_locale on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy classes_select_member on public.classes
  for select to authenticated
  using (private.is_admin() or private.is_class_member(id));
create policy classes_insert_teacher on public.classes
  for insert to authenticated
  with check (
    private.is_admin()
    or (private.has_app_role('teacher') and teacher_id = auth.uid())
  );
create policy classes_update_teacher on public.classes
  for update to authenticated
  using (private.is_admin() or private.teaches_class(id))
  with check (private.is_admin() or private.teaches_class(id));

create policy memberships_select_scoped on public.memberships
  for select to authenticated
  using (user_id = auth.uid() or private.is_admin() or private.teaches_class(class_id));
create policy memberships_insert_admin on public.memberships
  for insert to authenticated with check (private.is_admin());
create policy memberships_update_admin on public.memberships
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy memberships_delete_admin on public.memberships
  for delete to authenticated using (private.is_admin());

create policy lessons_select_catalog on public.lessons
  for select to authenticated
  using (
    private.is_admin()
    or private.has_app_role('teacher')
    or (is_active and private.has_published_lesson(id))
  );
create policy lessons_insert_admin on public.lessons
  for insert to authenticated with check (private.is_admin());
create policy lessons_update_admin on public.lessons
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy lessons_delete_admin on public.lessons
  for delete to authenticated using (private.is_admin());

-- Students cannot select raw version JSON because it contains grading keys.
-- The trusted download API sanitizes published content before returning it.
create policy lesson_versions_select_staff on public.lesson_versions
  for select to authenticated
  using (private.is_admin() or private.has_app_role('teacher'));
create policy lesson_versions_insert_admin on public.lesson_versions
  for insert to authenticated with check (private.is_admin());
create policy lesson_versions_update_admin on public.lesson_versions
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy lesson_versions_delete_admin_draft on public.lesson_versions
  for delete to authenticated using (private.is_admin() and status = 'draft');

create policy assignments_select_class on public.assignments
  for select to authenticated
  using (private.is_admin() or private.is_class_member(class_id));
create policy assignments_insert_teacher on public.assignments
  for insert to authenticated
  with check (private.is_admin() or private.teaches_class(class_id));
create policy assignments_update_teacher on public.assignments
  for update to authenticated
  using (private.is_admin() or private.teaches_class(class_id))
  with check (private.is_admin() or private.teaches_class(class_id));
create policy assignments_delete_teacher_draft on public.assignments
  for delete to authenticated
  using ((private.is_admin() or private.teaches_class(class_id)) and status = 'draft');

create policy learning_events_select_scoped on public.learning_events
  for select to authenticated
  using (
    student_id = auth.uid()
    or private.is_admin()
    or private.teaches_assignment(assignment_id)
  );

create policy teacher_reviews_select_scoped on public.teacher_reviews
  for select to authenticated
  using (
    private.is_admin()
    or reviewer_id = auth.uid()
    or private.student_owns_event(learning_event_id)
    or exists (
      select 1 from public.learning_events e
      where e.client_event_id = teacher_reviews.learning_event_id
        and private.teaches_assignment(e.assignment_id)
    )
  );
create policy teacher_reviews_insert_teacher on public.teacher_reviews
  for insert to authenticated
  with check (
    private.is_admin()
    or (
      reviewer_id = auth.uid()
      and exists (
        select 1 from public.learning_events e
        where e.client_event_id = teacher_reviews.learning_event_id
          and private.teaches_assignment(e.assignment_id)
      )
    )
  );
create policy teacher_reviews_update_teacher on public.teacher_reviews
  for update to authenticated
  using (
    private.is_admin()
    or (
      reviewer_id = auth.uid()
      and exists (
        select 1 from public.learning_events e
        where e.client_event_id = teacher_reviews.learning_event_id
          and private.teaches_assignment(e.assignment_id)
      )
    )
  )
  with check (
    private.is_admin()
    or (
      reviewer_id = auth.uid()
      and exists (
        select 1 from public.learning_events e
        where e.client_event_id = teacher_reviews.learning_event_id
          and private.teaches_assignment(e.assignment_id)
      )
    )
  );

create policy assets_select_ready on public.assets
  for select to authenticated
  using (status = 'ready' or private.is_admin());
create policy assets_insert_admin on public.assets
  for insert to authenticated with check (private.is_admin());
create policy assets_update_admin on public.assets
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy assets_delete_admin_draft on public.assets
  for delete to authenticated using (private.is_admin() and status = 'draft');

create policy content_audit_select_admin on public.content_audit_logs
  for select to authenticated using (private.is_admin());

-- Start with no implicit client privileges. Re-grant the narrow client surface.
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.classes from public, anon, authenticated;
revoke all on table public.memberships from public, anon, authenticated;
revoke all on table public.lessons from public, anon, authenticated;
revoke all on table public.lesson_versions from public, anon, authenticated;
revoke all on table public.assignments from public, anon, authenticated;
revoke all on table public.learning_events from public, anon, authenticated;
revoke all on table public.teacher_reviews from public, anon, authenticated;
revoke all on table public.assets from public, anon, authenticated;
revoke all on table public.content_audit_logs from public, anon, authenticated;
revoke all on table public.login_attempts from public, anon, authenticated;
revoke all on table public.login_lockouts from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (preferred_locale) on table public.profiles to authenticated;
grant select on table public.classes to authenticated;
grant insert (title, teacher_id) on table public.classes to authenticated;
grant update (title, status, archived_at) on table public.classes to authenticated;
grant select on table public.memberships to authenticated;
grant select, insert, update, delete on table public.lessons to authenticated;
grant select on table public.lesson_versions to authenticated;
grant insert (lesson_id, version, content, source_version_id, created_by)
  on table public.lesson_versions to authenticated;
grant update (content) on table public.lesson_versions to authenticated;
grant delete on table public.lesson_versions to authenticated;
grant select on table public.assignments to authenticated;
grant insert (class_id, lesson_version_id, kind, title, status, opens_at, due_at)
  on table public.assignments to authenticated;
grant update (kind, title, status, opens_at, due_at)
  on table public.assignments to authenticated;
grant delete on table public.assignments to authenticated;
grant select on table public.learning_events to authenticated;
grant select on table public.teacher_reviews to authenticated;
grant insert (learning_event_id, rubric_results, score, max_score, feedback)
  on table public.teacher_reviews to authenticated;
grant update (rubric_results, score, max_score, feedback)
  on table public.teacher_reviews to authenticated;
grant select, insert, update, delete on table public.assets to authenticated;
grant select on table public.content_audit_logs to authenticated;

grant all on table public.profiles, public.classes, public.memberships,
  public.lessons, public.lesson_versions, public.assignments,
  public.learning_events, public.teacher_reviews, public.assets,
  public.content_audit_logs, public.login_attempts, public.login_lockouts
  to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.has_app_role(public.app_role) to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.teaches_class(uuid) to authenticated;
grant execute on function private.is_class_member(uuid) to authenticated;
grant execute on function private.has_published_lesson(uuid) to authenticated;
grant execute on function private.teacher_can_access_user(uuid) to authenticated;
grant execute on function private.teaches_assignment(uuid) to authenticated;
grant execute on function private.student_owns_event(uuid) to authenticated;
grant execute on function private.generate_class_code() to authenticated;
grant execute on function private.is_localized_text(jsonb) to authenticated;

revoke all on function public.validate_lesson_version(uuid) from public, anon;
revoke all on function public.publish_lesson_version(uuid) from public, anon;
revoke all on function public.rollback_lesson_version(uuid, uuid) from public, anon;
revoke all on function public.student_login_status(text) from public, anon, authenticated;
revoke all on function public.record_student_login_attempt(text, boolean, uuid, text, text) from public, anon, authenticated;
revoke all on function public.reset_student_login_security(uuid) from public, anon, authenticated;
revoke all on function public.delete_expired_archived_class_data(interval) from public, anon;
grant execute on function public.validate_lesson_version(uuid) to authenticated, service_role;
grant execute on function public.publish_lesson_version(uuid) to authenticated, service_role;
grant execute on function public.rollback_lesson_version(uuid, uuid) to authenticated, service_role;
grant execute on function public.student_login_status(text) to service_role;
grant execute on function public.record_student_login_attempt(text, boolean, uuid, text, text) to service_role;
grant execute on function public.reset_student_login_security(uuid) to service_role;
grant execute on function public.delete_expired_archived_class_data(interval) to authenticated, service_role;

-- Private image bucket: application clients receive signed URLs; only MFA-authenticated
-- admins can manage objects directly through the Storage client.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-assets',
  'lesson-assets',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists lesson_assets_admin_select on storage.objects;
drop policy if exists lesson_assets_admin_insert on storage.objects;
drop policy if exists lesson_assets_admin_update on storage.objects;
drop policy if exists lesson_assets_admin_delete on storage.objects;
create policy lesson_assets_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'lesson-assets' and private.is_admin());
create policy lesson_assets_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lesson-assets' and private.is_admin());
create policy lesson_assets_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'lesson-assets' and private.is_admin())
  with check (bucket_id = 'lesson-assets' and private.is_admin());
create policy lesson_assets_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'lesson-assets' and private.is_admin());
