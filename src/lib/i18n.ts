export const locales = ["en", "ar"] as const;
export type AppLocale = (typeof locales)[number];

export function isLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function alternateLocale(locale: AppLocale): AppLocale {
  return locale === "en" ? "ar" : "en";
}

const dictionaries = {
  en: {
    brand: "Quantro AI",
    subtitle: "Grade 11 · Programming & AI",
    learn: "Student dashboard",
    teacher: "Teacher dashboard",
    admin: "Lesson management",
    continue: "Continue learning",
    unit: "Unit 1 · Information technology & society",
    welcome: "Learn clearly. Think critically.",
    welcomeBody:
      "An interactive learning platform for Grade 11 Programming and Artificial Intelligence: lessons, practice, quizzes, and revision.",
    journey: "My curriculum",
    progress: "Curriculum progress",
    join: "Class connection",
    offlineReady: "Offline-ready lessons",
    teacherView: "Open teacher dashboard",
    objectives: "Learning objectives",
    concepts: "Key concepts",
    back: "Back to unit",
    next: "Next",
    previous: "Previous",
    complete: "Complete step",
    step: "Step",
    of: "of",
    menu: "Open navigation",
    close: "Close navigation",
    language: "العربية",
    install: "Install app",
    online: "Online",
    offline: "Offline — your work will sync later",
  },
  ar: {
    brand: "Quantro AI",
    subtitle: "البرمجة والذكاء الاصطناعي",
    learn: "تعلّم",
    teacher: "المعلّم",
    admin: "استوديو المحتوى",
    continue: "تابع التعلّم",
    unit: "الوحدة الأولى · تكنولوجيا المعلومات والمجتمع",
    welcome: "ابنِ المستقبل، وناقشه أيضًا.",
    welcomeBody:
      "أربع مهمات تفاعلية تربط تاريخ التكنولوجيا بطريقة تعلّم الذكاء الاصطناعي واستخداماته وكيف يحافظ الإنسان على عدالته.",
    journey: "منهجي",
    progress: "تقدّم المنهج",
    join: "اتصال الفصل",
    offlineReady: "دروس تعمل دون اتصال",
    teacherView: "افتح لوحة المعلّم",
    objectives: "أهداف التعلّم",
    concepts: "المفاهيم الأساسية",
    back: "العودة إلى الوحدة",
    next: "التالي",
    previous: "السابق",
    complete: "أكمل الخطوة",
    step: "الخطوة",
    of: "من",
    menu: "افتح قائمة التنقل",
    close: "أغلق قائمة التنقل",
    language: "English",
    install: "ثبّت التطبيق",
    online: "متصل",
    offline: "غير متصل — ستتم مزامنة عملك لاحقًا",
  },
} as const;

export function getDictionary(locale: AppLocale) {
  return dictionaries[locale];
}
