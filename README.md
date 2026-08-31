# Quantro AI — Grade 11 Unit 1 pilot

A mobile-first English/Arabic PWA for the first four Grade 11 lessons on
information technology and artificial intelligence. The lessons use newly
authored explanations, questions, scenarios, diagrams, and simulations; no
textbook page, diagram, or question wording is reproduced.

## What is included

- Four bilingual, right-to-left aware lessons: IT and society, how AI works,
  AI in life, and AI ethics.
- The complete learning rhythm: Predict, Explore, Explain, Practice, Think as
  an Engineer, Transfer, Reflect, and spaced Review.
- Original keyboard/touch accessible simulations for every planned Unit 1
  experience, plus MCQ, multiple select, true/false, matching, ordering,
  classification, cloze, worked examples, rubrics, retrieval, and individual
  conclusions after in-person discussion.
- Offline lesson packages, IndexedDB drafts/event queue, service-worker caching,
  retry, and idempotent event identifiers.
- Separate public learner packages: pre/post assessment answer keys, hints, and
  explanations stay on the server-side lesson source and are not sent to the
  browser or offline cache.
- Bilingual teacher/admin interface prototypes, structured-content types, a
  versioned Supabase schema with RLS, publishing validation, audit fields,
  login throttling workflow, private asset rules, and retention workflow.
- A public Quantro AI entry page; protected student curriculum and teacher
  workspace routes; self-service student registration through secure access
  codes; and teacher access-code management.

## Access and route model

`/`, `/en`, and `/ar` are public Quantro AI landing pages. They link to
separate student and teacher sign-in routes; the localized student workspace
is `/[locale]/dashboard`. The student dashboard, lesson player, offline lesson
downloads, and learning APIs require a student account with curriculum access.
Teacher dashboards and access-code management require a teacher or admin
account. Administrators sign in at `/[locale]/auth/admin/login`; their
server-controlled role is stored in Supabase Auth `app_metadata`, never in a
browser request. The direct aliases `/student/dashboard`, `/teacher/dashboard`, and
`/curriculum/[slug]` enforce the same checks before redirecting to localized
pages.

Students create an account with their full name, email address, password, and
an access code issued by a teacher. A general code grants private curriculum
access; a class code also joins the student to that teacher's class. Codes are
HMAC-hashed before database storage, expire or reach their use limit server
side, and are redeemed atomically. Raw codes are displayed only at creation or
regeneration time in the production interface.

## Run locally

Use Node.js 22.22 or newer.

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. In demo mode (no Supabase URL is configured),
use these account credentials:

| Account | Email | Password |
| --- | --- |
| Student | `student@quantro.demo` | `DemoStudent!26` |
| Teacher | `teacher@quantro.demo` | `DemoTeacher!26` |

To test a new student, sign in as the demo teacher, open **Access codes**, make
a general or class code, then register a student with that code. Demo accounts
and codes are local-only and are reset when the development server restarts.

The demo deliberately starts with no administrator. Open `/en/setup/admin` or
`/ar/setup/admin` to create one administrator account for the current local
server process, then sign in through the administrator login route. From the
administrator workspace, a demo teacher invitation produces a local
password-setup link instead of sending email.

Use `npm run check` before deployment. It runs ESLint Core Web Vitals checks,
strict TypeScript checking, unit tests, and the production build. Build output
is deliberately written to `.next-local`; this avoids a legacy `.next` junction
that can exist in the supplied workspace.

## Supabase setup for a real pilot

1. Create a paid Supabase project in the institution-approved region.
2. Apply the migrations in order with the Supabase CLI:

   ```powershell
   supabase db push
   ```

3. Set the browser-safe URL and publishable/anon key, plus the server-only
   service-role key, login pepper, access-code pepper, and `APP_ORIGIN` in the
   Vercel project.
   Start from `.env.example`; never expose the service-role key in a
   `NEXT_PUBLIC_*` variable.
4. With no administrator yet present, open `/en/setup/admin` (or the Arabic
   equivalent) and create the first administrator inside Quantro AI. This
   route closes permanently after the first account is created; do not create
   administrators by editing `profiles` in the dashboard.
5. Sign in as that administrator, open **Security**, and enroll/verify an
   authenticator-app factor. Teacher directory and invitation actions require
   AAL2 MFA. Then use **Teachers** to invite staff. The server sends Supabase’s
   password-setup email, stamps `app_metadata.app_role = teacher`, and creates
   the matching `profiles.role = teacher`; it rejects existing student emails
   instead of promoting them.
6. Configure Supabase Auth email delivery and add the deployed
   `APP_ORIGIN/auth/callback` URL to Supabase Auth redirect URLs before sending
   real invitations. Test email delivery with a non-production teacher first.
7. Verify RLS with separate student, teacher, and admin accounts before loading
   real learners. Keep the local demo account disabled once Supabase is set.
8. Enable managed backups and agree the institution's privacy, residency, and
   90-day post-archive retention requirements before collecting student work.

`docs/API.md` is the implementation contract for the Supabase-backed staff,
roster, assignment, CMS, grading, and export routes. The current no-credential
demo is for content and classroom-flow validation, not real-student deployment.

## Deployment and quality checks

Deploy the repository to Vercel, set the environment variables there, and use
the Node version declared in `package.json`. The app sends security headers,
does not use third-party behavioural analytics, and has no live AI tutor,
student chat, external model training, or collection of sensitive personal
data.

Before the 30–60 learner pilot, complete the manual acceptance checks in the
project plan: Android Chrome, iOS Safari, desktop browsers, keyboard and screen
reader operation, reduced motion, 200% reflow, offline close/reopen/sync, shared
device logout, class isolation, PIN lockout, unsafe asset rejection, and the
full CMS bilingual/accessibility/rights publication gate.
"# quantro-grade-11" 
