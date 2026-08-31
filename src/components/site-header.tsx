"use client";

import { Bell, BookOpen, ChevronDown, FileQuestion, FolderOpen, KeyRound, Languages, LayoutDashboard, ListChecks, LogOut, Megaphone, Menu, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, RotateCcw, Settings, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemePreferenceControl } from "@/components/theme-preference";
import type { AuthContext } from "@/lib/auth/server";
import { alternateLocale, type AppLocale } from "@/lib/i18n";
import { purgeOfflineLearnerData } from "@/lib/offline";

function localePath(pathname: string, locale: AppLocale) {
  const parts = pathname.split("/");
  if (parts[1] === "en" || parts[1] === "ar") parts[1] = locale;
  return parts.join("/") || `/${locale}`;
}

function pageLabel(pathname: string, locale: AppLocale) {
  if (pathname.includes("/learn/")) return locale === "ar" ? "الدرس" : "Lesson";
  if (pathname.includes("/teacher")) return locale === "ar" ? "لوحة المعلّم" : "Teacher dashboard";
  if (pathname.includes("/admin")) return locale === "ar" ? "إدارة المحتوى" : "Content management";
  if (pathname.includes("/auth/")) return locale === "ar" ? "الحساب" : "Account";
  return locale === "ar" ? "لوحة الطالب" : "Student dashboard";
}

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; current?: (pathname: string) => boolean };

