import { NextRequest, NextResponse } from "next/server";
import { getLessonBySlug, toLearnerLesson } from "@/content/unit1";
import { getAuthContext } from "@/lib/auth/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role === "student" && !session.curriculumAccess)) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson || lesson.status !== "published") return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const etag = `\"${lesson.id}-${lesson.version}\"`;
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  return NextResponse.json({ lesson: toLearnerLesson(lesson), cacheHash: `${lesson.id}-${lesson.version}` }, { headers: { ETag: etag, "Cache-Control": "private, max-age=0, must-revalidate", Vary: "Cookie" } });
}
