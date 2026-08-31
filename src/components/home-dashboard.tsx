"use client";

import { ArrowRight, BarChart3, BookOpen, BrainCircuit, CheckCircle2, ChevronDown, CircleAlert, Clock3, Code2, GraduationCap, LayoutDashboard, LockKeyhole, Megaphone, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GlobalContentPanels } from "@/components/global-content-panels";
import { grade11ProgrammingCourse } from "@/content/course-catalog";
import { part1Lessons } from "@/content/part1-curriculum";
import { readProgress, type LocalProgress } from "@/lib/demo-progress";
import type { AppLocale } from "@/lib/i18n";
import { calculateDashboardMetrics, chooseDashboardRecommendation, completedTaskCount, dashboardLessonState, taskCountFor } from "@/lib/student-dashboard";
import type { StudentDashboardClassSummary } from "@/lib/student-dashboard-server";

const unitIcons = [BrainCircuit, ShieldCheck, Code2, LayoutDashboard] as const;
const unitColors = ["#00865a", "#4f46e5", "#c47708", "#7b748c"] as const;

const copy = {
  en: {
    greeting: ["Good morning", "Good afternoon", "Good evening"], welcome: "Let’s continue your learning journey.", continue: "Continue Learning", continueButton: "Continue Lesson", overall: "Overall Progress", completed: "Completed Lessons", inProgress: "In Progress", notStarted: "Not Started", curriculumProgress: "Curriculum Progress", viewAll: "View Curriculum", viewCurriculum: "View Curriculum", recommended: "Recommended Next Step", recommendationIntro: "A focused academic action keeps your momentum going.", startNext: "Start Next Lesson", reviewMistakes: "Review Mistakes", curriculumHeading: "My Curriculum", curriculumTitle: "Programming & Artificial Intelligence — Grade 11", curriculumIntro: "Track every lesson in your Grade 11 curriculum.", completedLabel: "Completed", inProgressLabel: "In Progress", notStartedLabel: "Not Started", start: "Start lesson", resume: "Resume lesson", ready: "Ready to begin", learningProgress: "learning tasks complete", quizResults: "Quiz Results", noQuiz: "Your submitted quiz results will appear here.", latestScore: "Latest score", quizAverage: "Quiz average", quizzesCompleted: "Completed quizzes", mistakes: "My Mistakes", noMistakes: "No quiz reviews are needed yet.", questionsNeedReview: "questions need review", review: "Review Mistakes", myClass: "My Class", classesText: "Join a class with the secure code provided by your teacher.", joinClass: "Join a Class", teacher: "Teacher", connected: "Connected", announcements: "Announcements", announcementsText: "Teacher announcements will appear here when your class shares them.", noAnnouncements: "No announcements have been posted yet.", waitingForClass: "Waiting for class connection", unit: "Unit", lessons: "lessons", allComplete: "You have completed every available lesson.", reviewCurriculum: "Review Curriculum", readyFor: "You’re ready for:", reviewFrom: "Review your mistakes from", expandUnit: "Expand unit", collapseUnit: "Collapse unit",
  },
  ar: {
    greeting: ["صباح الخير", "مساء الخير", "مساء الخير"], welcome: "لنواصل رحلة التعلّم الخاصة بك.", continue: "متابعة التعلّم", continueButton: "متابعة الدرس", overall: "التقدم الكلي", completed: "الدروس المكتملة", inProgress: "قيد التقدم", notStarted: "لم يبدأ", curriculumProgress: "تقدم المنهج", viewAll: "عرض المنهج", viewCurriculum: "عرض المنهج", recommended: "الخطوة التالية المقترحة", recommendationIntro: "خطوة دراسية محددة تساعدك على مواصلة التقدم.", startNext: "ابدأ الدرس التالي", reviewMistakes: "راجع أخطاءك", curriculumHeading: "منهجي", curriculumTitle: "البرمجة والذكاء الاصطناعي — الصف الحادي عشر", curriculumIntro: "تابع كل درس في منهج الصف الحادي عشر.", completedLabel: "مكتمل", inProgressLabel: "قيد التقدم", notStartedLabel: "لم يبدأ", start: "ابدأ الدرس", resume: "استكمل الدرس", ready: "جاهز للبدء", learningProgress: "مهام تعلّم مكتملة", quizResults: "نتائج الاختبارات", noQuiz: "ستظهر نتائج الاختبارات التي أرسلتها هنا.", latestScore: "أحدث نتيجة", quizAverage: "متوسط الاختبارات", quizzesCompleted: "الاختبارات المكتملة", mistakes: "أخطائي", noMistakes: "لا توجد مراجعات للاختبار حتى الآن.", questionsNeedReview: "أسئلة تحتاج إلى مراجعة", review: "راجع الأخطاء", myClass: "فصلي", classesText: "انضم إلى فصل باستخدام الرمز الآمن الذي يقدمه معلّمك.", joinClass: "انضم إلى فصل", teacher: "المعلّم", connected: "متصل", announcements: "الإعلانات", announcementsText: "ستظهر إعلانات المعلّم هنا عند مشاركتها مع فصلك.", noAnnouncements: "لا توجد إعلانات منشورة حتى الآن.", waitingForClass: "بانتظار الاتصال بالفصل", unit: "الوحدة", lessons: "دروس", allComplete: "لقد أكملت كل الدروس المتاحة.", reviewCurriculum: "راجع المنهج", readyFor: "أنت مستعد لـ:", reviewFrom: "راجع أخطاءك في", expandUnit: "توسيع الوحدة", collapseUnit: "طي الوحدة",
  },
} as const;

