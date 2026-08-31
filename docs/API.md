# Unit 1 Pilot API Contract

This is the server contract for the bilingual PWA. Routes are Next.js route
handlers backed by Supabase. All identifiers are UUIDs unless stated otherwise,
all timestamps are RFC 3339 UTC strings, and all JSON properties use camelCase.
Database snake_case mappings are shown where they are not obvious.

## Current authentication and private curriculum access

The current app uses email/password accounts, not the retired three-code/PIN
join flow described later in this historical pilot contract. The exposed
implementation routes are:

- `GET /api/v1/auth/session` — returns the current `role`, display name and
  `curriculumAccess` flag, or `null`.
- `POST /api/v1/auth/login` — accepts `{ email, password, role }`; sign-in is
  generic on failure and the server verifies that the profile role matches.
- `POST /api/v1/auth/register` — accepts `{ fullName, email, password,
  accessCode, locale }`; it creates a student identity, atomically redeems a
  valid code and establishes a session. It never returns a raw access code.
- `POST /api/v1/auth/redeem-access-code` — lets an authenticated student with
  no curriculum access redeem a code.
- `POST /api/v1/auth/logout` — clears the session and directs the client to
  purge learner-local offline data.
- `GET|POST /api/v1/access-codes`, `PATCH|DELETE /api/v1/access-codes/{id}`
  and `POST /api/v1/access-codes/{id}/regenerate` — teacher/admin-only code
  management. The raw code is supplied only from POST/regenerate responses.
- `GET /api/v1/classes` — returns only classes visible to that teacher/admin,
  for class-code selection.

`POST /api/v1/auth/student-session` intentionally returns `410` and cannot
create a session. `/[locale]/join` redirects to student registration so old
bookmarks lead to the secure flow.

The `202608260004_private_curriculum_access.sql` migration provides the
`access_codes` and `access_code_redemptions` tables, the server-only redemption
function, curriculum gate, RLS policies, and immutable audit data. A production
deployment must set `ACCESS_CODE_PEPPER` to a high-entropy server-only value;
the code itself is never stored in the database.

## Common protocol and authorization

- Base path: `/api/v1`. JSON requests require `Content-Type: application/json`.
- Auth is a Secure, HttpOnly, SameSite=Lax Supabase session cookie. Mutating
  browser requests must have an allowed `Origin` equal to `APP_ORIGIN`; do not
  enable wildcard CORS. Staff email login uses invited Supabase Auth users.
- Roles are `student | teacher | admin`. An admin route requires a valid `aal2`
  JWT. Return `403 MFA_REQUIRED` when the user is an admin at `aal1`.
- The service-role key is used only in server route handlers. Because it bypasses
  RLS, every such handler must repeat the same class/role check before querying.
- Never accept `studentId`, `teacherId`, `serverScore`, or `role` from a client.
  Derive them from the session and recalculate all scores from the immutable,
  pinned lesson version.
- Maximum JSON body is 512 KiB unless a route states otherwise. Unknown fields
  are rejected. IDs belonging to another class return `404`, not `403`, to avoid
  enumerating records.
- `X-Request-Id` is accepted or generated and returned. Logs redact PINs,
  cookies, responses, answer keys, internal student email addresses, and signed
  asset URLs.

Successful responses use the status code documented by the route. Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be completed.",
    "fields": { "learnerId": "INVALID_FORMAT" },
    "requestId": "01J..."
  }
}
```

Supported codes are `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `MFA_REQUIRED`,
`FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`,
`CONTENT_VALIDATION_FAILED`, and `INTERNAL_ERROR`. Authentication failures use
the same public message regardless of whether the class, learner, or PIN exists.

## Authentication and student identities

### Student session

`POST /api/v1/auth/student/session`

```json
{
  "classCode": "AI7K9M2Q",
  "learnerId": "learner_014",
  "pin": "48392017",
  "locale": "en"
}
```

Normalize the class code to uppercase and the learner ID to lowercase for
lookup, while preserving its displayed spelling. Validate the class code as
eight characters from `A-HJ-NP-Z2-9`, the learner ID as 3–32 ASCII letters,
digits, `_` or `-`, and the PIN as exactly eight digits.

Before calling Supabase Auth, compute
`HMAC-SHA256(STUDENT_LOGIN_PEPPER, upper(classCode) + ":" + lower(learnerId))`
as 64 lowercase hex characters and call `student_login_status`. On an allowed
request, resolve the membership with the service role and sign in the generated
Auth identity using the supplied PIN as its Auth password. Call
`record_student_login_attempt` with success or failure. Hash IP and user-agent
with the same server pepper before recording; never store either raw value.

