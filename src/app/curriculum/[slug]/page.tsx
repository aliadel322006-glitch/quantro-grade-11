import { redirect } from "next/navigation";

export default async function CurriculumLessonAlias({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/en/learn/${slug}`);
}
