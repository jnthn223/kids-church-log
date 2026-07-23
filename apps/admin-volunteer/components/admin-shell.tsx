"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Baby, BadgeCheck, Home, LifeBuoy, LogOut, Menu, UserRound, Users, UserPlus, X, type LucideIcon } from "lucide-react";
import { BrandMark, Button, CreatorCredit, requestSupportReport } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";

const navigation: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/home/", label: "Home", icon: Home }, { href: "/families/", label: "Families", icon: Users },
  { href: "/register/", label: "Register Family", icon: UserPlus }, { href: "/children/", label: "Children", icon: Baby },
  { href: "/passes/", label: "Passes", icon: BadgeCheck }, { href: "/account/", label: "Account", icon: UserRound }
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { state, member, signOutUser } = useAuthAccess(); const router = useRouter(); const pathname = usePathname(); const [open, setOpen] = useState(false);
  useEffect(() => { if (state === "SIGNED_OUT") router.replace("/sign-in/"); else if (state !== "ACTIVE" && state !== "LOADING") router.replace("/access/"); }, [state, router]);
  if (state !== "ACTIVE" || !member) return <main className="loading"><div><div className="spinner" />Checking registration access…</div></main>;
  const page = navigation.find((item) => pathname.startsWith(item.href));
  return <div className="app-frame"><div className={`mobile-scrim ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
    <aside className={`sidebar ${open ? "open" : ""}`}><BrandMark /><p className="app-label">Registration team</p><nav className="nav" aria-label="Admin Volunteer navigation">{navigation.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/home/" && pathname.startsWith(item.href)); return <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}><Icon size={20} />{item.label}</Link>; })}</nav>
      <div className="sidebar-bottom"><button className="sidebar-support" type="button" onClick={() => requestSupportReport()}><LifeBuoy size={18} /> Help & support</button><Link className="identity" href="/account/"><span className="avatar">{member.displayName.charAt(0) || "A"}</span><span><strong>{member.displayName}</strong><small>Admin Volunteer</small></span></Link><CreatorCredit /><Button variant="ghost" onClick={() => { localStorage.removeItem("kcl-admin-registration-draft"); void signOutUser(); }}><LogOut size={17} /> Sign out</Button></div></aside>
    <main className="main"><header className="topbar"><Button className="mobile-menu" variant="ghost" aria-label="Open menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button><div><small>Admin Volunteer</small><h1>{page?.label || "Registration"}</h1></div><span className="privacy-note">Family information stays private</span></header><div className="content">{children}</div></main>
  </div>;
}
