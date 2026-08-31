import type { LessonBlock, LessonSectionId, LessonVersion, LocalizedText } from "@/lib/types";

export interface ResolvedLessonSection {
  readonly id: LessonSectionId;
  readonly label: LocalizedText;
  readonly blocks: readonly LessonBlock[];
}

const labels: Record<LessonSectionId, LocalizedText> = {
  overview: { en: "Overview", ar: "نظرة عامة" },
  learn: { en: "Learn", ar: "تعلّم" },
  examples: { en: "Examples", ar: "أمثلة" },
  activities: { en: "Activities", ar: "أنشطة" },
  practice: { en: "Practice", ar: "تدرّب" },
  quiz: { en: "Quiz", ar: "اختبار" },
  mistakes: { en: "My Mistakes", ar: "أخطائي" },
  "key-terms": { en: "Key Terms", ar: "المصطلحات المهمة" },
  "key-takeaways": { en: "Key Takeaways", ar: "أهم النقاط" },
  resources: { en: "Lesson Resources", ar: "مصادر الدرس" },
};

export function getSectionLabel(id: LessonSectionId): LocalizedText {
  return labels[id];
}

/**
 * Migrates the original detailed teaching rhythm into short, classroom-friendly
 * student sections without altering content blocks or their stable IDs.
 */
export function getLessonSections(
  lesson: LessonVersion,
  includeMistakes = false,
  includeUploadedResources = false,
): readonly ResolvedLessonSection[] {
  const blocks = lesson.blocks;
  const sections: ResolvedLessonSection[] = [
    { id: "overview", label: labels.overview, blocks: [] },
    { id: "learn", label: labels.learn, blocks: blocks.filter((block) => block.type === "narrative") },
    { id: "examples", label: labels.examples, blocks: blocks.filter((block) => block.type === "worked-example") },
    { id: "activities", label: labels.activities, blocks: blocks.filter((block) => block.type === "simulation" || block.type === "discussion") },
    {
      id: "practice",
      label: labels.practice,
      blocks: blocks.filter((block) =>
        block.type === "hint" || block.type === "retrieval" || block.type === "open-response" || (block.type === "quiz" && block.assessment.kind === "practice"),
      ),
    },
    { id: "quiz", label: labels.quiz, blocks: blocks.filter((block) => block.type === "quiz" && block.assessment.kind !== "practice") },
  ];

  if (includeMistakes) sections.push({ id: "mistakes", label: labels.mistakes, blocks: [] });
  if (lesson.keyConcepts.length || blocks.some((block) => block.type === "vocabulary")) {
    sections.push({ id: "key-terms", label: labels["key-terms"], blocks: blocks.filter((block) => block.type === "vocabulary") });
  }
  sections.push({ id: "key-takeaways", label: labels["key-takeaways"], blocks: [] });
  if (lesson.resources?.length || includeUploadedResources) sections.push({ id: "resources", label: labels.resources, blocks: [] });

  return sections.filter((section) => section.id === "overview" || section.id === "key-takeaways" || section.blocks.length > 0 || section.id === "key-terms" || section.id === "resources" || section.id === "mistakes");
}

export function getLessonTakeaways(lesson: LessonVersion): readonly LocalizedText[] {
  return lesson.takeaways?.length
    ? lesson.takeaways
    : lesson.objectives.slice(0, 4).map((objective) => objective.title);
}