The generated student Auth email is an internal implementation detail such as
`<auth-user-uuid>@students.invalid`. Create it with email already confirmed and
`app_metadata.app_role = "student"`; never send mail to it or return it. A PIN
exists only as a Supabase Auth password hash, never in application tables.

Response `200`:

```json
{
  "user": {
    "id": "2e87adbe-415b-4bc8-b20e-bdbf31980f22",
    "role": "student",
    "preferredLocale": "en"
  },
  "membership": {
    "id": "1f7b9180-b2aa-4f52-8c18-26da88fd8186",
    "learnerId": "learner_014",
    "class": { "id": "99ae3b8c-0491-4b04-b329-d24752555e35", "title": "11A" }
  }
}
```

Use `401 INVALID_CREDENTIALS` for every invalid tuple. When locked, use the same
body with status `429` and a rounded `Retry-After`; do not return attempt counts.

### Staff session and MFA

- `POST /api/v1/auth/staff/session` accepts `{ "email", "password" }` for
  invited teacher/admin accounts and returns `{ "user": { "id", "role" },
  "mfaRequired": boolean }`.
- `POST /api/v1/auth/mfa/challenge` accepts `{ "factorId" }`.
- `POST /api/v1/auth/mfa/verify` accepts `{ "factorId", "challengeId", "code" }`
  and refreshes the cookie with an `aal2` session. Admin API/RLS access is denied
  before this succeeds.
- `POST /api/v1/auth/logout` revokes/clears the server session and returns
  `{ "ok": true, "purgeOfflineStorage": true }`. The client must then delete
  its IndexedDB databases, Cache Storage lesson packages, and in-memory answers.

## Classes, roster, and PIN reset

### Classes

- `GET /api/v1/classes` returns only the signed-in teacher's/admin's classes:

  ```json
  {
    "classes": [{
      "id": "99ae3b8c-0491-4b04-b329-d24752555e35",
      "code": "AI7K9M2Q",
      "title": "11A",
      "status": "active",
      "learnerCount": 28,
      "createdAt": "2026-08-26T08:00:00Z"
    }]
  }
  ```

- `POST /api/v1/classes` accepts `{ "title": "11A" }`. The server generates an
  eight-character code, retrying on unique collision, and returns the class with
  status `201`. The class owner is added as a teacher membership by the database.
- `PATCH /api/v1/classes/{classId}` accepts only `{ "title" }` or
  `{ "status": "archived" }`. Archiving sets `archivedAt`; it does not delete.

### Roster

- `GET /api/v1/classes/{classId}/learners` returns pseudonymous data only:

  ```json
  {
    "learners": [{
      "membershipId": "1f7b9180-b2aa-4f52-8c18-26da88fd8186",
      "userId": "2e87adbe-415b-4bc8-b20e-bdbf31980f22",
      "learnerId": "learner_014",
      "preferredLocale": "ar",
      "pinChangedAt": "2026-08-26T08:10:00Z"
    }]
  }
  ```

- `POST /api/v1/classes/{classId}/learners` accepts
  `{ "learnerId": "learner_014", "preferredLocale": "ar", "pin": "48392017" }`.
  `pin` may be omitted, in which case the server generates eight digits with a
  cryptographically secure RNG. In one transaction/compensating workflow it
  creates the Auth user, profile, and student membership. Response `201` includes
  `{ "membership": { ... }, "temporaryPin": "48392017" }`; this is the only
  time the PIN is returned. If the database write fails, delete the newly created
  Auth user. Duplicate learner IDs return `409 CONFLICT`.
- `DELETE /api/v1/classes/{classId}/learners/{membershipId}` removes membership
  and class work only after teacher confirmation. If the student has no other
  memberships, delete its Auth user with the Auth Admin API. Return `204`.

### PIN reset

`POST /api/v1/classes/{classId}/learners/{membershipId}/pin-reset`

Request is `{ "pin": "73910462" }`, or `{}` to generate one. Verify the teacher
owns the class, update the generated Auth user's password with the Admin API,
set `memberships.pin_changed_at`, and call `reset_student_login_security` in a
compensating workflow. Return the new PIN once:

```json
{ "temporaryPin": "73910462", "pinChangedAt": "2026-08-26T09:00:00Z" }
```

## Assignments and lesson download

### Assignment management

- `GET /api/v1/classes/{classId}/assignments` is available to class members and
  returns `{ "assignments": [{ "id", "lessonVersionId", "kind", "title",
  "status", "opensAt", "dueAt" }] }`. A student sees only `assigned` or `closed`.
