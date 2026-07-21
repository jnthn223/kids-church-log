"use client";
import { useState, type FormEvent } from "react";
import { CalendarPlus, Radio } from "lucide-react";
import { Button, Card, StatusChip } from "@kcl/ui";
import {
  openServiceSession,
  useAuthAccess,
  useMinistryCollection
} from "@kcl/firebase";
import type { ServiceSchedule, ServiceSession } from "@kcl/types";

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function ServiceSessionOpener() {
  const { member } = useAuthAccess();
  const schedules = useMinistryCollection<ServiceSchedule>("serviceSchedules");
  const sessions = useMinistryCollection<ServiceSession>("serviceSessions");
  const [kind, setKind] = useState<"SCHEDULED" | "ON_DEMAND">("SCHEDULED");
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState(localDate());
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const activeSchedules = schedules.data
    .filter((schedule) => schedule.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const openSessions = sessions.data.filter((session) => session.status === "OPEN");

  async function open(event: FormEvent) {
    event.preventDefault();
    if (!member) return;
    const schedule = activeSchedules.find((item) => item.id === scheduleId);
    if (kind === "SCHEDULED" && !schedule) return setError("Choose a recurring schedule.");
    if (kind === "ON_DEMAND" && name.trim().length < 2) return setError("Enter an on-demand service name.");
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await openServiceSession(member, {
        localServiceDate: date,
        scheduleId: kind === "SCHEDULED" ? schedule!.id : `on-demand-${name}-${time || "now"}`,
        scheduleName: kind === "SCHEDULED" ? schedule!.name : name.trim(),
        scheduleStartTime: kind === "SCHEDULED" ? schedule!.startTime : time,
        sessionKind: kind
      }, "MINISTRY_LEAD");
      setNotice(result.created
        ? `${result.session.scheduleName} is open. The Sunday team can now join and set today’s rooms.`
        : `${result.session.scheduleName} was already open, so no duplicate was created.`);
    } catch (value) {
      const code = value instanceof Error ? value.message : "";
      setError(code === "SERVICE_SESSION_CLOSED"
        ? `This service was already closed for ${date}. Its attendance and checkout history is final and cannot be overwritten. Use a different date or create a distinctly named on-demand gathering if this is a separate event.`
        : code === "SERVICE_SESSION_CANCELLED"
        ? `This service was cancelled for ${date}. Review the cancellation before creating any replacement gathering.`
        : code === "SERVICE_SESSION_ALREADY_FINISHED"
        ? `A completed service record already exists for ${date}. Reopening requires an explicit correction workflow so historical attendance remains trustworthy.`
        : "The service could not be opened.");
    } finally { setBusy(false); }
  }

  return <Card className="section"><div className="section-head"><div><h3>Open service operations</h3><small className="muted">Open a recurring service or an on-demand gathering. Kids Church Volunteers set and adjust today’s room plan.</small></div><StatusChip tone={openSessions.length ? "success" : "neutral"}>{openSessions.length} open</StatusChip></div>{notice && <div className="form-success" role="status">{notice}</div>}{error && <div className="form-error" role="alert">{error}</div>}<div className="record-tabs"><button type="button" className={kind === "SCHEDULED" ? "active" : ""} onClick={() => setKind("SCHEDULED")}><CalendarPlus size={15} /> Scheduled</button><button type="button" className={kind === "ON_DEMAND" ? "active" : ""} onClick={() => setKind("ON_DEMAND")}><Radio size={15} /> On demand</button></div><form onSubmit={(event) => void open(event)}>{kind === "SCHEDULED" ? <div className="field"><label htmlFor="lead-service-schedule">Recurring schedule</label><select id="lead-service-schedule" required value={scheduleId} onChange={(event) => setScheduleId(event.target.value)}><option value="">Choose schedule</option>{activeSchedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.name} · {schedule.startTime}</option>)}</select></div> : <div className="split"><div className="field"><label htmlFor="lead-service-name">Service name</label><input id="lead-service-name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Vacation Bible School" /></div><div className="field"><label htmlFor="lead-service-time">Start time (optional)</label><input id="lead-service-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></div>}<div className="split"><div className="field"><label htmlFor="lead-service-date">Service date</label><input id="lead-service-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="field"><label>Room plan</label><div className="impact-note"><strong>Set by Sunday team</strong><span>Room mapping is intentionally handled on site.</span></div></div></div><Button disabled={busy || schedules.loading}>{busy ? "Opening…" : "Open service"}</Button></form></Card>;
}