type DashboardLesson = (typeof part1Lessons)[number] & { readonly icon: (typeof unitIcons)[number] };
const lessons: readonly DashboardLesson[] = part1Lessons.map((lesson) => ({ ...lesson, icon: unitIcons[(lesson.unit - 1) % unitIcons.length] }));

function greetingIndex(hour: number) { return hour < 12 ? 0 : hour < 18 ? 1 : 2; }

function localized(value: { en: string; ar: string }, locale: AppLocale) { return value[locale]; }

export function HomeDashboard({ locale, studentName, classSummary = null }: { locale: AppLocale; studentName?: string; classSummary?: StudentDashboardClassSummary | null }) {
  const t = copy[locale];
  const [progress, setProgress] = useState<LocalProgress>({});
  const [hour, setHour] = useState<number | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [openUnits, setOpenUnits] = useState<Set<number>>(() => new Set([1]));
  const autoOpenedUnit = useRef(false);

  useEffect(() => {
    const update = () => { setProgress(readProgress()); setProgressLoaded(true); };
    update();
    setHour(new Date().getHours());
    window.addEventListener("quantro-ai:progress", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("quantro-ai:progress", update); window.removeEventListener("storage", update); };
  }, []);

  const metrics = useMemo(() => calculateDashboardMetrics(lessons, progress), [progress]);
  const continueLesson = metrics.continueLesson ?? lessons[0];

  const unitProgress = useMemo(() => grade11ProgrammingCourse.units.map((unit, index) => {
    const unitLessons = lessons.filter((lesson) => lesson.unit === unit.sequence);
    const completed = unitLessons.filter((lesson) => dashboardLessonState(progress, lesson) === "completed").length;
    const completedTasks = unitLessons.reduce((total, lesson) => total + completedTaskCount(progress, lesson), 0);
    const totalTasks = unitLessons.reduce((total, lesson) => total + taskCountFor(lesson), 0);
    return { unit, completed, percent: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0, Icon: unitIcons[index], color: unitColors[index], lessons: unitLessons };
  }), [progress]);

  const quizResults = useMemo(() => lessons.flatMap((lesson) => {
    const score = progress[lesson.slug]?.score;
    return typeof score === "number" ? [{ lesson, score }] : [];
  }).sort((a, b) => (progress[b.lesson.slug]?.updatedAt ?? "").localeCompare(progress[a.lesson.slug]?.updatedAt ?? "")), [progress]);
  const recordedReviews = useMemo(() => lessons.flatMap((lesson) => {
    const mistakes = progress[lesson.slug]?.mistakes ?? [];
    return mistakes.length ? [{ lesson, mistakes: mistakes.length, updatedAt: progress[lesson.slug]?.updatedAt ?? "" }] : [];
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)), [progress]);
  const scoreReviews = quizResults.filter(({ lesson, score }) => score < lesson.quiz.length).map(({ lesson, score }) => ({ lesson, mistakes: Math.max(lesson.quiz.length - score, 0) }));
  const reviews = recordedReviews.length ? recordedReviews : scoreReviews;
  const mistakeCount = reviews.reduce((total, review) => total + review.mistakes, 0);
  const quizAverage = quizResults.length
    ? Math.round((quizResults.reduce((total, { score }) => total + score, 0) / quizResults.reduce((total, { lesson }) => total + lesson.quiz.length, 0)) * 100)
    : 0;
  const recommendation = useMemo(() => chooseDashboardRecommendation(lessons, progress, continueLesson), [continueLesson, progress]);
  const continueTasks = completedTaskCount(progress, continueLesson);
  const continueTaskTotal = taskCountFor(continueLesson);
  const name = studentName ?? (locale === "ar" ? "الطالب" : "Student");
  const greeting = t.greeting[hour === null ? 1 : greetingIndex(hour)];

  useEffect(() => {
    if (!progressLoaded || autoOpenedUnit.current) return;
    setOpenUnits(new Set([continueLesson.unit]));
    autoOpenedUnit.current = true;
  }, [continueLesson.unit, progressLoaded]);

  const toggleUnit = (unit: number) => setOpenUnits((current) => {
    const next = new Set(current);
    if (next.has(unit)) next.delete(unit); else next.add(unit);
    return next;
  });

  const openUnit = (unit: number) => setOpenUnits((current) => new Set(current).add(unit));
  const recommendationView = recommendation?.kind === "review-mistakes"
    ? { title: `${t.reviewFrom} ${recommendation.lesson.number} ${recommendation.lesson.title[locale]}`, href: `/${locale}/learn/${recommendation.lesson.slug}#quiz`, button: t.reviewMistakes }
    : recommendation?.kind === "start-next"
      ? { title: `${t.readyFor} ${recommendation.lesson.number} ${recommendation.lesson.title[locale]}`, href: `/${locale}/learn/${recommendation.lesson.slug}`, button: t.startNext }
      : recommendation?.kind === "review-curriculum"
        ? { title: t.allComplete, href: "#curriculum-browser", button: t.reviewCurriculum }
        : null;
  const announcement = classSummary?.latestAnnouncement;

  return <main id="main-content" className="page shell quantro-dashboard">
    <header className="dashboard-greeting"><div><h1>{greeting}، {name}! <span aria-hidden="true">👋</span></h1><p>{t.welcome}</p></div></header>

    <section className="dashboard-primary-grid" aria-label={locale === "ar" ? "ملخص التعلّم" : "Learning summary"}>
      <article className="continue-learning-card">
        <div className="continue-copy"><span className="dashboard-kicker">{t.continue}</span><h2>{continueLesson.number} {continueLesson.title[locale]}</h2><p>{continueTasks ? `${continueTasks}/${continueTaskTotal} ${t.learningProgress}` : t.ready}</p><Link className="button" href={`/${locale}/learn/${continueLesson.slug}`}>{t.continueButton}<ArrowRight className="flip-rtl" size={18} /></Link></div>
        <div className="continue-illustration" aria-hidden="true"><div className="illustration-orbit" /><BookOpen /><Sparkles /><div className="illustration-lines"><i /><i /><i /></div></div>
      </article>
      <article className="overall-progress-card">
        <h2>{t.overall}</h2><div className="overall-progress-body"><div className="progress-ring stitch-ring" style={{ "--progress": `${metrics.percentage}%` } as React.CSSProperties} role="img" aria-label={`${metrics.percentage}% ${t.overall}`}><div className="stitch-ring-center"><span>{locale === "ar" ? "مكتمل" : "complete"}</span><strong>{metrics.percentage}%</strong></div></div><dl><div><dt>{t.completed}</dt><dd><span className="number-fraction" dir="ltr">{metrics.completed.length} / {lessons.length}</span></dd></div><div><dt>{t.inProgress}</dt><dd>{metrics.inProgress.length}</dd></div><div><dt>{t.notStarted}</dt><dd>{metrics.notStarted}</dd></div></dl></div><a className="text-action" href="#curriculum-progress">{t.viewCurriculum}<ArrowRight className="flip-rtl" size={16} /></a>
      </article>
    </section>

    <section className="dashboard-progress-grid" data-has-recommendation={Boolean(recommendationView)}>
      <article id="curriculum-progress" className="dashboard-surface course-progress-board"><div className="card-heading"><h2>{t.curriculumProgress}</h2><a className="text-action" href="#curriculum-browser">{t.viewAll}<ArrowRight className="flip-rtl" size={15} /></a></div><div className="unit-progress-grid">{unitProgress.map(({ unit, completed, percent, Icon, color, lessons: unitLessons }) => <a href={`#curriculum-unit-${unit.sequence}`} onClick={() => openUnit(unit.sequence)} className="unit-progress-card" style={{ "--unit-accent": color } as React.CSSProperties} key={unit.id} aria-label={`${unit.title[locale]}: ${percent}%`}><span className="unit-progress-icon"><Icon size={21} /></span><span className="unit-number">{t.unit} {unit.sequence}</span><strong>{unit.title[locale]}</strong><span className="unit-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`${unit.title[locale]} ${percent}%`}><i style={{ width: `${percent}%` }} /></span><small>{completed} / {unitLessons.length} {t.lessons}<b>{percent}%</b></small></a>)}</div></article>
      {recommendationView && <article className="recommended-card"><span className="recommended-icon"><GraduationCap size={27} /></span><div><h2>{t.recommended}</h2><p>{t.recommendationIntro}</p><strong>{recommendationView.title}</strong><Link className="button success" href={recommendationView.href}>{recommendationView.button}<ArrowRight className="flip-rtl" size={17} /></Link></div></article>}
    </section>

    <section id="curriculum-browser" className="dashboard-surface course-browser curriculum-browser" aria-labelledby="curriculum-browser-title">
      <div className="card-heading"><div><span className="dashboard-kicker">{t.curriculumHeading}</span><h2 id="curriculum-browser-title">{t.curriculumTitle}</h2><p>{t.curriculumIntro}</p></div><span className="completion-chip"><CheckCircle2 size={15} />{metrics.completed.length}/{lessons.length}</span></div>
      <div className="course-unit-list">{unitProgress.map(({ unit, completed, percent, lessons: unitLessons, Icon, color }) => {
        const open = openUnits.has(unit.sequence);
        const triggerId = `curriculum-unit-${unit.sequence}`;
        const panelId = `${triggerId}-lessons`;
        return <section id={triggerId} className="course-unit-section unit-accordion" data-open={open} key={unit.id} style={{ "--unit-accent": color } as React.CSSProperties}>
          <button className="unit-accordion-trigger" type="button" id={`${triggerId}-trigger`} aria-expanded={open} aria-controls={panelId} onClick={() => toggleUnit(unit.sequence)}>
            <span className="unit-accordion-icon"><Icon size={20} /></span>
            <span className="unit-accordion-title"><small>{t.unit} {unit.sequence}</small><strong>{unit.title[locale]}</strong></span>
            <span className="unit-accordion-metrics"><span>{completed}/{unitLessons.length} {t.lessons}</span><b>{percent}%</b><span className="unit-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`${unit.title[locale]} ${percent}%`}><i style={{ width: `${percent}%` }} /></span></span>
            <ChevronDown className="unit-accordion-chevron" size={20} aria-hidden="true" />
            <span className="sr-only">{open ? t.collapseUnit : t.expandUnit}</span>
          </button>
          <div id={panelId} role="region" aria-labelledby={`${triggerId}-trigger`} hidden={!open} className="unit-accordion-panel"><div className="course-lesson-grid">{unitLessons.map((lesson) => {
            const state = dashboardLessonState(progress, lesson);
            const completedTasks = completedTaskCount(progress, lesson);
            const lessonTasks = taskCountFor(lesson);
            const stateLabel = state === "completed" ? t.completedLabel : state === "in-progress" ? t.inProgressLabel : t.notStartedLabel;
            return <article className="course-lesson-card" data-state={state} key={lesson.slug}>
              <span className="lesson-state-icon">{state === "completed" ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}</span>
              <div><span>{lesson.number}</span><h4>{lesson.title[locale]}</h4><p>{state === "not-started" ? t.ready : `${completedTasks}/${lessonTasks} ${t.learningProgress}`}</p></div>
              <span className="lesson-status-badge" data-state={state}>{stateLabel}</span>
              <Link href={`/${locale}/learn/${lesson.slug}`} className="lesson-open" aria-label={`${state === "in-progress" ? t.resume : t.start}: ${lesson.title[locale]}`}><ArrowRight className="flip-rtl" size={17} /></Link>
            </article>;
          })}</div></div>
        </section>;
      })}</div>
    </section>

    <section className="dashboard-support-grid">
      <article id="quiz-results" className="dashboard-surface compact-info-card"><div className="card-heading"><h2>{t.quizResults}</h2><BarChart3 size={20} /></div>{quizResults.length ? <div className="quiz-summary-grid"><div><strong>{quizResults[0].score}/{quizResults[0].lesson.quiz.length}</strong><span>{t.latestScore}</span></div><div><strong>{quizAverage}%</strong><span>{t.quizAverage}</span></div><div><strong>{quizResults.length}</strong><span>{t.quizzesCompleted}</span></div></div> : <EmptyCard icon={<BarChart3 size={25} />} text={t.noQuiz} />}</article>
      <article id="mistakes" className="dashboard-surface compact-info-card"><div className="card-heading"><h2>{t.mistakes}</h2><CircleAlert size={20} /></div>{reviews.length ? <div className="mistake-summary"><strong>{mistakeCount}</strong><p>{t.questionsNeedReview}</p><Link className="button ghost small" href={`/${locale}/learn/${reviews[0].lesson.slug}#quiz`}>{t.review}<ArrowRight className="flip-rtl" size={15} /></Link></div> : <EmptyCard icon={<CheckCircle2 size={25} />} text={t.noMistakes} />}</article>
      <article id="classes" className="dashboard-surface compact-info-card"><div className="card-heading"><h2>{t.myClass}</h2><UsersRound size={20} /></div>{classSummary ? <div className="class-summary"><strong>{classSummary.title}</strong>{classSummary.teacherName && <p><span>{t.teacher}</span>{classSummary.teacherName}</p>}<span className="empty-inline"><CheckCircle2 size={15} />{t.connected}</span></div> : <><p>{t.classesText}</p><Link className="text-action" href={`/${locale}/join`}>{t.joinClass}<ArrowRight className="flip-rtl" size={15} /></Link></>}</article>
      <article id="announcements" className="dashboard-surface compact-info-card"><div className="card-heading"><h2>{t.announcements}</h2><Megaphone size={20} /></div>{announcement ? <div className="announcement-preview"><strong>{localized(announcement.title, locale)}</strong><p>{localized(announcement.body, locale)}</p><time dateTime={announcement.publishedAt}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en", { dateStyle: "medium" }).format(new Date(announcement.publishedAt))}</time></div> : classSummary ? <EmptyCard icon={<Megaphone size={25} />} text={t.noAnnouncements} /> : <><p>{t.announcementsText}</p><span className="empty-inline"><LockKeyhole size={15} />{t.waitingForClass}</span></>}</article>
    </section>

    <GlobalContentPanels locale={locale} role="student" />
  </main>;
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="dashboard-empty">{icon}<p>{text}</p></div>;
}