- `POST /api/v1/classes/{classId}/assignments` is teacher/admin-only:

  ```json
  {
    "lessonVersionId": "3fa394c9-8c39-4342-9a41-7018ed2e20ac",
    "kind": "lesson",
    "title": { "en": "Lesson 1-1", "ar": "الدرس ١-١" },
    "opensAt": "2026-09-01T06:00:00Z",
    "dueAt": "2026-09-08T20:00:00Z",
    "status": "assigned"
  }
  ```

  The version must currently be published. The database pins the class and
  version immutably. Return the assignment with `201`.
- `PATCH /api/v1/assignments/{assignmentId}` accepts only `title`, `kind`,
  `opensAt`, `dueAt`, or `status`. It cannot change class or version.
- `DELETE /api/v1/assignments/{assignmentId}` works only while status is `draft`.

### Versioned offline lesson package

`GET /api/v1/lesson-versions/{versionId}/download?assignmentId={assignmentId}`

The student must belong to the assignment's class and `versionId` must equal its
pinned version. Staff may preview published versions within their role. Do not
query raw `lesson_versions` from a student client: RLS intentionally denies it.

Response `200`:

```json
{
  "schemaVersion": 1,
  "lessonId": "607f6f5c-eb87-4149-839d-f3fe011fb31d",
  "lessonVersionId": "3fa394c9-8c39-4342-9a41-7018ed2e20ac",
  "version": 1,
  "contentHash": "75a01e...64-lowercase-hex",
  "title": { "en": "IT and Society", "ar": "تكنولوجيا المعلومات والمجتمع" },
  "content": { "objectives": [], "blocks": [], "keyTakeaway": {}, "reviewScheduleDays": [1, 7] },
  "assets": [{
    "id": "fd3c1d03-1943-4811-a56b-98f2ec40b531",
    "mimeType": "image/webp",
    "byteSize": 24581,
    "sha256": "b2c8...",
    "altText": { "en": "...", "ar": "..." },
    "url": "https://...signed..."
  }]
}
```

Return `ETag: "sha256-<contentHash>-student-v1"`, `Vary: Cookie`, and
`Cache-Control: private, no-cache`. `If-None-Match` returns `304`. Asset URLs are
short-lived and the service worker stores the fetched bytes, not a reusable URL.

The server recursively removes `answerKey`, unpublished author notes, and
solutions gated until attempt. Practice blocks may include explicit
`clientFeedback` needed for offline immediate feedback. Blocks marked
`assessmentMode: "graded"` never include an answer or explanation in the
download; their feedback is returned only by successful event sync. Both `en`
and `ar` values are returned in one package so language switching is offline and
does not change stable block/objective IDs or learner position.

## Idempotent learning-event synchronization

`POST /api/v1/events/sync`

Maximum 100 events and 512 KiB per request. `clientUuid` maps to
`learning_events.client_event_id`; `attemptNumber` maps to `attempt`, and
`clientTimestamp` maps to `client_created_at`.

```json
{
  "events": [{
    "clientUuid": "cae37cbf-0f35-40b8-8ccd-bc3572407436",
    "assignmentId": "18ae6864-5663-4980-8a25-437796d4e9fe",
    "lessonVersionId": "3fa394c9-8c39-4342-9a41-7018ed2e20ac",
    "blockId": "l1-practice-3",
    "objectiveIds": ["L1-O2"],
    "eventType": "response_submitted",
    "response": { "selectedOptionIds": ["edge"] },
    "attemptNumber": 1,
    "clientTimestamp": "2026-09-02T10:21:31.223Z"
  }]
}
```

`eventType` is one of `response_submitted`, `assessment_submitted`,
`reflection_submitted`, `simulation_completed`, or `retrieval_answered` and
defaults to `response_submitted` in the client queue.

For each event, in its own savepoint or safe bulk transaction:

1. Derive `student_id` from the session and verify current class membership,
   active class, assignment visibility, and exact pinned version.
2. Validate stable block/objective IDs against raw immutable content, response
   shape, attempt > 0, timestamp (not more than 10 minutes in the future), and
   serialized response <= 64 KiB.
3. Calculate the grade from the server-only answer key. Ignore any score in the
   request. Open/rubric responses become `manual_pending`; non-scored work is
   `ungraded`.
4. Insert by `client_event_id`. On conflict, fetch the existing row and return
   its original result. Never regrade a duplicate against a later lesson.

Response is always `200` for a syntactically valid mixed batch:

