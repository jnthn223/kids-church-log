"use client";

import type { ComponentType } from "react";
import { AccountScreen } from "./screens/account-screen";
import { AttendanceScreen } from "./screens/attendance-screen";
import { AuditScreen } from "./screens/audit-screen";
import { ChildrenScreen } from "./screens/children-screen";
import { FamiliesScreen } from "./screens/families-screen";
import { GroupsRoomsScreen } from "./screens/groups-rooms-screen";
import { OverviewScreen } from "./screens/overview-screen";
import { ReportsScreen } from "./screens/reports-screen";
import { ServicesScreen } from "./screens/services-screen";
import { SettingsScreen } from "./screens/settings-screen";
import { TeamScreen } from "./screens/team-screen";

type View =
  | "overview"
  | "families"
  | "children"
  | "team"
  | "services"
  | "groups-rooms"
  | "attendance"
  | "reports"
  | "audit"
  | "settings"
  | "account";

const screenConfig: Record<
  View,
  { title: string; description: string; component: ComponentType }
> = {
  overview: {
    title: "Ministry overview",
    description: "Today’s ministry health, access reviews, and service activity.",
    component: OverviewScreen
  },
  families: {
    title: "Family oversight",
    description: "Monitor registered households and handle exceptional concerns.",
    component: FamiliesScreen
  },
  children: {
    title: "Children oversight",
    description: "Find children and review safety information in ministry context.",
    component: ChildrenScreen
  },
  team: {
    title: "Team access",
    description: "Approve, review, renew, and offboard ministry access.",
    component: TeamScreen
  },
  services: {
    title: "Services",
    description: "Configure recurring schedules and monitor dated sessions.",
    component: ServicesScreen
  },
  "groups-rooms": {
    title: "Groups & rooms",
    description: "Keep ministry groupings and physical rooms configurable.",
    component: GroupsRoomsScreen
  },
  attendance: {
    title: "Attendance history",
    description: "Review committed attendance and authorized corrections.",
    component: AttendanceScreen
  },
  reports: {
    title: "Reports",
    description: "Understand ministry participation without turning care into vanity metrics.",
    component: ReportsScreen
  },
  audit: {
    title: "Audit activity",
    description: "Immutable accountability for sensitive ministry actions.",
    component: AuditScreen
  },
  settings: {
    title: "Ministry settings",
    description: "Manage church context and access-governance defaults.",
    component: SettingsScreen
  },
  account: {
    title: "Your account",
    description: "Review your identity, roles, and access term.",
    component: AccountScreen
  }
};

export function MinistryScreen({ view }: { view: View }) {
  const { title, description, component: Screen } = screenConfig[view];

  return (
    <>
      <header className="page-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <Screen />
    </>
  );
}
