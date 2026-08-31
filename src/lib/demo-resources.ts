import { loadLearnerState, saveLearnerState } from "@/lib/offline";
import type { LessonResource, LocalizedText } from "@/lib/types";

export interface DemoLessonResource extends Omit<LessonResource, "path"> {
  /** Kept in IndexedDB only for the local/demo experience. Production uses a
   * private Storage path and a short-lived signed download URL. */
  readonly fileName: string;
  readonly blob: Blob;
}

const resourceKey = (lessonSlug: string) => `quantro-ai:teacher-resources:${lessonSlug}`;

export function supportedResourceType(fileName: string): "pdf" | "ppt" | "pptx" | null {
  const extension = fileName.split(".").pop()?.toLocaleLowerCase();
  return extension === "pdf" || extension === "ppt" || extension === "pptx" ? extension : null;
}

export async function loadDemoLessonResources(lessonSlug: string): Promise<readonly DemoLessonResource[]> {
  return (await loadLearnerState<DemoLessonResource[]>(resourceKey(lessonSlug))) ?? [];
}

export async function saveDemoLessonResources(lessonSlug: string, resources: readonly DemoLessonResource[]): Promise<void> {
  await saveLearnerState(resourceKey(lessonSlug), [...resources]);
}

export function makeDemoLessonResource(
  id: string,
  file: File,
  title: LocalizedText,
  description?: LocalizedText,
): DemoLessonResource | null {
  const fileType = supportedResourceType(file.name);
  if (!fileType || file.size === 0 || file.size > 20 * 1024 * 1024) return null;
  return {
    id,
    title,
    ...(description?.en.trim() || description?.ar.trim() ? { description } : {}),
    fileType,
    fileName: file.name,
    blob: file,
    uploadedAt: new Date().toISOString(),
    downloadable: true,
  };
}