```json
{
  "results": [
    {
      "clientUuid": "cae37cbf-0f35-40b8-8ccd-bc3572407436",
      "status": "accepted",
      "serverScore": { "score": 1, "maxScore": 1, "isCorrect": true },
      "gradingState": "automatically_graded",
      "feedback": { "en": "...", "ar": "..." }
    },
    {
      "clientUuid": "359b513b-c531-494c-9362-48b9095d62e1",
      "status": "duplicate",
      "gradingState": "manual_pending"
    },
    {
      "clientUuid": "97f6fcb1-9f41-48c1-b220-c956791c3142",
      "status": "rejected",
      "error": { "code": "ASSIGNMENT_VERSION_MISMATCH", "message": "Event does not match the assignment." }
    }
  ],
  "syncedAt": "2026-09-02T10:22:00.000Z"
}
```

The queue deletes `accepted` and `duplicate`, retains `rejected` for inspection,
and retries network/`429`/`5xx` failures with capped exponential backoff. A
malformed top-level request returns `400` and stores nothing.

## Teacher dashboard, reviews, and CSV

### Objective mastery

`GET /api/v1/classes/{classId}/mastery?assignmentId={id}`

Teacher/admin only. Use each learner's latest valid pre/post response per mapped
objective; never average repeated retries as independent learners.

```json
{
  "classId": "99ae3b8c-0491-4b04-b329-d24752555e35",
  "assignmentId": "18ae6864-5663-4980-8a25-437796d4e9fe",
  "summary": { "assigned": 28, "started": 25, "completed": 21, "completionRate": 0.75 },
  "objectives": [{
    "objectiveId": "L1-O2",
    "preMedianPercent": 42,
    "postMedianPercent": 67,
    "medianGainPoints": 25,
    "learnersMeasured": 20
  }],
  "learners": [{
    "membershipId": "1f7b9180-b2aa-4f52-8c18-26da88fd8186",
    "learnerId": "learner_014",
    "completionPercent": 82,
    "manualReviewsPending": 1
  }]
}
```

### Open-response review

- `GET /api/v1/assignments/{assignmentId}/reviews?state=pending` returns events
  with learner ID, localized prompt, response, max score, and rubric. It never
  returns real names or answer keys unrelated to that response.
- `PUT /api/v1/learning-events/{clientUuid}/review` accepts:

  ```json
  {
    "rubricResults": {
      "criteria": [{ "criterionId": "evidence", "score": 2, "maxScore": 3 }]
    },
    "score": 4,
    "maxScore": 6,
    "feedback": "Clear reasoning; add one stakeholder risk."
  }
  ```

  Validate the rubric total and teacher ownership, then upsert the unique
  `teacher_reviews` row. Return it with `200`. Learning events stay append-only;
  reporting treats the review as the authoritative manual grade.

### CSV export

`GET /api/v1/classes/{classId}/export.csv?assignmentId={id}` is teacher/admin
only and returns UTF-8 CSV with BOM, `Content-Type: text/csv; charset=utf-8`, and
an attachment filename. Columns are learner ID, assignment, objective, attempts,
latest score, max score, completion, and review state. Escape RFC 4180 fields and
prefix cells beginning with `=`, `+`, `-`, or `@` with `'` to prevent spreadsheet
formula injection. Do not include Auth IDs, emails, PIN state, IP hashes, or raw
audit data.

## Structured CMS, assets, publication, and rollback

All routes below are admin + `aal2` only. The CMS never accepts arbitrary HTML,
script, external iframe URLs, or a user-defined simulation implementation.

### Canonical lesson document

Draft `content` has this stable envelope:

```json
{
  "objectives": [{ "id": "L1-O1", "text": { "en": "...", "ar": "..." } }],
  "blocks": [{
    "id": "l1-explore-1",
    "type": "simulation",
    "objectiveIds": ["L1-O1"],
    "content": { "en": "...", "ar": "..." },
    "config": { "widget": "technology-timeline", "version": 1 },
    "textAlternative": { "en": "...", "ar": "..." }
  }],
  "assetIds": [],
  "keyTakeaway": { "en": "...", "ar": "..." },
  "reviewScheduleDays": [1, 7]
}
```

Allowed block types are `narrative`, `vocabulary`, `quiz`, `worked-example`,
`hint`, `discussion`, `open-response`, `rubric`, `retrieval`, and `simulation`.
Quiz/retrieval blocks also require bilingual `answerExplanation`, one or more
bilingual `hints`, and a server-only `answerKey`. Worked examples require a
bilingual `solution`; simulations require a bilingual `textAlternative` and a
configuration for an allow-listed widget. Rubrics require positive-score,
bilingual criteria. Publishing additionally verifies all objective mappings,
asset rights/alt text, and a total content-plus-assets budget <= 1 MiB.

