"use client";

import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, BookOpen, TrendingUp, Target, LogOut, Bell, Search, Menu, X,
  Users, Upload, Shield, BarChart2, UserCheck, GraduationCap, Activity,
  ChevronRight, Sun, Moon
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import Chatbot from "@/components/Chatbot";
import { useStudentData } from "@/lib/hooks/useStudentData";
import "./chrome.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const role = (session?.user as any)?.role;
  const { student } = useStudentData(session?.user?.email);

  const studentMenu = [
    { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Performance", icon: TrendingUp, href: "/student/performance" },
    { name: "Skills Intelligence", icon: Target, href: "/dashboard/skills" },
    { name: "Curriculum", icon: BookOpen, href: "/dashboard/curriculum" },
  ];

  const facultyMenu = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Class Overview", icon: Users, href: "/dashboard/faculty" },
    { name: "Upload Materials", icon: Upload, href: "/dashboard/faculty/materials" },
    { name: "Skills Intelligence", icon: Target, href: "/dashboard/skills" },
  ];

  const adminMenu = [
    { name: "Overview", icon: LayoutDashboard, href: "/dashboard/admin" },
    { name: "Analytics", icon: BarChart2, href: "/dashboard/admin/analytics" },
    { name: "Retention Reports", icon: TrendingUp, href: "/dashboard/admin/analytics" },
    { name: "Curriculum Align", icon: GraduationCap, href: "/dashboard/admin/curriculum" },
    { name: "Student Allocation", icon: UserCheck, href: "/dashboard/admin/allocation" },
    { name: "User Management", icon: Shield, href: "/dashboard/admin/users" },
    { name: "System Monitoring", icon: Activity, href: "/dashboard/admin/monitoring" },
  ];

  const filteredMenu =
    role === "ADMIN" ? adminMenu :
      role === "FACULTY" ? facultyMenu :
        studentMenu;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="ds-shell">
      {/* ── Sidebar ── */}
      <aside className={`ds-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="ds-sidebar-inner">
          <div className="ds-sidebar-top">
            <Link href="/" className="ds-logo">
              <div className="ds-logo-mark">
                <GraduationCap size={18} />
              </div>
              {sidebarOpen && <span className="ds-logo-text">SkillSync</span>}
            </Link>
            {sidebarOpen && role === "ADMIN" && (
              <span className="ds-role-badge">Admin</span>
            )}
          </div>

          <nav className="ds-nav">
            {sidebarOpen && <span className="ds-nav-label">Navigation</span>}
            {filteredMenu.map((item) => (
              <Link
                key={item.name + item.href}
                href={item.href}
                className={`ds-nav-link ${isActive(item.href) ? "active" : ""}`}
              >
                <item.icon size={18} />
                {sidebarOpen && <span>{item.name}</span>}
                {sidebarOpen && isActive(item.href) && (
                  <ChevronRight size={14} className="ds-nav-arrow" />
                )}
              </Link>
            ))}
          </nav>

          <div className="ds-sidebar-bottom">
            <button onClick={() => signOut()} className="ds-nav-link ds-logout">
              <LogOut size={18} />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ds-main">
        <header className="ds-header">
          <div className="ds-header-left">
            <button className="ds-icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="ds-search">
              <Search size={16} />
              <input type="text" placeholder="Search analytics..." />
            </div>
          </div>

          <div className="ds-header-right">
            <button className="ds-theme-btn" onClick={toggle} title="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="ds-icon-btn">
              <Bell size={18} />
            </button>
            <div className="ds-user">
              <div className="ds-user-avatar">{initials}</div>
              <div className="ds-user-info">
                <span className="ds-user-name">{session?.user?.name}</span>
                <span className="ds-user-role">{role}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="ds-page-content">
          {children}
        </div>
        {role === "STUDENT" && <Chatbot studentContext={student} />}
      </main>
    </div>
  );
}
