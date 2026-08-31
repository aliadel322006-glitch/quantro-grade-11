import type { Course } from "@/lib/types";

/** Course metadata drives navigation while lesson versions remain independently versioned. */
export const grade11ProgrammingCourse: Course = {
  id: "grade-11-programming",
  title: { en: "Programming & Artificial Intelligence — Grade 11", ar: "البرمجة والذكاء الاصطناعي — الصف الحادي عشر" },
  units: [
    { id: "unit-1", sequence: 1, title: { en: "IT and Artificial Intelligence", ar: "تكنولوجيا المعلومات والذكاء الاصطناعي" }, summary: { en: "Technology, AI, real-world uses, and responsible choices.", ar: "التكنولوجيا والذكاء الاصطناعي واستخداماته وقراراته المسؤولة." }, status: "available", lessonCount: 4 },
    { id: "unit-2", sequence: 2, title: { en: "Cybersecurity", ar: "الأمن السيبراني" }, summary: { en: "Safe digital habits, threats, and protection strategies.", ar: "عادات رقمية آمنة وتهديدات واستراتيجيات للحماية." }, status: "available", lessonCount: 3 },
    { id: "unit-3", sequence: 3, title: { en: "Web Applications", ar: "تطبيقات الويب" }, summary: { en: "How web systems exchange requests, responses, and information.", ar: "كيف تتبادل أنظمة الويب الطلبات والاستجابات والمعلومات." }, status: "available", lessonCount: 3 },
    { id: "unit-4", sequence: 4, title: { en: "Web and Media Design", ar: "تصميم الويب والوسائط" }, summary: { en: "Purposeful media, interfaces, and improvement cycles.", ar: "وسائط وواجهات هادفة ودورات للتحسين." }, status: "available", lessonCount: 4 },
  ],
};