### Draft lifecycle

- `POST /api/v1/admin/lessons` accepts `{ "slug", "unitNumber",
  "lessonNumber", "title": { "en", "ar" } }` and returns the lesson plus an
  empty version-1 draft with `201`.
- `POST /api/v1/admin/lessons/{lessonId}/drafts` clones an optional
  `{ "sourceVersionId" }` into the next version-number draft. Source content is
  copied; the source row remains immutable.
- `PUT /api/v1/admin/lesson-versions/{versionId}` accepts `{ "content": {...} }`
  only for a draft. Require `If-Match: "sha256-<currentContentHash>"`; stale
  writes return `409 CONFLICT` with the current hash. Return the new hash.
- `GET /api/v1/admin/lesson-versions/{versionId}/preview?viewport=mobile|desktop`
  returns the same sanitized renderer model used by the student player, plus
  clearly marked author validation warnings. It does not publish.
- `POST /api/v1/admin/lesson-versions/{versionId}/validate` calls
  `validate_lesson_version` and returns `{ "valid": boolean, "errors": [] }`.
- `POST /api/v1/admin/lesson-versions/{versionId}/publish` calls
  `publish_lesson_version` in one transaction. Response contains `{ "id",
  "lessonId", "version", "status": "published", "contentHash", "publishedAt" }`.
  Validation failures return `422 CONTENT_VALIDATION_FAILED` with field/path
  errors. Publishing archives the previous current version but never changes it.
- `POST /api/v1/admin/lessons/{lessonId}/rollback` accepts
  `{ "sourceVersionId" }` and calls `rollback_lesson_version`. It creates and
  publishes a new highest-numbered version copied from the source. It never
  reactivates or edits the old row. Return `201` with the new version.
- `GET /api/v1/admin/audit?entityType=lesson_version&entityId={id}` returns
  append-only audit entries newest first, with cursor pagination.

### Asset upload

`POST /api/v1/admin/assets` accepts multipart form data with one `file` plus
JSON fields `altText: {en,ar}`, `rightsHolder`, and `rightsBasis`; maximum upload
is 2 MiB. Decode and validate magic bytes as PNG/JPEG/WebP, strip metadata,
re-encode unsafe inputs to WebP, compute SHA-256 after processing, and upload to
the private `lesson-assets` bucket at an opaque UUID path. SVG, HTML, PDF,
animated images, polyglots, path-like filenames, and extension-only validation
are rejected. Insert metadata as `ready` only after Storage succeeds; delete the
object if the database write fails. Return `201`:

```json
{
  "asset": {
    "id": "fd3c1d03-1943-4811-a56b-98f2ec40b531",
    "mimeType": "image/webp",
    "byteSize": 24581,
    "sha256": "b2c8...",
    "altText": { "en": "...", "ar": "..." },
    "status": "ready"
  }
}
```

## Retention operations

No deletion job is installed or scheduled by the migrations.

- `GET /api/v1/admin/retention/candidates` lists classes archived more than 90
  days ago and requires MFA. This is a read-only preview.
- After a teacher export is made and institution policy permits deletion,
  `POST /api/v1/admin/retention/run` accepts `{ "confirm": "DELETE_EXPIRED" }`
  and calls `delete_expired_archived_class_data('90 days')`. It returns deleted
  class IDs and orphan student Auth user IDs. The server must then delete each
  orphan through the Supabase Auth Admin API and record an operational audit.
  Profiles cascade from Auth deletion. Never shorten the SQL-enforced 90-day
  minimum and never expose this RPC directly in a client.

## Transaction and integration requirements

- Run `supabase/migrations` before creating users so the `auth.users` profile
  trigger exists. Staff invites set trusted `app_metadata.app_role` to `teacher`
  or `admin`; user-editable metadata must never select a privileged role.
- Use the project region selected by the institution (Frankfurt is the current
  default assumption), enable PITR/managed backups for live learners, and use
  synthetic users only on free/non-backed-up projects.
- Event insertion, server grading, and duplicate-result lookup belong in one
  database transaction. Publishing and rollback are already transactional RPCs.
- When Auth plus database changes cannot share a transaction (roster/PIN/Auth
  deletion), implement explicit compensation and alert on failed compensation.
- Add request-level integration tests with a real local Supabase instance; mocks
  do not prove RLS. Test student A cannot access student B, teacher A cannot
  access teacher B's class, an `aal1` admin cannot use admin routes, raw lesson
  versions reject student SELECT, duplicate event UUIDs return the original
  grade, and archived-class retention returns Auth IDs for cleanup.
