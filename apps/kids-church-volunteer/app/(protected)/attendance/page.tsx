"use client";
import { CalendarDays, ChevronRight, History, Search, UserCheck, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, StatusChip } from "@kcl/ui";
import { loadSessionContext, subscribeToSessionAttendance, type SessionContext } from "@kcl/firebase";
import type { Attendance, ServiceSession } from "@kcl/types";
import { useVolunteerOperations } from "@/components/volunteer-context";

function displayTime(value: unknown) {
  if (!value || typeof value !== "object" || !("toDate" in value) || typeof value.toDate !== "function") return "";
  return value.toDate().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function AttendancePage() {
  const { sessions, sessionsLoading, sessionContext, attendance, attendanceError } = useVolunteerOperations();
  const [term, setTerm] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyContext, setHistoryContext] = useState<SessionContext | null>(null);
  const [historyAttendance, setHistoryAttendance] = useState<Attendance[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [loadingSessionId, setLoadingSessionId] = useState("");

  useEffect(() => {
    if (!historyContext) return;
    setHistoryAttendance([]);
    return subscribeToSessionAttendance(
      historyContext.session.id,
      (records) => { setHistoryAttendance(records); setHistoryError(""); },
      setHistoryError
    );
  }, [historyContext]);

  const reportContext = historyContext || sessionContext;
  const records = historyContext ? historyAttendance : attendance;
  const reportError = historyContext ? historyError : attendanceError;
  const closedSessions = useMemo(() => sessions
    .filter((session) => session.status === "CLOSED")
    .sort((a, b) => b.localServiceDate.localeCompare(a.localServiceDate)), [sessions]);
  const volunteersByUid = useMemo(() => new Map(
    (reportContext?.volunteerAssignments || []).map((assignment) => [assignment.memberUid, assignment.displayName])
  ), [reportContext?.volunteerAssignments]);

  async function openHistory(session: ServiceSession) {
    setLoadingSessionId(session.id);
    setHistoryError("");
    try {
      setHistoryContext(await loadSessionContext(session));
      setTerm("");
      setHistoryOpen(false);
    } catch {
      setHistoryError("This service record could not be opened. Check the connection and try again.");
    } finally {
      setLoadingSessionId("");
    }
  }

  function closeHistory() {
    setHistoryContext(null);
    setHistoryAttendance([]);
    setHistoryError("");
    setTerm("");
  }

  return <div className="operational-page">
    <div className="page-head attendance-page-head"><div><p className="eyebrow">{historyContext ? "Closed service record" : "Attendance"}</p><h1>{historyContext ? historyContext.session.scheduleName : "Attendance"}</h1><p>{reportContext ? `${reportContext.session.scheduleName} · ${reportContext.session.localServiceDate}${reportContext.session.scheduleStartTime ? ` · ${reportContext.session.scheduleStartTime}` : ""}` : "View current attendance or open a previous service record."}</p></div><div className="attendance-head-actions">{historyContext && <Button variant="secondary" onClick={closeHistory}>{sessionContext ? "Back to current" : "Close report"}</Button>}<Button variant="secondary" onClick={() => setHistoryOpen(true)}><History /> Service history</Button></div></div>

    {!reportContext ? <Card className="empty-card"><UserCheck size={42} /><h2>No current service selected</h2><p>Choose Service history to view attendance from a closed service.</p><Button variant="secondary" onClick={() => setHistoryOpen(true)}><History /> Open service history</Button></Card> : <AttendanceReport context={reportContext} records={records} error={reportError} term={term} setTerm={setTerm} volunteersByUid={volunteersByUid} historical={Boolean(historyContext)} />}

    {historyOpen && <div className="history-menu-backdrop" role="dialog" aria-modal="true" aria-labelledby="service-history-title"><div className="history-menu"><div className="history-menu-head"><div><p className="eyebrow">Attendance archive</p><h2 id="service-history-title">Service history</h2><p>Choose a closed service to open its read-only attendance report.</p></div><Button variant="ghost" aria-label="Close service history" onClick={() => setHistoryOpen(false)}><X /></Button></div>{historyError && !historyContext && <div className="form-error">{historyError}</div>}{sessionsLoading ? <div className="loading"><div><div className="spinner" />Loading service history…</div></div> : closedSessions.length ? <div className="history-service-list">{closedSessions.map((session) => <button key={session.id} disabled={Boolean(loadingSessionId)} onClick={() => void openHistory(session)}><span><StatusChip tone="neutral">Closed</StatusChip><strong>{session.scheduleName}</strong><small>{session.localServiceDate}{session.scheduleStartTime ? ` · ${session.scheduleStartTime}` : ""} · {session.sessionKind === "ON_DEMAND" ? "On demand" : "Scheduled"}</small></span><span className="history-open-label">{loadingSessionId === session.id ? "Opening…" : "View report"}<ChevronRight /></span></button>)}</div> : <Card className="empty-card"><History size={42} /><h2>No closed services yet</h2><p>Completed services will appear here after they are safely closed.</p></Card>}</div></div>}
  </div>;
}

function AttendanceReport({ context, records, error, term, setTerm, volunteersByUid, historical }: { context: SessionContext; records: Attendance[]; error: string; term: string; setTerm(value: string): void; volunteersByUid: Map<string, string>; historical: boolean }) {
  const { volunteerAssignments, roomAssignments } = context;
  const rows = records
    .filter((item) => `${item.childNameSnapshot} ${item.householdNameSnapshot} ${item.groupNameSnapshot} ${item.roomNameSnapshot}`.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
    .sort((a, b) => a.childNameSnapshot.localeCompare(b.childNameSnapshot));
  const families = new Set(records.map((item) => item.householdId)).size;
  const checkedIn = records.filter((item) => item.status === "CHECKED_IN").length;
  const assignmentLocation = (groupId?: string, roomId?: string, servingAreaLabel?: string) => {
    const placement = roomAssignments.find((item) => (groupId && item.groupId === groupId) || (roomId && item.roomId === roomId));
    return placement ? `${placement.groupName} · ${placement.roomName}` : servingAreaLabel || "Serving area not recorded";
  };

  return <>
    <div className="report-status-line"><StatusChip tone={historical ? "neutral" : "success"}>{historical ? "Closed · read only" : "Open"}</StatusChip>{historical && <span>This report does not affect the current open service.</span>}</div>
    {error && <div className="form-error">Attendance could not refresh: {error}</div>}
    <div className="attendance-summary-grid"><Card><Users /><strong>{records.length}</strong><span>children served</span></Card><Card><UserCheck /><strong>{families}</strong><span>families welcomed</span></Card><Card><CalendarDays /><strong>{historical ? records.filter((item) => item.status === "CHECKED_OUT").length : checkedIn}</strong><span>{historical ? "releases completed" : "currently checked in"}</span></Card></div>
    <section className="attendance-section"><div className="section-heading"><div><p className="eyebrow">Service team</p><h2>Recorded volunteers</h2></div><StatusChip tone="info">{volunteerAssignments.length} recorded</StatusChip></div>{volunteerAssignments.length ? <div className="volunteer-assignment-grid">{volunteerAssignments.map((assignment) => <Card className="volunteer-assignment-card" key={assignment.id}><span className="large-avatar">{assignment.displayName.charAt(0)}</span><div><strong>{assignment.displayName}</strong><span>{assignment.assignmentRole}</span><small>{assignmentLocation(assignment.groupId, assignment.roomId, assignment.servingAreaLabel)}</small></div></Card>)}</div> : <Card className="empty-team-card"><p>No volunteer participation was recorded for this service. This can occur for services completed before participation tracking was enabled.</p></Card>}</section>
    <section className="attendance-section"><div className="section-heading"><div><p className="eyebrow">Attendance log</p><h2>Children</h2></div></div><label className="attendance-search"><Search size={20} /><input aria-label="Search service attendance" placeholder="Search child, family, group, or room" value={term} onChange={(event) => setTerm(event.target.value)} /></label><div className="attendance-list">{rows.length ? rows.map((record) => { const checkInTime = displayTime(record.checkInAt); const checkOutTime = displayTime(record.checkOutAt); const checkInVolunteer = record.checkInBy ? volunteersByUid.get(record.checkInBy) : ""; const checkOutVolunteer = record.checkOutBy ? volunteersByUid.get(record.checkOutBy) : ""; return <Card className="attendance-row" key={record.id}><span className="child-avatar">{record.childNameSnapshot.charAt(0)}</span><span className="attendance-person"><strong>{record.childNameSnapshot}</strong><small>{record.householdNameSnapshot} · {record.groupNameSnapshot} — {record.roomNameSnapshot}</small><small className="attendance-operation">Checked in{checkInTime ? ` at ${checkInTime}` : ""}{checkInVolunteer ? ` by ${checkInVolunteer}` : ""}{record.status === "CHECKED_OUT" ? ` · Released${checkOutTime ? ` at ${checkOutTime}` : ""}${checkOutVolunteer ? ` by ${checkOutVolunteer}` : ""}${record.releasedToName ? ` to ${record.releasedToName}` : ""}` : ""}</small>{record.placementOverridden && <small className="placement-override-label">Different placement · {record.placementOverrideReason}</small>}</span><StatusChip tone={record.status === "CHECKED_IN" ? "warning" : "success"}>{record.status === "CHECKED_IN" ? "Checked in" : "Checked out"}</StatusChip></Card>; }) : <Card className="empty-card"><UserCheck size={42} /><h2>No matching children</h2><p>{records.length ? "Try a different child, family, group, or room." : "No children attended this service."}</p></Card>}</div></section>
  </>;
}
