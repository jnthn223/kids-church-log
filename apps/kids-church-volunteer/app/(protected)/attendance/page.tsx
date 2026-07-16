"use client";
import { Search, UserCheck } from "lucide-react";
import { useState } from "react";
import { Card, StatusChip } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";
import { useVolunteerOperations } from "@/components/volunteer-context";

export default function AttendancePage() {
  const { member } = useAuthAccess();
  const { sessionContext, attendance, attendanceError } = useVolunteerOperations();
  const [term, setTerm] = useState("");
  if (!sessionContext) return <NoService />;
  const assignedRoomIds = new Set(sessionContext.volunteerAssignments.filter((item) => item.memberUid === member?.userId && item.roomId).map((item) => item.roomId));
  const scoped = assignedRoomIds.size ? attendance.filter((item) => assignedRoomIds.has(item.roomId)) : attendance;
  const rows = scoped.filter((item) => `${item.childNameSnapshot} ${item.householdNameSnapshot} ${item.roomNameSnapshot}`.toLocaleLowerCase().includes(term.toLocaleLowerCase())).sort((a, b) => a.childNameSnapshot.localeCompare(b.childNameSnapshot));
  return <div className="operational-page"><div className="page-head"><div><p className="eyebrow">Current service</p><h1>Attendance</h1><p>{sessionContext.session.scheduleName} · {attendance.filter((item) => item.status === "CHECKED_IN").length} currently checked in</p></div></div>{attendanceError && <div className="form-error">Attendance could not refresh: {attendanceError}</div>}<label className="attendance-search"><Search size={20} /><input aria-label="Search current attendance" placeholder="Search child, family, or room" value={term} onChange={(event) => setTerm(event.target.value)} /></label><div className="attendance-list">{rows.length ? rows.map((record) => <Card className="attendance-row" key={record.id}><span className="child-avatar">{record.childNameSnapshot.charAt(0)}</span><span className="attendance-person"><strong>{record.childNameSnapshot}</strong><small>{record.householdNameSnapshot} · {record.roomNameSnapshot}</small></span><StatusChip tone={record.status === "CHECKED_IN" ? "warning" : "success"}>{record.status === "CHECKED_IN" ? "Checked in" : "Checked out"}</StatusChip></Card>) : <Card className="empty-card"><UserCheck size={42} /><h2>No matching children</h2><p>Only children in the current service appear here.</p></Card>}</div></div>;
}

function NoService() { return <div className="operational-page"><Card className="empty-card"><UserCheck size={42} /><h2>Choose a service first</h2><p>Open Check-in and join an active service to view current attendance.</p></Card></div>; }
