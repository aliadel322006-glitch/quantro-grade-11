import { describe, expect, it } from "vitest";
import {
  acceptDemoTeacherInvitation,
  authenticateDemoAccount,
  bootstrapDemoAdmin,
  demoAdminExists,
  inviteDemoTeacher,
  listDemoTeachers,
  setDemoTeacherDisabled,
} from "@/lib/auth/demo";

describe("local administrator and teacher invitation workflow", () => {
  it("creates the first admin once and keeps staff roles server-owned", () => {
    expect(demoAdminExists()).toBe(false);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const admin = bootstrapDemoAdmin({ displayName: "Local Admin", email: `admin-${suffix}@quantro.demo`, password: "SecureAdmin!2026" });
    expect(admin?.role).toBe("admin");
    expect(bootstrapDemoAdmin({ displayName: "Second", email: `second-${suffix}@quantro.demo`, password: "SecureAdmin!2026" })).toBeNull();
    expect(authenticateDemoAccount(`admin-${suffix}@quantro.demo`, "SecureAdmin!2026", "admin")?.role).toBe("admin");
    // The shared staff sign-in accepts an admin but never presents it as a teacher session.
    expect(authenticateDemoAccount(`admin-${suffix}@quantro.demo`, "SecureAdmin!2026", "teacher")?.role).toBe("admin");
  });

  it("keeps an invited teacher inactive until password setup and can revoke access", () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `teacher-${suffix}@quantro.demo`;
    const invited = inviteDemoTeacher({ displayName: "Invited Teacher", email });
    expect(invited).not.toBeNull();
    expect(authenticateDemoAccount(email, "TeacherInvite!2026", "teacher")).toBeNull();
    const active = acceptDemoTeacherInvitation(invited!.invitationToken, "TeacherInvite!2026");
    expect(active?.role).toBe("teacher");
    expect(listDemoTeachers().find((teacher) => teacher.id === active?.id)?.status).toBe("active");
    expect(setDemoTeacherDisabled(active!.id, true)).toBe("disabled");
    expect(authenticateDemoAccount(email, "TeacherInvite!2026", "teacher")).toBeNull();
  });
});
