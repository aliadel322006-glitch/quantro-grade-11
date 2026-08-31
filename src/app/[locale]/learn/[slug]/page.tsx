import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson-player";
import { getLessonBySlug, toLearnerLesson } from "@/content/unit1";
import { isLocale } from "@/lib/i18n";
import { requireStudentCurriculum } from "@/lib/auth/guards";

export default async function LessonPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson || !isLocale(locale)) notFound();
  await requireStudentCurriculum(locale);
  return <LessonPlayer lesson={toLearnerLesson(lesson)} locale={locale} />;
}
