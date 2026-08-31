import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLessonById } from "@/content/unit1";
import { getAuthContext } from "@/lib/auth/server";

const acceptedEvents = new Map<string, string>();

const eventSchema = z.object({
  clientUuid: z.string().uuid(),
  assignmentId: z.string().min(1).max(120),
  lessonVersionId: z.string().min(1).max(120),
  blockId: z.string().min(1).max(120),
  objectiveIds: z.array(z.string().min(1).max(120)).max(12),
  response: z.unknown(),
  attempt: z.number().int().min(1).max(50),
  clientCreatedAt: z.string().datetime({ offset: true }),
  eventType: z.enum(["response_submitted", "assessment_submitted", "reflection_submitted", "simulation_completed", "retrieval_answered"]).optional(),
}).strict();

const payloadSchema = z.object({ events: z.array(eventSchema).min(1).max(25) }).strict();

function scoreEvent(lessonVersionId: string, blockId: string, response: unknown) {
  const lesson = getLessonById(lessonVersionId);
  const question = lesson?.quiz.find((item) => item.id === blockId) ?? lesson?.practice.find((item) => item.id === blockId);
  if (!question) return { gradingState: "ungraded" as const };
  if (question) {
    const isCorrect = response === question.answer;
    return { gradingState: "automatically_graded" as const, serverScore: { score: isCorrect ? 1 : 0, maxScore: 1, isCorrect } };
  }
}

/**
 * Idempotent event receiver. Production deployments replace the in-memory map
 * with the unique `learning_events.client_uuid` constraint through Supabase.
 * Scores are derived here from immutable lesson content, never supplied by the client.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid learning-event batch." }, { status: 400 });
  const session = await getAuthContext();
  if (!session || session.role !== "student" || !session.curriculumAccess) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const results = parsed.data.events.map((event) => {
    if (acceptedEvents.has(event.clientUuid)) return { clientUuid: event.clientUuid, status: "duplicate" as const };
    const grading = scoreEvent(event.lessonVersionId, event.blockId, event.response);
    acceptedEvents.set(event.clientUuid, new Date().toISOString());
    return { clientUuid: event.clientUuid, status: "accepted" as const, ...grading };
  });
  return NextResponse.json({ results, syncedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
