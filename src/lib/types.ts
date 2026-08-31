export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Readonly<Record<Locale, string>>;

export type LocalizedStringList = Readonly<Record<Locale, readonly string[]>>;

export const ROLES = ["student", "teacher", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const LEARNING_PHASES = [
  "predict",
  "explore",
  "explain",
  "practice",
  "engineer",
  "transfer",
  "reflect",
  "review",
] as const;

export type LearningPhase = (typeof LEARNING_PHASES)[number];

/** Student-facing lesson structure. Blocks retain their original phase solely
 * for migration and reporting; the player groups them into these sections. */
export const LESSON_SECTION_IDS = [
  "overview",
  "learn",
  "examples",
  "activities",
  "practice",
  "quiz",
  "mistakes",
  "key-terms",
  "key-takeaways",
  "resources",
] as const;

export type LessonSectionId = (typeof LESSON_SECTION_IDS)[number];

export type LessonBlockType =
  | "narrative"
  | "vocabulary"
  | "quiz"
  | "worked-example"
  | "hint"
  | "discussion"
  | "open-response"
  | "retrieval"
  | "simulation";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface LessonObjective {
  readonly id: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
}

export interface KeyConcept {
  readonly id: string;
  readonly term: LocalizedText;
  readonly definition: LocalizedText;
}

export interface BaseLessonBlock {
  readonly id: string;
  readonly type: LessonBlockType;
  readonly phase: LearningPhase;
  readonly title: LocalizedText;
  readonly objectiveIds: readonly string[];
  readonly estimatedMinutes?: number;
}

export interface NarrativeBlock extends Omit<BaseLessonBlock, "type"> {
  readonly type: "narrative";
  readonly body: LocalizedText;
  readonly callout?: {
    readonly label: LocalizedText;
    readonly body: LocalizedText;
    readonly tone: "fact" | "idea" | "warning";
  };
}

export interface VocabularyTerm {
  readonly id: string;
  readonly term: LocalizedText;
  readonly definition: LocalizedText;
  readonly example?: LocalizedText;
}

export interface VocabularyBlock extends Omit<BaseLessonBlock, "type"> {
  readonly type: "vocabulary";
  readonly terms: readonly VocabularyTerm[];
}

export interface QuizChoice {
  readonly id: string;
  readonly text: LocalizedText;
}

export interface AssessmentMetadata {
  readonly kind: "pre" | "practice" | "post";
  readonly parallelSetId?: string;
  readonly feedbackMode: "immediate" | "after-sync";
}

interface QuizBlockBase extends Omit<BaseLessonBlock, "type"> {
  readonly type: "quiz";
  readonly prompt: LocalizedText;
  readonly explanation: LocalizedText;
  readonly hints: readonly LocalizedText[];
  readonly assessment: AssessmentMetadata;
}

export interface McqQuizBlock extends QuizBlockBase {
  readonly quizType: "mcq";
  readonly choices: readonly QuizChoice[];
  readonly correctChoiceId: string;
}

export interface MultipleSelectQuizBlock extends QuizBlockBase {
  readonly quizType: "multiple-select";
  readonly choices: readonly QuizChoice[];
  readonly correctChoiceIds: readonly string[];
}

export interface TrueFalseQuizBlock extends QuizBlockBase {
  readonly quizType: "true-false";
  readonly statement: LocalizedText;
  readonly correctAnswer: boolean;
}

export interface MatchingPair {
  readonly id: string;
  readonly left: LocalizedText;
  readonly right: LocalizedText;
}

export interface MatchingQuizBlock extends QuizBlockBase {
  readonly quizType: "matching";
  readonly pairs: readonly MatchingPair[];
}

export interface OrderingItem {
  readonly id: string;
  readonly text: LocalizedText;
}

export interface OrderingQuizBlock extends QuizBlockBase {
  readonly quizType: "ordering";
  readonly items: readonly OrderingItem[];
  readonly correctOrder: readonly string[];
}

export interface ClassificationCategory {
  readonly id: string;
  readonly label: LocalizedText;
}

export interface ClassificationItem {
  readonly id: string;
  readonly text: LocalizedText;
  readonly correctCategoryId: string;
}

export interface ClassificationQuizBlock extends QuizBlockBase {
  readonly quizType: "classification";
  readonly categories: readonly ClassificationCategory[];
  readonly items: readonly ClassificationItem[];
}

export interface ClozeQuizBlock extends QuizBlockBase {
  readonly quizType: "cloze";
  /** Use {{blank}} once in each localized prompt. */
  readonly text: LocalizedText;
  readonly acceptedAnswers: LocalizedStringList;
  readonly caseSensitive?: boolean;
}

export type QuizBlock =
  | McqQuizBlock
  | MultipleSelectQuizBlock
  | TrueFalseQuizBlock
  | MatchingQuizBlock
  | OrderingQuizBlock
  | ClassificationQuizBlock
  | ClozeQuizBlock;

export interface WorkedExampleBlock extends Omit<BaseLessonBlock, "type"> {
  readonly type: "worked-example";
  readonly challenge: LocalizedText;
  readonly attemptPrompt: LocalizedText;
  readonly solution: LocalizedText;
  readonly reasoningSteps: readonly LocalizedText[];
  readonly revealAfterAttempt: true;
}

export interface HintBlock extends Omit<BaseLessonBlock, "type"> {
  readonly type: "hint";
  readonly relatedBlockId: string;
  readonly prompt: LocalizedText;
  /** Ordered from a small nudge to the most explicit support. */
  readonly levels: readonly LocalizedText[];
}

export interface DiscussionBlock extends Omit<BaseLessonBlock, "type"> {
  readonly type: "discussion";
  readonly pairing: "in-person";
  readonly noChat: true;
  readonly instructions: LocalizedText;
  readonly prompts: readonly LocalizedText[];
  readonly individualConclusionPrompt: LocalizedText;
}

export interface RubricCriterion {
  readonly id: string;
  readonly label: LocalizedText;
  readonly description: LocalizedText;
  readonly maxPoints: number;
}

export interface OpenResponseBlock extends Omit<BaseLessonBlock, "type"> {
  readonly type: "open-response";
  readonly responseKind:
    | "prediction"
    | "engineer"
    | "six-mark"
    | "transfer"
    | "reflection";
  readonly prompt: LocalizedText;
  readonly guidance?: LocalizedText;
  readonly minimumCharacters?: number;
  readonly maxScore?: number;
  readonly rubric?: readonly RubricCriterion[];
  readonly sampleAnswer?: LocalizedText;
  readonly revealSampleAfterAttempt?: boolean;
}

export interface RetrievalBlock extends Omit<BaseLessonBlock, "type"> {
  readonly type: "retrieval";
  readonly prompt: LocalizedText;
  readonly answer: LocalizedText;
  readonly scheduleDays: readonly (1 | 7)[];
  readonly revealAfterAttempt: true;
}

export const APPROVED_SIMULATION_IDS = [
  "technology-timeline",
  "moores-law-graph",
  "edge-cloud-latency",
  "cashless-stakeholder-decision",
  "ai-ml-dl-hierarchy",
  "rules-vs-learning-sorter",
  "dataset-coverage",
  "hallucination-detective",
  "recommendation-data",
  "industry-mission-map",
  "human-oversight-decision",
  "privacy-library-recommender",
  "hiring-bias",
  "black-box-explainability",
  "accountability-mapper",
  "school-face-recognition-hearing",
] as const;

export type ApprovedSimulationId = (typeof APPROVED_SIMULATION_IDS)[number];

export interface SimulationBlock extends Omit<BaseLessonBlock, "type"> {
  readonly type: "simulation";
  readonly simulationId: ApprovedSimulationId;
  readonly instructions: LocalizedText;
  readonly accessibleAlternative: LocalizedText;
  readonly successCriteria: readonly LocalizedText[];
  readonly config: Readonly<Record<string, JsonValue>>;
}

export type LessonBlock =
  | NarrativeBlock
  | VocabularyBlock
  | QuizBlock
  | WorkedExampleBlock
  | HintBlock
  | DiscussionBlock
  | OpenResponseBlock
  | RetrievalBlock
  | SimulationBlock;

export type LessonPublicationStatus = "draft" | "published" | "archived";

export type CourseUnitStatus = "available" | "coming-soon" | "archived";

/** The curriculum hierarchy is intentionally not hard-coded to Part 1. */
export interface CourseUnit {
  readonly id: string;
  readonly sequence: number;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly status: CourseUnitStatus;
  readonly lessonCount: number;
}

export interface Course {
  readonly id: string;
  readonly title: LocalizedText;
  readonly units: readonly CourseUnit[];
}

export interface LessonAsset {
  readonly id: string;
  readonly path: string;
  readonly kind: "image" | "audio" | "document";
  readonly alt: LocalizedText;
  readonly rights: "original" | "licensed" | "public-domain";
  readonly rightsNote: string;
}

export interface LessonResource {
  readonly id: string;
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly fileType: "pdf" | "ppt" | "pptx";
  /** Storage path or a trusted download route; never an arbitrary embed URL. */
  readonly path: string;
  readonly uploadedAt: string;
  readonly downloadable: true;
}

export interface LessonVersion {
  readonly id: string;
  readonly lessonId: string;
  readonly unitId: string;
  readonly sequence: number;
  readonly slug: string;
  readonly version: number;
  readonly status: LessonPublicationStatus;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly estimatedMinutes: number;
  readonly objectives: readonly LessonObjective[];
  readonly keyConcepts: readonly KeyConcept[];
  readonly blocks: readonly LessonBlock[];
  readonly assets: readonly LessonAsset[];
  /** Short exam-revision statements. Older content can derive these from objectives. */
  readonly takeaways?: readonly LocalizedText[];
  /** Teacher-attached classroom material. An empty list means this section is hidden. */
  readonly resources?: readonly LessonResource[];
  readonly sourcePolicy: LocalizedText;
  readonly publishedAt?: string;
}

export interface LearningEvent {
  readonly id: string;
  readonly clientUuid: string;
  readonly learnerId: string;
  readonly assignmentId: string;
  readonly lessonVersionId: string;
  readonly blockId: string;
  readonly objectiveIds: readonly string[];
  readonly response: JsonValue;
  readonly attemptNumber: number;
  readonly clientTimestamp: string;
  readonly syncedAt?: string;
  readonly serverScore?: number;
}

export interface LearnerProgress {
  readonly assignmentId: string;
  readonly lessonVersionId: string;
  readonly completedBlockIds: readonly string[];
  readonly currentBlockId?: string;
  readonly currentSection?: LessonSectionId;
  readonly percentComplete: number;
  readonly lastActivityAt?: string;
}

export interface QuizAttempt {
  readonly id: string;
  readonly studentId: string;
  readonly classId: string;
  readonly lessonId: string;
  readonly quizId: string;
  readonly score: number;
  readonly totalQuestions: number;
  readonly percentage: number;
  readonly attemptNumber: number;
  readonly completedAt: string;
}

export interface StudentMistake {
  readonly id: string;
  readonly lessonId: string;
  readonly blockId: string;
  readonly question: LocalizedText;
  readonly learnerResponse: JsonValue;
  readonly correctAnswer?: JsonValue;
  readonly explanation?: LocalizedText;
  readonly reviewedAt?: string;
}

export interface StudentBookmark {
  readonly id: string;
  readonly lessonId: string;
  readonly section: LessonSectionId;
  readonly note?: string;
  readonly createdAt: string;
}

export interface Assignment {
  readonly id: string;
  readonly classId: string;
  readonly lessonVersionId: string;
  readonly title: LocalizedText;
  readonly opensAt?: string;
  readonly dueAt?: string;
}

export interface TeacherReview {
  readonly id: string;
  readonly learningEventId: string;
  readonly reviewerId: string;
  readonly rubricScores: Readonly<Record<string, number>>;
  readonly feedback: LocalizedText;
  readonly reviewedAt: string;
}

export interface UnitSummary {
  readonly id: string;
  readonly sequence: number;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly lessonIds: readonly string[];
}

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale];
}
