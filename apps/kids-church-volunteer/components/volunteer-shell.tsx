"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, DoorOpen, LifeBuoy, LogOut, QrCode, UserRound, WifiOff, type LucideIcon } from "lucide-react";
import { BrandMark, Button, CreatorCredit, requestSupportReport } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";
import { VolunteerOperationsProvider, useVolunteerOperations } from "./volunteer-context";

const navigation: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/check-in/", label: "Check-in", icon: QrCode },
  { href: "/attendance/", label: "Attendance", icon: ClipboardCheck },
  { href: "/rooms/", label: "Rooms", icon: DoorOpen },
  { href: "/account/", label: "More", icon: UserRound }
];

export function VolunteerShell({ children }: { children: ReactNode }) {
  const { state, member } = useAuthAccess();
  const router = useRouter();
  useEffect(() => {
    if (state === "SIGNED_OUT") router.replace("/sign-in/");
    else if (state !== "ACTIVE" && state !== "LOADING") router.replace("/access/");
  }, [state, router]);
  if (state !== "ACTIVE" || !member) {
    return <main className="loading"><div className="spinner" />Checking Sunday-team access…</main>;
  }
  return <VolunteerOperationsProvider><ShellFrame>{children}</ShellFrame></VolunteerOperationsProvider>;
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { member, signOutUser } = useAuthAccess();
  const { sessionContext, online } = useVolunteerOperations();
  return <div className="volunteer-app">
    <header className="station-header"><BrandMark /><div className="station-state"><strong>{sessionContext?.session.scheduleName || "No service selected"}</strong><span className={online ? "online" : "offline"}>{online ? "Connected" : <><WifiOff size={14} /> Offline</>}</span></div></header>
    <main className="station-content">{children}{pathname.startsWith("/account/") && <div className="more-utilities"><button className="more-support-entry card" type="button" onClick={() => requestSupportReport()}><LifeBuoy /><span><strong>Help & support</strong><small>Report a problem or contact KidsChurchLog Support</small></span><span aria-hidden="true">›</span></button><CreatorCredit /></div>}</main>
    <nav className="bottom-nav" aria-label="Sunday Team navigation">{navigation.map((item) => { const Icon = item.icon; const active = pathname.startsWith(item.href); return <Link key={item.href} className={active ? "active" : ""} href={item.href}><Icon size={23} /><span>{item.label}</span></Link>; })}</nav>
    <div className="desktop-account"><span className="avatar">{member?.displayName.charAt(0) || "V"}</span><span><strong>{member?.displayName}</strong><small>Kids Church Volunteer</small></span><Button variant="ghost" aria-label="Sign out" onClick={() => void signOutUser()}><LogOut size={18} /></Button></div>
  </div>;
}