export function SiteHeader({ locale, session }: { locale: AppLocale; session: AuthContext | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const other = alternateLocale(locale);
  const isAuthPage = pathname.includes("/auth/") || pathname.includes("/access-required");
  const isPublicLanding = pathname === `/${locale}`;
  const isStudent = session?.role === "student";
  const isStaff = session?.role === "teacher" || session?.role === "admin";
  const studentLinks: NavItem[] = [
    { href: `/${locale}/dashboard`, label: locale === "ar" ? "لوحة الطالب" : "Dashboard", icon: LayoutDashboard, current: (path) => path === `/${locale}/dashboard` },
    { href: `/${locale}/dashboard#curriculum-progress`, label: locale === "ar" ? "منهجي" : "My Curriculum", icon: BookOpen, current: (path) => path.includes("/learn/") },
    { href: `/${locale}/dashboard#classes`, label: locale === "ar" ? "فصلي" : "My Class", icon: UsersRound },
    { href: `/${locale}/dashboard#quiz-results`, label: locale === "ar" ? "نتائج الاختبارات" : "Quiz Results", icon: ListChecks },
    { href: `/${locale}/dashboard#mistakes`, label: locale === "ar" ? "أخطائي" : "My Mistakes", icon: RotateCcw },
    { href: `/${locale}/dashboard#exams`, label: locale === "ar" ? "الاختبارات" : "Exams", icon: FileQuestion },
    { href: `/${locale}/dashboard#resources`, label: locale === "ar" ? "مواد المذاكرة" : "Study Materials", icon: FolderOpen },
    { href: `/${locale}/dashboard#announcements`, label: locale === "ar" ? "الإعلانات" : "Announcements", icon: Megaphone },
    { href: `/${locale}/dashboard#settings`, label: locale === "ar" ? "الإعدادات" : "Settings", icon: Settings },
  ];
  const staffLinks: NavItem[] = [
    { href: `/${locale}/teacher`, label: locale === "ar" ? "لوحة المعلّم" : "Teacher dashboard", icon: LayoutDashboard },
    { href: `/${locale}/teacher#access-codes`, label: locale === "ar" ? "أكواد الدخول" : "Access codes", icon: KeyRound },
    { href: `/${locale}/teacher#resources`, label: locale === "ar" ? "المواد المشتركة" : "Shared materials", icon: FolderOpen },
    { href: `/${locale}/teacher#exams`, label: locale === "ar" ? "الاختبارات" : "Exams", icon: FileQuestion },
  ];
  const links: NavItem[] = isStudent ? studentLinks : session?.role === "admin" ? [
    { href: `/${locale}/admin`, label: locale === "ar" ? "إدارة المنصة" : "Administration", icon: LayoutDashboard, current: (path) => path === `/${locale}/admin` },
    { href: `/${locale}/admin#teachers`, label: locale === "ar" ? "المعلّمون" : "Teachers", icon: UsersRound },
    { href: `/${locale}/admin#content-management`, label: locale === "ar" ? "إدارة المحتوى" : "Content management", icon: BookOpen },
    { href: `/${locale}/admin/security`, label: locale === "ar" ? "الأمان" : "Security", icon: ShieldCheck },
  ] : isStaff ? staffLinks : [];
  const active = (item: NavItem) => item.current ? item.current(pathname) : pathname === item.href;
  const sidebarToggleLabel = collapsed
    ? (locale === "ar" ? "توسيع الشريط الجانبي" : "Expand sidebar")
    : (locale === "ar" ? "طي الشريط الجانبي" : "Collapse sidebar");
  const SidebarToggleIcon = locale === "ar"
    ? (collapsed ? PanelRightOpen : PanelRightClose)
    : (collapsed ? PanelLeftOpen : PanelLeftClose);

  useEffect(() => {
    if (isPublicLanding) return;
    const saved = window.localStorage.getItem("quantro-ai:account-sidebar") === "collapsed";
    setCollapsed(saved);
    document.documentElement.dataset.accountSidebar = saved ? "collapsed" : "expanded";
    return () => { delete document.documentElement.dataset.accountSidebar; };
  }, [isPublicLanding]);

  const saveCollapsed = (next: boolean) => {
    setCollapsed(next);
    window.localStorage.setItem("quantro-ai:account-sidebar", next ? "collapsed" : "expanded");
    document.documentElement.dataset.accountSidebar = next ? "collapsed" : "expanded";
  };

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    await purgeOfflineLearnerData();
    router.push(`/${locale}`);
    router.refresh();
  }

  const minimal = <header className="minimal-header">
    <Link href={`/${locale}`} className="brand"><span className="brand-mark"><BookOpen size={21} /></span><span className="brand-copy"><strong>Quantro AI</strong><small>{locale === "ar" ? "تعلّم. افهم. أنجز." : "Learn. Understand. Achieve."}</small></span></Link>
    <div className="minimal-actions">
      {!isAuthPage && <><Link className="button ghost small" href={`/${locale}/auth/teacher/login`}>{locale === "ar" ? "دخول المعلّم" : "Teacher login"}</Link><Link className="button small" href={`/${locale}/auth/student/login`}>{locale === "ar" ? "دخول الطالب" : "Student login"}</Link></>}
      <Link className="locale-button" href={localePath(pathname, other)}><Languages size={16} />{locale === "ar" ? "English" : "العربية"}</Link>
    </div>
  </header>;

  if (isAuthPage || isPublicLanding) return null;
  if (!session) return minimal;

  return <>
    <header className="site-header" data-collapsed={collapsed}>
      <div className="sidebar-top">
        <Link href={`/${locale}/dashboard`} className="brand"><span className="brand-mark"><BookOpen size={21} /></span><span className="brand-copy"><strong>Quantro AI</strong><small>{locale === "ar" ? "تعلّم. افهم. أنجز." : "Learn. Understand. Achieve."}</small></span></Link>
        <button className="sidebar-collapse icon-button" type="button" onClick={() => saveCollapsed(!collapsed)} aria-label={sidebarToggleLabel} title={sidebarToggleLabel}><SidebarToggleIcon size={18} strokeWidth={2.15} /></button>
      </div>
      <nav className="account-nav" aria-label={locale === "ar" ? "تنقل الحساب" : "Account navigation"}>
        {links.map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.href} className="account-nav-link" data-active={active(item)} title={collapsed ? item.label : undefined}><Icon size={18} /><span>{item.label}</span></Link>; })}
      </nav>
      <div className="sidebar-bottom">
        <ThemePreferenceControl locale={locale} compact />
        <Link className="locale-row" href={localePath(pathname, other)} title={collapsed ? (locale === "ar" ? "English" : "العربية") : undefined}><Languages size={17} /><span>{locale === "ar" ? "English" : "العربية"}</span></Link>
        <ProfileMenu locale={locale} session={session} open={profileOpen} onToggle={() => setProfileOpen((open) => !open)} onLogout={logout} />
      </div>
    </header>
    <div className="workspace-topbar">
      <button className="mobile-menu-button" type="button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-label={locale === "ar" ? "فتح التنقل" : "Open navigation"}>{mobileOpen ? <X /> : <Menu />}</button>
      <div className="topbar-title"><span>{pageLabel(pathname, locale)}</span>{pathname.includes("/learn/") && <small>{locale === "ar" ? "المنهج · البرمجة والذكاء الاصطناعي — الصف الحادي عشر" : "Curriculum · Programming & Artificial Intelligence — Grade 11"}</small>}</div>
      <div className="topbar-actions"><Link className="icon-button" href={isStudent ? `/${locale}/dashboard#announcements` : `/${locale}/teacher#announcements`} aria-label={locale === "ar" ? "الإعلانات" : "Announcements"}><Bell size={18} /></Link><button className="topbar-avatar" type="button" onClick={() => setProfileOpen((open) => !open)} aria-label={locale === "ar" ? "قائمة الملف الشخصي" : "Profile menu"}><span className="avatar">{session.displayName.slice(0, 1).toUpperCase()}</span><ChevronDown size={15} /></button></div>
    </div>
    <nav className="mobile-account-drawer" data-open={mobileOpen} aria-label={locale === "ar" ? "تنقل الهاتف" : "Mobile navigation"}>
      {links.map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.href} className="account-nav-link" data-active={active(item)} onClick={() => setMobileOpen(false)}><Icon size={18} /><span>{item.label}</span></Link>; })}
      <div className="mobile-drawer-options"><ThemePreferenceControl locale={locale} compact /><Link className="locale-row" href={localePath(pathname, other)}><Languages size={17} />{locale === "ar" ? "English" : "العربية"}</Link></div>
      <button className="account-nav-link" type="button" onClick={() => void logout()}><LogOut size={18} /><span>{locale === "ar" ? "تسجيل الخروج" : "Logout"}</span></button>
    </nav>
  </>;
}

function ProfileMenu({ locale, session, open, onToggle, onLogout }: { locale: AppLocale; session: AuthContext; open: boolean; onToggle: () => void; onLogout: () => Promise<void> }) {
  const workspaceHref = session.role === "student" ? `/${locale}/dashboard` : session.role === "admin" ? `/${locale}/admin` : `/${locale}/teacher`;
  return <div className="profile-menu">
    <button className="profile-trigger" type="button" onClick={onToggle} aria-expanded={open}><span className="avatar">{session.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{session.displayName}</strong><small>{session.role === "student" ? (locale === "ar" ? "طالب" : "Student") : (locale === "ar" ? "معلّم" : "Teacher")}</small></span><ChevronDown size={16} /></button>
    {open && <div className="profile-popover"><Link href={`${workspaceHref}#profile`}><UserRound size={16} />{locale === "ar" ? "الملف الشخصي" : "Profile"}</Link><Link href={`${workspaceHref}#settings`}><Settings size={16} />{locale === "ar" ? "الإعدادات" : "Settings"}</Link><button type="button" onClick={() => void onLogout()}><LogOut size={16} />{locale === "ar" ? "تسجيل الخروج" : "Logout"}</button></div>}
  </div>;
}
