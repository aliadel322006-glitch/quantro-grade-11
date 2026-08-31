import { ArrowRight, BookOpen, BookOpenCheck, CheckCircle2, ChevronRight, ClipboardCheck, Code2, FileQuestion, GraduationCap, Languages, LayoutDashboard, LockKeyhole, Menu, MonitorSmartphone, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { ThemePreferenceControl } from "@/components/theme-preference";
import { grade11ProgrammingCourse } from "@/content/course-catalog";
import type { AuthContext } from "@/lib/auth/server";
import { alternateLocale, type AppLocale } from "@/lib/i18n";

type LandingProps = { locale: AppLocale; session?: AuthContext | null };

const copy = {
  en: {
    home: "Home", about: "About", curriculum: "Curriculum", howItWorks: "How it works", studentLogin: "Student Login", teacherLogin: "Teacher Login", createAccount: "Create Student Account", dashboard: "Student Dashboard", teacherDashboard: "Teacher Dashboard", accessRequired: "Unlock Curriculum",
    badge: "Egyptian Baccalaureate · Grade 11", heroTitleStart: "Learn smarter.", heroTitleAccent: "Understand deeper.", heroBody: "Quantro AI helps Grade 11 students understand Programming and Artificial Intelligence through interactive lessons, activities, quizzes, revision tools, and teacher-guided learning.", startLearning: "Start Learning", exploreCurriculum: "Explore Curriculum", privateAccess: "Private learning access managed by your teacher.",
    ecosystemTitle: "One focused learning ecosystem", ecosystemBody: "A clear path through the Grade 11 curriculum, designed around understanding, practice, and meaningful feedback.", interactive: "Interactive Learning", interactiveBody: "Build understanding through clear explanations, original visual examples, and guided activities.", progress: "Smart Progress", progressBody: "See lesson completion, quiz outcomes, and curriculum progress in one focused dashboard.", practice: "Practice & Quizzes", practiceBody: "Check your understanding with practice questions, quizzes, feedback, and mistake review.", teacherConnected: "Teacher-Connected Learning", teacherConnectedBody: "Teachers can follow progress, share study materials, post announcements, and spot areas that need review.",
    accessKicker: "Private access, one clear path", accessTitle: "Your teacher. Your class. Your progress.", accessBody: "Quantro AI is a private learning platform. Your teacher provides the secure code that activates your student account and connects you with your class.", accessAction: "I Have an Access Code", stepOne: "Receive access code", stepTwo: "Create student account", stepThree: "Join your class", stepFour: "Start learning",
    curriculumKicker: "Public curriculum overview", curriculumTitle: "Programming & Artificial Intelligence — Grade 11", curriculumBody: "Four connected Units support the Egyptian Baccalaureate curriculum. Lesson details, activities, and assessments remain private to authorised learners.", lessons: "lessons", accessCurriculum: "Access the Curriculum",
    teacherKicker: "A connected classroom", teacherTitle: "Built for teachers too", teacherBody: "Keep the learning journey visible without adding administrative clutter.", teacherBenefits: ["Track each student’s curriculum progress", "Review quiz results and areas needing attention", "Share PDF, PPT, and PPTX study materials", "Post class announcements and manage secure access codes"],
    finalTitle: "Ready to start learning?", finalBody: "Use the secure path set up by your teacher, then continue from the same curriculum on every supported device.", footerTagline: "Programming & Artificial Intelligence · Egyptian Baccalaureate — Grade 11", footerCurriculum: "Curriculum overview", footerStudent: "Student Login", footerTeacher: "Teacher Login", footerLanguage: "العربية", menu: "Open public navigation", visualLesson: "Interactive lesson", visualProgress: "Progress at a glance", visualQuiz: "Practice & quizzes", currentUnit: "Current Unit", reviewReady: "Review ready", learningPath: "A clear learning path",
  },
  ar: {
    home: "الرئيسية", about: "عن المنصة", curriculum: "المنهج", howItWorks: "كيف تعمل", studentLogin: "دخول الطالب", teacherLogin: "دخول المعلّم", createAccount: "إنشاء حساب طالب", dashboard: "لوحة الطالب", teacherDashboard: "لوحة المعلّم", accessRequired: "فتح المنهج",
    badge: "البكالوريا المصرية · الصف الحادي عشر", heroTitleStart: "تعلّم بذكاء.", heroTitleAccent: "افهم بعمق.", heroBody: "تساعد Quantro AI طلاب الصف الحادي عشر على فهم البرمجة والذكاء الاصطناعي عبر دروس تفاعلية وأنشطة واختبارات وأدوات مراجعة وتعلّم موجّه من المعلّم.", startLearning: "ابدأ التعلّم", exploreCurriculum: "استكشف المنهج", privateAccess: "وصول تعليمي خاص يديره معلّمك.",
    ecosystemTitle: "منظومة تعلّم واحدة وواضحة", ecosystemBody: "مسار واضح عبر منهج الصف الحادي عشر، مبني على الفهم والتدريب والتغذية الراجعة الهادفة.", interactive: "تعلّم تفاعلي", interactiveBody: "ابنِ فهمك من خلال شروح واضحة وأمثلة بصرية أصلية وأنشطة موجّهة.", progress: "متابعة ذكية للتقدم", progressBody: "تابع إكمال الدروس ونتائج الاختبارات وتقدم المنهج من لوحة واحدة مركّزة.", practice: "تدريبات واختبارات", practiceBody: "تحقق من فهمك عبر أسئلة تدريبية واختبارات وتغذية راجعة ومراجعة الأخطاء.", teacherConnected: "تعلّم متصل بالمعلّم", teacherConnectedBody: "يتابع المعلّمون التقدم ويشاركون مواد المذاكرة وينشرون الإعلانات ويحددون ما يحتاج إلى مراجعة.",
    accessKicker: "وصول خاص ومسار واضح", accessTitle: "معلّمك. فصلك. تقدّمك.", accessBody: "Quantro AI منصة تعلم خاصة. يمنحك معلّمك كود الدخول الآمن الذي يفعّل حسابك ويربطك بفصلك.", accessAction: "لدي كود دخول", stepOne: "استلم كود الدخول", stepTwo: "أنشئ حساب الطالب", stepThree: "انضم إلى فصلك", stepFour: "ابدأ التعلّم",
    curriculumKicker: "نظرة عامة عامة للمنهج", curriculumTitle: "البرمجة والذكاء الاصطناعي — الصف الحادي عشر", curriculumBody: "تدعم أربع وحدات مترابطة منهج البكالوريا المصرية. تبقى تفاصيل الدروس والأنشطة والتقييمات خاصة بالطلاب المصرح لهم.", lessons: "دروس", accessCurriculum: "الوصول إلى المنهج",
    teacherKicker: "فصل متصل", teacherTitle: "مصمم للمدرسين أيضًا", teacherBody: "تابع رحلة التعلّم بوضوح دون إضافة عبء إداري غير ضروري.", teacherBenefits: ["تابع تقدم كل طالب في المنهج", "راجع نتائج الاختبارات ونقاط الاحتياج للمراجعة", "شارك مواد مذاكرة بصيغة PDF وPPT وPPTX", "انشر إعلانات الفصل وأدر أكواد الدخول الآمنة"],
    finalTitle: "هل أنت مستعد لبدء التعلّم؟", finalBody: "استخدم المسار الآمن الذي أعده معلّمك، ثم أكمل المنهج نفسه من أي جهاز مدعوم.", footerTagline: "البرمجة والذكاء الاصطناعي · البكالوريا المصرية — الصف الحادي عشر", footerCurriculum: "نظرة عامة للمنهج", footerStudent: "دخول الطالب", footerTeacher: "دخول المعلّم", footerLanguage: "English", menu: "فتح تنقل الموقع", visualLesson: "درس تفاعلي", visualProgress: "لمحة عن التقدم", visualQuiz: "تدريبات واختبارات", currentUnit: "الوحدة الحالية", reviewReady: "جاهز للمراجعة", learningPath: "مسار تعلم واضح",
  },
} as const;

function dashboardDestination(locale: AppLocale, session: AuthContext | null | undefined) {
  if (session?.role === "teacher" || session?.role === "admin") return { href: `/${locale}/teacher`, label: copy[locale].teacherDashboard };
  if (session?.role === "student") return session.curriculumAccess
    ? { href: `/${locale}/dashboard`, label: copy[locale].dashboard }
    : { href: `/${locale}/access-required`, label: copy[locale].accessRequired };
  return { href: `/${locale}/auth/student/login`, label: copy[locale].startLearning };
}

export function LandingPage({ locale, session = null }: LandingProps) {
  const t = copy[locale];
  const destination = dashboardDestination(locale, session);
  const otherLocale = alternateLocale(locale);
  const curriculumHref = session?.role === "student" && session.curriculumAccess
    ? `/${locale}/dashboard#curriculum-browser`
    : session?.role === "teacher" || session?.role === "admin"
      ? `/${locale}/teacher`
      : `/${locale}/auth/student/login`;

  return <main id="main-content" className="public-landing" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
    <PublicNavbar locale={locale} session={session} destination={destination} otherLocale={otherLocale} />
    <div className="public-page">
      <HeroSection locale={locale} destination={destination} curriculumHref={curriculumHref} />
      <FeatureGrid locale={locale} />
      <AccessCodeSection locale={locale} />
      <CurriculumPreview locale={locale} curriculumHref={curriculumHref} />
      <TeacherSection locale={locale} />
      <FinalCta locale={locale} destination={destination} />
    </div>
    <PublicFooter locale={locale} otherLocale={otherLocale} />
  </main>;
}

function PublicNavbar({ locale, session, destination, otherLocale }: { locale: AppLocale; session: AuthContext | null; destination: { href: string; label: string }; otherLocale: AppLocale }) {
  const t = copy[locale];
  const destinationIsTeacher = session?.role === "teacher" || session?.role === "admin";
  return <header className="public-nav-shell">
    <nav className="public-nav public-container" aria-label={locale === "ar" ? "تنقل الموقع" : "Public navigation"}>
      <Link className="public-brand" href={`/${locale}`} aria-label="Quantro AI home"><span className="public-brand-mark"><GraduationCap size={23} /></span><span><strong>Quantro AI</strong><small>{locale === "ar" ? "تعلّم. افهم. أنجز." : "Learn. Understand. Achieve."}</small></span></Link>
      <div className="public-nav-links"><Link href={`/${locale}`}>{t.home}</Link><a href="#about">{t.about}</a><a href="#curriculum">{t.curriculum}</a><a href="#how-it-works">{t.howItWorks}</a></div>
      <div className="public-nav-actions"><ThemePreferenceControl locale={locale} compact /><Link className="public-language" href={`/${otherLocale}`}><Languages size={16} />{t.footerLanguage}</Link>{!session && <Link className="public-text-link" href={`/${locale}/auth/teacher/login`}>{t.teacherLogin}</Link>}<Link className="public-button public-button-small" href={destinationIsTeacher ? destination.href : `/${locale}/auth/student/login`}>{destinationIsTeacher ? destination.label : session?.role === "student" ? destination.label : t.studentLogin}</Link></div>
      <details className="public-mobile-menu"><summary aria-label={t.menu}><Menu size={20} /><span className="sr-only">{t.menu}</span></summary><div className="public-mobile-panel"><Link href={`/${locale}`}>{t.home}</Link><a href="#about">{t.about}</a><a href="#curriculum">{t.curriculum}</a><a href="#how-it-works">{t.howItWorks}</a><ThemePreferenceControl locale={locale} compact /><Link href={`/${otherLocale}`}><Languages size={16} />{t.footerLanguage}</Link>{!session && <Link href={`/${locale}/auth/teacher/login`}>{t.teacherLogin}</Link>}<Link className="public-button" href={destination.href}>{destination.label}</Link></div></details>
    </nav>
  </header>;
}

function HeroSection({ locale, destination, curriculumHref }: { locale: AppLocale; destination: { href: string; label: string }; curriculumHref: string }) {
  const t = copy[locale];
  return <section className="public-hero" aria-labelledby="landing-title"><div className="public-hero-copy"><span className="public-pill"><i aria-hidden="true" />{t.badge}</span><h1 id="landing-title">{t.heroTitleStart} <span>{t.heroTitleAccent}</span></h1><p>{t.heroBody}</p><div className="public-hero-actions"><Link className="public-button" href={destination.href}>{destination.label}<ArrowRight className="flip-rtl" size={18} /></Link><a className="public-button public-button-secondary" href="#curriculum">{t.exploreCurriculum}<ArrowRight className="flip-rtl" size={17} /></a></div><p className="public-private-note"><LockKeyhole size={16} />{t.privateAccess}</p></div><ProductPreview locale={locale} curriculumHref={curriculumHref} /></section>;
}

function ProductPreview({ locale, curriculumHref }: { locale: AppLocale; curriculumHref: string }) {
  const t = copy[locale];
  return <div className="public-product-preview"><div className="public-preview-glow" aria-hidden="true" /><div className="public-preview-window" role="img" aria-label={locale === "ar" ? "معاينة لواجهة Quantro AI التعليمية" : "Preview of the Quantro AI learning interface"}><div className="public-preview-top"><span><i /><i /><i /></span><strong>Quantro AI</strong><span className="public-preview-avatar">A</span></div><div className="public-preview-body"><aside><span className="is-active"><LayoutDashboard size={15} /></span><span><BookOpen size={15} /></span><span><ClipboardCheck size={15} /></span><span><UsersRound size={15} /></span></aside><div className="public-preview-content"><span className="public-preview-kicker">{t.currentUnit}</span><strong>{locale === "ar" ? "تكنولوجيا المعلومات والذكاء الاصطناعي" : "IT and Artificial Intelligence"}</strong><div className="public-preview-progress"><i /><span>{t.visualProgress}</span></div><div className="public-preview-tiles"><span><BookOpenCheck size={17} />{t.visualLesson}</span><span><FileQuestion size={17} />{t.visualQuiz}</span></div></div></div></div><div className="public-float-card public-float-complete"><span><CheckCircle2 size={22} /></span><div><strong>{t.learningPath}</strong><small>{t.reviewReady}</small></div></div><Link className="public-float-card public-float-action" href={curriculumHref}><span><Sparkles size={20} /></span><div><strong>{t.visualProgress}</strong><small>{t.curriculum}</small></div><ChevronRight className="flip-rtl" size={17} /></Link></div>;
}

function FeatureGrid({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  return <section id="about" className="public-section public-features" aria-labelledby="feature-title"><div className="public-section-heading"><span>{t.learningPath}</span><h2 id="feature-title">{t.ecosystemTitle}</h2><p>{t.ecosystemBody}</p></div><div className="public-bento-grid"><article className="public-feature-card is-large"><span className="public-feature-icon"><BookOpen size={27} /></span><h3>{t.interactive}</h3><p>{t.interactiveBody}</p><div className="public-lesson-snapshot" aria-hidden="true"><span /><span /><span /><div><i /><i /><i /></div></div></article><article className="public-feature-card"><span className="public-feature-icon is-gold"><LayoutDashboard size={25} /></span><h3>{t.progress}</h3><p>{t.progressBody}</p><div className="public-mini-progress" aria-hidden="true"><span><i /></span><div><small>{t.currentUnit}</small><b>{t.visualProgress}</b></div></div></article><article className="public-feature-card"><span className="public-feature-icon is-teal"><ClipboardCheck size={25} /></span><h3>{t.practice}</h3><p>{t.practiceBody}</p><div className="public-answer-row" aria-hidden="true"><i /><i className="is-selected" /><i /><i /></div></article><article className="public-feature-card is-wide"><div><span className="public-feature-icon is-coral"><UsersRound size={25} /></span><h3>{t.teacherConnected}</h3><p>{t.teacherConnectedBody}</p></div><div className="public-connected-visual" aria-hidden="true"><span><GraduationCap size={18} /></span><i /><span><MonitorSmartphone size={19} /></span><i /><span><BookOpen size={18} /></span></div></article></div></section>;
}

function AccessCodeSection({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  const steps = [t.stepOne, t.stepTwo, t.stepThree, t.stepFour];
  return <section id="how-it-works" className="public-access-section"><div className="public-access-copy"><span className="public-kicker">{t.accessKicker}</span><h2>{t.accessTitle}</h2><p>{t.accessBody}</p><Link className="public-button" href={`/${locale}/auth/student/register`}>{t.accessAction}<ArrowRight className="flip-rtl" size={18} /></Link></div><ol className="public-access-flow">{steps.map((step, index) => <li key={step}><span>{index + 1}</span><strong>{step}</strong>{index < steps.length - 1 && <i aria-hidden="true" />}</li>)}</ol></section>;
}

function CurriculumPreview({ locale, curriculumHref }: { locale: AppLocale; curriculumHref: string }) {
  const t = copy[locale];
  const icons = [BookOpen, ShieldCheck, Code2, LayoutDashboard] as const;
  return <section id="curriculum" className="public-section public-curriculum-section" aria-labelledby="public-curriculum-title"><div className="public-section-heading public-section-heading-split"><div><span>{t.curriculumKicker}</span><h2 id="public-curriculum-title">{t.curriculumTitle}</h2><p>{t.curriculumBody}</p></div><Link className="public-button public-button-secondary" href={curriculumHref}>{t.accessCurriculum}<ArrowRight className="flip-rtl" size={17} /></Link></div><div className="public-unit-grid">{grade11ProgrammingCourse.units.map((unit, index) => { const Icon = icons[index]; return <article className="public-unit-card" key={unit.id} data-unit={unit.sequence}><span><Icon size={22} /></span><small>{locale === "ar" ? `الوحدة ${unit.sequence}` : `Unit ${unit.sequence}`}</small><h3>{unit.title[locale]}</h3><p>{unit.summary[locale]}</p><footer>{unit.lessonCount} {t.lessons}<ArrowRight className="flip-rtl" size={16} /></footer></article>; })}</div></section>;
}

function TeacherSection({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  return <section className="public-teacher-section" aria-labelledby="teacher-section-title"><div className="public-teacher-visual" aria-hidden="true"><div className="teacher-visual-head"><span><UsersRound size={20} /></span><strong>Quantro AI</strong></div><div className="teacher-stat-row"><span><b>24</b><small>{locale === "ar" ? "طلاب" : "Students"}</small></span><span><b>72%</b><small>{t.visualProgress}</small></span><span><b>8</b><small>{t.reviewReady}</small></span></div><div className="teacher-progress-lines"><i /><i /><i /></div></div><div><span className="public-kicker">{t.teacherKicker}</span><h2 id="teacher-section-title">{t.teacherTitle}</h2><p>{t.teacherBody}</p><ul>{t.teacherBenefits.map((benefit) => <li key={benefit}><CheckCircle2 size={18} />{benefit}</li>)}</ul><Link className="public-button public-button-secondary" href={`/${locale}/auth/teacher/login`}>{t.teacherLogin}<ArrowRight className="flip-rtl" size={17} /></Link></div></section>;
}

function FinalCta({ locale, destination }: { locale: AppLocale; destination: { href: string; label: string } }) {
  const t = copy[locale];
  return <section className="public-final-cta"><div><span className="public-kicker">Quantro AI</span><h2>{t.finalTitle}</h2><p>{t.finalBody}</p></div><div className="public-final-actions"><Link className="public-button" href={`/${locale}/auth/student/register`}>{t.accessAction}<ArrowRight className="flip-rtl" size={17} /></Link><Link className="public-button public-button-secondary" href={destination.href}>{destination.label}</Link></div></section>;
}

function PublicFooter({ locale, otherLocale }: { locale: AppLocale; otherLocale: AppLocale }) {
  const t = copy[locale];
  return <footer className="public-footer"><div className="public-container public-footer-inner"><div><Link className="public-brand" href={`/${locale}`}><span className="public-brand-mark"><GraduationCap size={21} /></span><span><strong>Quantro AI</strong><small>{t.footerTagline}</small></span></Link><p>© 2026 Quantro AI · {locale === "ar" ? "نسخة تجريبية تعليمية" : "Educational pilot"}</p></div><nav aria-label={locale === "ar" ? "روابط التذييل" : "Footer links"}><Link href={`/${locale}`}>{t.home}</Link><a href="#curriculum">{t.footerCurriculum}</a><Link href={`/${locale}/auth/student/login`}>{t.footerStudent}</Link><Link href={`/${locale}/auth/teacher/login`}>{t.footerTeacher}</Link><Link href={`/${otherLocale}`}><Languages size={15} />{t.footerLanguage}</Link></nav></div></footer>;
}
