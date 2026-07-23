"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Baby,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileClock,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import { BrandMark, Button, CreatorCredit, requestSupportReport } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { href: "/overview/", label: "Overview", icon: Home },
  { href: "/families/", label: "Families", icon: Users },
  { href: "/children/", label: "Children", icon: Baby },
  { href: "/team/", label: "Team Access", icon: ShieldCheck },
  { href: "/services/", label: "Services", icon: CalendarDays },
  { href: "/groups-rooms/", label: "Groups & Rooms", icon: ClipboardList },
  { href: "/attendance/", label: "Attendance", icon: Activity },
  { href: "/reports/", label: "Reports", icon: BarChart3 },
  { href: "/audit/", label: "Audit", icon: FileClock },
  { href: "/settings/", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const { state, member, signOutUser } = useAuthAccess();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (state === "SIGNED_OUT") {
      router.replace("/sign-in/");
    } else if (state !== "ACTIVE" && state !== "LOADING") {
      router.replace("/access/");
    }
  }, [state, router]);

  if (state !== "ACTIVE" || !member) {
    return (
      <main className="loading">
        <div><div className="spinner" />Checking ministry access…</div>
      </main>
    );
  }

  const initial = (member.displayName || member.email || "M").charAt(0).toUpperCase();
  const currentPage = navigation.find((item) => pathname.startsWith(item.href));

  return (
    <div className="app-frame">
      <div
        className={`mobile-scrim ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <BrandMark />
        <nav className="nav" aria-label="Ministry Lead navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/overview/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={active ? "active" : ""}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={19} />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-support" type="button" onClick={() => requestSupportReport()}><LifeBuoy size={18} /> Help & support</button>
          <Link className="identity" href="/account/" prefetch>
            <span className="avatar">{initial}</span>
            <span><strong>{member.displayName}</strong><small>Ministry Lead</small></span>
          </Link>
          <CreatorCredit />
          <Button variant="ghost" onClick={() => void signOutUser()}>
            <LogOut size={17} /> Sign out
          </Button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <Button
            className="mobile-menu"
            variant="ghost"
            aria-label="Open menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
          <h1>{currentPage?.label || "Ministry Lead"}</h1>
          <span className="status status-success">● Active access</span>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
