"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert, UserCheck } from "lucide-react";
import { Card, EmptyState } from "@kcl/ui";
import { useMinistryCollection } from "@kcl/firebase";
import type {
  AccessRequest,
  Attendance,
  Household,
  MinistryGroup,
  MinistryMember,
  Room,
  ServiceSchedule,
  ServiceSession
} from "@kcl/types";
import { isExpired } from "@kcl/utils";
import { Metric, ScreenLoading } from "./shared";

export function OverviewScreen() {
  const households = useMinistryCollection<Household>("households");
  const members = useMinistryCollection<MinistryMember>("members");
  const requests = useMinistryCollection<AccessRequest>("accessRequests");
  const sessions = useMinistryCollection<ServiceSession>("serviceSessions");
  const attendance = useMinistryCollection<Attendance>("attendance");
  const groups = useMinistryCollection<MinistryGroup>("ministryGroups");
  const rooms = useMinistryCollection<Room>("rooms");
  const schedules = useMinistryCollection<ServiceSchedule>("serviceSchedules");

  const sources = [households, members, requests, sessions, attendance, groups, rooms, schedules];
  const activeLeads = members.data.filter(
    (member) =>
      member.status === "ACTIVE" &&
      !isExpired(member.expiresAt) &&
      member.roles?.includes("MINISTRY_LEAD")
  );
  const pendingRequests = requests.data.filter((request) => request.status === "PENDING");
  const openSessions = sessions.data.filter((session) => session.status === "OPEN");
  const checklist = [
    { label: "Maintain two Ministry Leads", done: activeLeads.length >= 2, href: "/team/" },
    { label: "Approve the first team member", done: members.data.length > 1, href: "/team/" },
    {
      label: "Configure groups and rooms",
      done: groups.data.some((group) => group.active) && rooms.data.some((room) => room.active),
      href: "/groups-rooms/"
    },
    {
      label: "Create a service schedule",
      done: schedules.data.some((schedule) => schedule.active),
      href: "/services/"
    }
  ];

  if (sources.some((source) => source.loading)) return <ScreenLoading />;

  return (
    <>
      {activeLeads.length < 2 && (
        <Card className="critical">
          <ShieldAlert />
          <div>
            <h3>Leadership continuity needs attention</h3>
            <p>
              Only {activeLeads.length} active, unexpired Ministry Lead
              {activeLeads.length === 1 ? " is" : "s are"} available. Maintain at least two
              before routine operations.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-4">
        <Metric
          label="Registered families"
          value={households.data.filter((household) => household.active).length}
          foot="Active households"
        />
        <Metric label="Pending access" value={pendingRequests.length} foot="Awaiting review" />
        <Metric label="Open services" value={openSessions.length} foot="Live now" />
        <Metric label="Attendance records" value={attendance.data.length} foot="Recent loaded records" />
      </div>

      <div className="grid grid-2">
        <Card className="section">
          <div className="section-head">
            <h3>Setup checklist</h3>
          </div>
          <div className="setup-list">
            {checklist.map((item) => (
              <Link className="setup-item" href={item.href} prefetch key={item.label}>
                <span>{item.done ? "✓" : "○"} {item.label}</span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="section">
          <div className="section-head">
            <h3>Access requiring attention</h3>
            <Link href="/team/" prefetch className="text-button">
              Open Team Access
            </Link>
          </div>
          {pendingRequests.length ? (
            <div className="setup-list">
              {pendingRequests.slice(0, 5).map((request) => (
                <div className="setup-item" key={request.id}>
                  <span>
                    <strong>{request.displayName || request.email}</strong>
                    <small className="muted"> · Pending</small>
                  </span>
                  <UserCheck size={17} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No pending requests"
              description="New authenticated users will appear here for explicit approval."
            />
          )}
        </Card>
      </div>
    </>
  );
}
