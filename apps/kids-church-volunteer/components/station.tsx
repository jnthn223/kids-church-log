"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, KeyRound, QrCode, Search, ShieldCheck, Users, X } from "lucide-react";
import { Button, Card, StatusChip } from "@kcl/ui";
import {
  checkInChildren,
  checkOutChildren,
  getOperationalFamilyByHousehold,
  loadSessionContext,
  openServiceSession,
  resolveOperationalFamily,
  searchOperationalFamilies,
  useAuthAccess,
  useMinistryCollection,
  type CheckMethod,
  type OperationalFamily,
  type SessionContext,
  type SessionRoomMappingInput,
  type VolunteerServingAreaInput
} from "@kcl/firebase";
import type { Attendance, Household, MinistryGroup, Room, RoomAssignment, ServiceSchedule, ServiceSession } from "@kcl/types";
import { QrScanner } from "./qr-scanner";
import { useVolunteerOperations } from "./volunteer-context";

type Mode = "CHECK_IN" | "CHECK_OUT";
type Stage = "READY" | "FAMILY" | "SUCCESS";

export function Station() {
  const { member } = useAuthAccess();
  const operations = useVolunteerOperations();
  const [mode, setMode] = useState<Mode>("CHECK_IN");
  const [stage, setStage] = useState<Stage>("READY");
  const [family, setFamily] = useState<OperationalFamily | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [placementByChild, setPlacementByChild] = useState<Record<string, string>>({});
  const [overrideReasonByChild, setOverrideReasonByChild] = useState<Record<string, string>>({});
  const [guardianId, setGuardianId] = useState("");
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState("");
  const [key, setKey] = useState("");
  const [method, setMethod] = useState<CheckMethod>("QR");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successText, setSuccessText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Household[]>([]);
  const [searching, setSearching] = useState(false);

  const context = operations.sessionContext;
  const familyAttendance = useMemo(
    () => operations.attendance.filter((record) => record.householdId === family?.household.id),
    [operations.attendance, family?.household.id]
  );
  const checkedInByChild = useMemo(
    () => new Map(familyAttendance.map((record) => [record.childId, record])),
    [familyAttendance]
  );
  const selectedAttendance = familyAttendance.filter(
    (record) => selected.includes(record.childId) && record.status === "CHECKED_IN"
  );
  const eligibleGuardians = (family?.guardians || []).filter(
    (guardian) => guardian.active && selected.every((childId) =>
      family?.children.find((child) => child.id === childId)?.authorizedGuardianIds?.includes(guardian.id)
    )
  );

  if (!context) {
    return <ServiceSelector
      sessions={operations.sessions}
      loading={operations.sessionsLoading}
      selecting={operations.selecting}
      select={operations.selectSession}
    />;
  }
  const activeContext = context;
  const ownParticipation = member
    ? context.volunteerAssignments.find((assignment) => assignment.memberUid === member.userId)
    : null;
  if (member && !ownParticipation?.servingAreaLabel) {
    return <ServingAreaGate context={context} select={operations.selectSession} />;
  }

  function reset(nextMode = mode) {
    setMode(nextMode);
    setStage("READY");
    setFamily(null);
    setSelected([]);
    setPlacementByChild({});
    setOverrideReasonByChild({});
    setGuardianId("");
    setVerified(false);
    setNote("");
    setKey("");
    setError("");
    setSuccessText("");
    setSearchTerm("");
    setSearchResults([]);
  }

  function prepareFamily(nextFamily: OperationalFamily, nextMethod: CheckMethod) {
    setFamily(nextFamily);
    setMethod(nextMethod);
    setGuardianId("");
    setVerified(false);
    const available = mode === "CHECK_IN"
      ? nextFamily.children.filter((child) => child.active && !operations.attendance.some((record) => record.childId === child.id && record.sessionId === activeContext.session.id)).map((child) => child.id)
      : operations.attendance.filter((record) => record.householdId === nextFamily.household.id && record.status === "CHECKED_IN").map((record) => record.childId);
    setSelected(available);
    setPlacementByChild(Object.fromEntries(nextFamily.children.map((child) => [
      child.id,
      activeContext.roomAssignments.some((assignment) => assignment.groupId === child.ministryGroupId)
        ? child.ministryGroupId || ""
        : ""
    ])));
    setOverrideReasonByChild({});
    setStage("FAMILY");
    setError("");
  }

  async function resolveKey(value: string, nextMethod: CheckMethod) {
    if (!operations.online) return setError("Connection required for safe check-in and check-out.");
    setBusy(true); setError(""); setScannerOpen(false);
    try {
      prepareFamily(await resolveOperationalFamily(value), nextMethod);
    } catch (value) {
      const code = value instanceof Error ? value.message : "";
      setError(code === "FAMILY_PASS_NOT_FOUND" ? "Family Pass not found. Check the key or ask the Registration Team." : code === "FAMILY_PASS_INACTIVE" ? "This pass was replaced or disabled. Ask the Registration Team to verify the family." : "The family could not be loaded. Check the connection and try again.");
    } finally { setBusy(false); }
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (searchTerm.trim().length < 3) return setError("Enter at least 3 characters.");
    setSearching(true); setError("");
    try { setSearchResults(await searchOperationalFamilies(searchTerm)); }
    catch { setError("Search is unavailable. Check the connection and try again."); }
    finally { setSearching(false); }
  }

  async function chooseSearchResult(householdId: string) {
    setBusy(true); setError("");
    try { prepareFamily(await getOperationalFamilyByHousehold(householdId), "MANUAL"); }
    catch { setError("The family record could not be opened."); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!member || !family || !selected.length) return;
    if (!operations.online) return setError("Connection required for this safety-sensitive action.");
    setBusy(true); setError("");
    try {
      if (mode === "CHECK_IN") {
        const placements = selected.map((childId) => ({
          childId,
          groupId: placementByChild[childId] || "",
          overrideReason: overrideReasonByChild[childId]
        }));
        if (placements.some((placement) => !placement.groupId)) {
          throw new Error("ROOM_ASSIGNMENT_MISSING");
        }
        const result = await checkInChildren(member, activeContext, family, placements, method);
        const created = result.filter((item) => item.status === "CREATED").length;
        const existing = result.length - created;
        setSuccessText(`${created} ${created === 1 ? "child" : "children"} checked in${existing ? ` · ${existing} already checked in` : ""}.`);
      } else {
        if (!guardianId || !verified) throw new Error("RELEASE_NOT_VERIFIED");
        const result = await checkOutChildren(member, family, selectedAttendance, guardianId, note, method);
        const released = result.filter((item) => item.status === "CHECKED_OUT").length;
        setSuccessText(`${released} ${released === 1 ? "child" : "children"} released to ${eligibleGuardians.find((guardian) => guardian.id === guardianId)?.fullName || "authorized guardian"}.`);
      }
      setStage("SUCCESS");
    } catch (value) {
      const code = value instanceof Error ? value.message : "";
      const firebaseCode = typeof value === "object" && value && "code" in value ? String(value.code) : "";
      console.error("Attendance operation failed", value);
      setError(code === "ROOM_ASSIGNMENT_MISSING" ? "Choose a group and room placement for every selected child." : code === "PLACEMENT_OVERRIDE_REASON_REQUIRED" ? "Choose a reason when placing a child outside their registered group." : code === "SESSION_PLACEMENT_CHANGED" ? "The group and room plan changed at another station. Return to the ready screen, refresh, and try again." : code === "CHILD_PLACEMENT_CHANGED" ? "This child’s registered group changed after the family was loaded. Clear the family and scan again." : code === "GUARDIAN_NOT_AUTHORIZED" || code === "RELEASE_NOT_VERIFIED" ? "Select an authorized guardian and confirm identity before release." : code === "SESSION_NOT_OPEN" ? "This service is no longer open. Return to service selection." : firebaseCode.includes("permission-denied") ? "Firestore rejected this check-in (permission-denied). No attendance was recorded. Ask a Ministry Lead to confirm that the latest rules are deployed." : firebaseCode.includes("unavailable") ? "Firestore is unavailable. Check the connection and retry; no attendance was recorded." : `The attendance update did not complete${firebaseCode ? ` (${firebaseCode})` : ""}. Nothing should be assumed—check current attendance and retry.`);
    } finally { setBusy(false); }
  }

  if (stage === "SUCCESS") {
    return <div className="success-screen"><div className="success-mark"><Check size={52} /></div><p className="eyebrow">{mode === "CHECK_IN" ? "Check-in complete" : "Check-out complete"}</p><h1>{family?.household.householdName}</h1><p>{successText}</p><Button onClick={() => reset()}>Next family</Button></div>;
  }

  if (stage === "FAMILY" && family) {
    return <FamilyConfirmation mode={mode} family={family} selected={selected} setSelected={setSelected} placementByChild={placementByChild} setPlacementByChild={setPlacementByChild} overrideReasonByChild={overrideReasonByChild} setOverrideReasonByChild={setOverrideReasonByChild} checkedInByChild={checkedInByChild} assignments={context.roomAssignments} eligibleGuardians={eligibleGuardians} guardianId={guardianId} setGuardianId={setGuardianId} verified={verified} setVerified={setVerified} note={note} setNote={setNote} busy={busy} error={error} back={() => reset()} commit={() => void commit()} />;
  }

  const currentCount = operations.attendance.filter((record) => record.status === "CHECKED_IN").length;
  return <><section className="ready-hero"><div className="service-line"><StatusChip tone="success">Open</StatusChip><span>{context.session.scheduleName} · {context.session.localServiceDate}</span></div><h1>{mode === "CHECK_IN" ? "Ready to check in" : "Ready to check out"}</h1><p>{mode === "CHECK_IN" ? "Scan the family pass, then confirm the children attending." : "Scan the same pass, then verify the authorized guardian before release."}</p><div className="mode-switch"><button className={mode === "CHECK_IN" ? "active" : ""} onClick={() => reset("CHECK_IN")}>Check-in</button><button className={mode === "CHECK_OUT" ? "active" : ""} onClick={() => reset("CHECK_OUT")}>Check-out</button></div></section>{!context.roomAssignments.length && <div className="setup-banner"><AlertTriangle /><span><strong>Room setup required</strong> A Sunday team volunteer must map every active group before check-in.</span><Link className="button button-primary" href="/rooms/">Set up rooms</Link></div>}{!operations.online && <div className="offline-banner"><AlertTriangle /><span><strong>Connection required</strong> Attendance actions are disabled until this station reconnects.</span></div>}{error && <div className="form-error" role="alert">{error}</div>}<div className="station-grid"><Card className="scan-card"><div className="scan-icon"><QrCode size={44} /></div><h2>Scan Family QR</h2><p>Camera access starts only when you tap below.</p><Button disabled={!operations.online || busy || !context.roomAssignments.length} onClick={() => setScannerOpen(true)}><QrCode /> Start scanner</Button><div className="key-entry"><span>or enter the Family Key</span><form onSubmit={(event) => { event.preventDefault(); void resolveKey(key, "MANUAL"); }}><input aria-label="Family Key" placeholder="KCL-XXXXX-XXXXX-XXXX" value={key} onChange={(event) => setKey(event.target.value)} /><Button variant="secondary" disabled={!key.trim() || busy || !context.roomAssignments.length}><KeyRound size={18} /> Find</Button></form></div></Card><Card className="manual-card"><div className="card-title"><Search /><div><h2>Manual family search</h2><p>Use a full household, guardian, or child name.</p></div></div><form className="search-form" onSubmit={(event) => void search(event)}><input placeholder="e.g. Santos Family" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /><Button variant="secondary" disabled={searching || !operations.online || !context.roomAssignments.length}>{searching ? "Searching…" : "Search"}</Button></form>{searchResults.length > 0 && <div className="search-results">{searchResults.map((household) => <button key={household.id} onClick={() => void chooseSearchResult(household.id)}><span><strong>{household.householdName}</strong><small>{household.childIds?.length || 0} registered children</small></span><ChevronRight /></button>)}</div>}</Card></div><div className="station-summary"><span><Users size={20} /><strong>{currentCount}</strong> children currently checked in</span><button onClick={operations.leaveSession}>Change service</button></div>{scannerOpen && <QrScanner onRead={(value) => void resolveKey(value, "QR")} onClose={() => setScannerOpen(false)} />}</>;
}

const SERVICE_WIDE = "__SERVICE_WIDE__";

function servingArea(groupId: string, assignments: RoomAssignment[]): VolunteerServingAreaInput {
  if (groupId === SERVICE_WIDE) {
    return { groupId: "", roomId: "", servingAreaLabel: "Check-in / service-wide" };
  }
  const assignment = assignments.find((item) => item.groupId === groupId);
  if (!assignment) throw new Error("VOLUNTEER_SERVING_AREA_REQUIRED");
  return {
    groupId: assignment.groupId,
    roomId: assignment.roomId,
    servingAreaLabel: `${assignment.groupName} · ${assignment.roomName}`
  };
}

function ServingAreaGate({ context, select }: { context: SessionContext; select(session: ServiceSession, servingArea: VolunteerServingAreaInput): Promise<void> }) {
  const [groupId, setGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (!groupId) return;
    setBusy(true); setError("");
    try {
      await select(context.session, servingArea(groupId, context.roomAssignments));
    } catch {
      setError("Your serving area could not be recorded. Check the connection and retry.");
    } finally { setBusy(false); }
  }
  return <div className="service-select"><p className="eyebrow">Volunteer assignment</p><h1>Where are you serving?</h1><p>Choose your primary area before continuing. This becomes part of the service audit record.</p><Card className="serving-area-gate">{error && <div className="form-error">{error}</div>}<div className="field"><label htmlFor="current-serving-area">Primary serving area</label><select id="current-serving-area" required value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Choose where you are serving</option><option value={SERVICE_WIDE}>Check-in / service-wide</option>{context.roomAssignments.map((assignment) => <option key={assignment.groupId} value={assignment.groupId}>{assignment.groupName} — {assignment.roomName}</option>)}</select></div><Button disabled={busy || !groupId} onClick={() => void confirm()}>{busy ? "Recording…" : "Record serving area"}</Button></Card></div>;
}

function ServiceSelector({ sessions, loading, selecting, select }: { sessions: ServiceSession[]; loading: boolean; selecting: boolean; select(session: ServiceSession, servingArea: VolunteerServingAreaInput): Promise<void> }) {
  const open = sessions.filter((session) => session.status === "OPEN").sort((a, b) => b.localServiceDate.localeCompare(a.localServiceDate));
  const [joiningContext, setJoiningContext] = useState<SessionContext | null>(null);
  const [servingGroupId, setServingGroupId] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  async function prepareJoin(session: ServiceSession) {
    setJoinLoading(true); setJoinError("");
    try {
      setJoiningContext(await loadSessionContext(session));
      setServingGroupId("");
    } catch {
      setJoinError("The service details could not be loaded. Check the connection and try again.");
    } finally { setJoinLoading(false); }
  }

  async function confirmJoin() {
    if (!joiningContext || !servingGroupId) return;
    setJoinError("");
    try {
      await select(joiningContext.session, servingArea(servingGroupId, joiningContext.roomAssignments));
      setJoiningContext(null);
    } catch (value) {
      const code = value instanceof Error ? value.message : "";
      setJoinError(code === "SESSION_NOT_OPEN" ? "This service closed before you joined. Choose another service." : "Your serving area could not be recorded. Check the connection and retry.");
    }
  }

  return <div className="service-select"><p className="eyebrow">Sunday station</p><h1>Choose or open a service</h1><p>Join an existing session whenever possible. Any active Kids Church Volunteer may open today’s scheduled service or an on-demand gathering—no per-service approval is required.</p>{joinError && !joiningContext && <div className="form-error">{joinError}</div>}{loading ? <div className="loading"><div className="spinner" />Loading services…</div> : open.length ? <div className="service-list">{open.map((session) => <Card key={session.id} className="service-card"><div><StatusChip tone="success">Open</StatusChip><h2>{session.scheduleName}</h2><p>{session.localServiceDate}{session.scheduleStartTime ? ` · ${session.scheduleStartTime}` : ""} · {session.sessionKind === "ON_DEMAND" ? "On demand" : "Scheduled"}</p></div><Button disabled={selecting || joinLoading} onClick={() => void prepareJoin(session)}>{joinLoading ? "Loading…" : "Join service"} <ChevronRight /></Button></Card>)}</div> : <Card className="empty-card"><Users size={42} /><h2>No open service</h2><p>Open a scheduled or on-demand service below when the team is ready.</p></Card>}<ServiceOpener selecting={selecting} select={select} />{joiningContext && <div className="mapping-backdrop" role="dialog" aria-modal="true" aria-labelledby="join-service-title"><Card className="mapping-dialog join-service-dialog"><div className="mapping-head"><div><p className="eyebrow">Record participation</p><h1 id="join-service-title">Where are you serving?</h1><p>{joiningContext.session.scheduleName} · Choose your primary area for this service.</p></div><Button variant="ghost" aria-label="Cancel joining service" disabled={selecting} onClick={() => setJoiningContext(null)}><X /></Button></div>{joinError && <div className="form-error">{joinError}</div>}<div className="field"><label htmlFor="join-serving-area">Primary serving area</label><select id="join-serving-area" required value={servingGroupId} onChange={(event) => setServingGroupId(event.target.value)}><option value="">Choose where you are serving</option><option value={SERVICE_WIDE}>Check-in / service-wide</option>{joiningContext.roomAssignments.map((assignment) => <option key={assignment.groupId} value={assignment.groupId}>{assignment.groupName} — {assignment.roomName}</option>)}</select></div><p className="serving-area-help">This selection is recorded for service auditing. Choose the area where you expect to spend most of the service.</p><div className="mapping-actions"><Button variant="ghost" disabled={selecting} onClick={() => setJoiningContext(null)}>Cancel</Button><Button disabled={selecting || !servingGroupId} onClick={() => void confirmJoin()}>{selecting ? "Recording…" : "Record and join"}</Button></div></Card></div>}</div>;
}

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function ServiceOpener({ selecting, select }: { selecting: boolean; select(session: ServiceSession, servingArea: VolunteerServingAreaInput): Promise<void> }) {
  const { member } = useAuthAccess();
  const schedules = useMinistryCollection<ServiceSchedule>("serviceSchedules");
  const groups = useMinistryCollection<MinistryGroup>("ministryGroups");
  const rooms = useMinistryCollection<Room>("rooms");
  const [kind, setKind] = useState<"SCHEDULED" | "ON_DEMAND">("SCHEDULED");
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState(localDate());
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [stationName, setStationName] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [roomByGroup, setRoomByGroup] = useState<Record<string, string>>({});
  const [servingGroupId, setServingGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeSchedules = schedules.data.filter((schedule) => schedule.active).sort((a, b) => a.displayOrder - b.displayOrder);
  const activeGroups = useMemo(() => groups.data.filter((group) => group.active).sort((a, b) => a.displayOrder - b.displayOrder), [groups.data]);
  const activeRooms = useMemo(() => rooms.data.filter((room) => room.active).sort((a, b) => a.displayOrder - b.displayOrder), [rooms.data]);

  useEffect(() => {
    setSelectedGroupIds(activeGroups.map((group) => group.id));
  }, [activeGroups]);

  async function open(event: FormEvent) {
    event.preventDefault();
    if (!member) return;
    const schedule = activeSchedules.find((item) => item.id === scheduleId);
    if (kind === "SCHEDULED" && !schedule) return setError("Choose a recurring service schedule.");
    if (kind === "ON_DEMAND" && name.trim().length < 2) return setError("Enter a name for the on-demand service.");
    if (!selectedGroupIds.length) return setError("Choose at least one group for this service.");
    if (selectedGroupIds.some((groupId) => !roomByGroup[groupId])) return setError("Choose a room for every selected group.");
    if (!servingGroupId) return setError("Choose where you are serving for this service.");
    const mappings: SessionRoomMappingInput[] = selectedGroupIds.map((groupId) => {
      const group = activeGroups.find((item) => item.id === groupId)!;
      const room = activeRooms.find((item) => item.id === roomByGroup[groupId])!;
      return { groupId: group.id, groupName: group.name, roomId: room.id, roomName: room.name, capacity: room.capacity };
    });
    setBusy(true); setError("");
    try {
      const result = await openServiceSession(member, {
        localServiceDate: date,
        scheduleId: kind === "SCHEDULED" ? schedule!.id : `on-demand-${name}-${time || "now"}`,
        scheduleName: kind === "SCHEDULED" ? schedule!.name : name.trim(),
        scheduleStartTime: kind === "SCHEDULED" ? schedule!.startTime : time,
        sessionKind: kind,
        stationName
      }, "KIDS_CHURCH_VOLUNTEER", mappings, servingArea(servingGroupId, mappings.map((mapping) => ({ id: mapping.groupId, active: true, ...mapping }))));
      await select(result.session, servingArea(servingGroupId, mappings.map((mapping) => ({ id: mapping.groupId, active: true, ...mapping }))));
    } catch (value) {
      const code = value instanceof Error ? value.message : "";
      setError(code === "SERVICE_SESSION_CLOSED"
        ? `This ${kind === "SCHEDULED" ? "scheduled service" : "gathering"} was already closed for ${date}. Closed sessions cannot be reopened or overwritten because their attendance and checkout history must remain final. Check the service date, or choose On demand with a distinct name if this is a separate gathering.`
        : code === "SERVICE_SESSION_CANCELLED"
        ? `This service was cancelled for ${date}, so it cannot be opened as the same session. Check the selected date or ask a Ministry Lead to review the cancellation.`
        : code === "SERVICE_SESSION_ALREADY_FINISHED"
        ? `A completed service record already exists for ${date}. Its attendance history is protected; check the date or ask a Ministry Lead to review it.`
        : "The service could not be opened. Refresh and try again.");
    } finally { setBusy(false); }
  }

  return <Card className="service-opener">
    <div className="service-opener-head"><div><p className="eyebrow">Open a new session</p><h2>Start service operations</h2></div><StatusChip tone="info">Team configured</StatusChip></div>
    {error && <div className="form-error">{error}</div>}
    <div className="mode-switch"><button type="button" className={kind === "SCHEDULED" ? "active" : ""} onClick={() => setKind("SCHEDULED")}>Scheduled</button><button type="button" className={kind === "ON_DEMAND" ? "active" : ""} onClick={() => setKind("ON_DEMAND")}>On demand</button></div>
    <form onSubmit={(event) => void open(event)}>
      {kind === "SCHEDULED" ? <div className="field"><label htmlFor="service-schedule">Recurring schedule</label><select id="service-schedule" required value={scheduleId} onChange={(event) => setScheduleId(event.target.value)}><option value="">Choose schedule</option>{activeSchedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.name} · {schedule.startTime}</option>)}</select></div> : <div className="split-fields"><div className="field"><label htmlFor="service-name">Service name</label><input id="service-name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Vacation Bible School" /></div><div className="field"><label htmlFor="service-time">Start time <span>(optional)</span></label><input id="service-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></div>}
      <div className="split-fields"><div className="field"><label htmlFor="service-date">Service date</label><input id="service-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="field"><label htmlFor="station-name">Station name <span>(optional)</span></label><input id="station-name" value={stationName} onChange={(event) => setStationName(event.target.value)} placeholder="e.g. Main entrance" /></div></div>
      <fieldset className="session-placement-setup"><legend>Groups and rooms for this service</legend><p>Select only the groups operating today, then choose each room.</p>{groups.loading || rooms.loading ? <div className="loading"><div className="spinner" />Loading groups and rooms…</div> : activeGroups.length && activeRooms.length ? <div className="session-placement-list">{activeGroups.map((group) => { const enabled = selectedGroupIds.includes(group.id); return <div className={`session-placement-row ${enabled ? "selected" : ""}`} key={group.id}><label><input type="checkbox" checked={enabled} onChange={(event) => setSelectedGroupIds((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))} /><span><strong>{group.name}</strong><small>{group.minAge !== undefined || group.maxAge !== undefined ? `Age guidance: ${group.minAge ?? 0}–${group.maxAge ?? "up"}` : "Ministry group"}</small></span></label><select aria-label={`Room for ${group.name}`} disabled={!enabled} required={enabled} value={roomByGroup[group.id] || ""} onChange={(event) => setRoomByGroup((current) => ({ ...current, [group.id]: event.target.value }))}><option value="">Choose room</option>{activeRooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.capacity ? ` · capacity ${room.capacity}` : ""}</option>)}</select></div>; })}</div> : <div className="form-error">A Ministry Lead must configure at least one active group and room first.</div>}</fieldset>
      <div className="field serving-area-field"><label htmlFor="opener-serving-area">Where are you serving?</label><select id="opener-serving-area" required value={servingGroupId} onChange={(event) => setServingGroupId(event.target.value)}><option value="">Choose your primary serving area</option><option value={SERVICE_WIDE}>Check-in / service-wide</option>{selectedGroupIds.map((groupId) => { const group = activeGroups.find((item) => item.id === groupId); const room = activeRooms.find((item) => item.id === roomByGroup[groupId]); return group && room ? <option key={groupId} value={groupId}>{group.name} — {room.name}</option> : null; })}</select><small>This is recorded with your volunteer participation for auditing.</small></div>
      <Button disabled={busy || selecting || schedules.loading || groups.loading || rooms.loading}>{busy ? "Opening service…" : "Open and join service"}</Button>
    </form>
  </Card>;
}

type FamilyConfirmationProps = {
  mode: Mode; family: OperationalFamily; selected: string[]; setSelected(value: string[]): void;
  placementByChild: Record<string, string>; setPlacementByChild(value: Record<string, string>): void;
  overrideReasonByChild: Record<string, string>; setOverrideReasonByChild(value: Record<string, string>): void;
  checkedInByChild: Map<string, Attendance>; assignments: RoomAssignment[];
  eligibleGuardians: OperationalFamily["guardians"]; guardianId: string; setGuardianId(value: string): void;
  verified: boolean; setVerified(value: boolean): void; note: string; setNote(value: string): void;
  busy: boolean; error: string; back(): void; commit(): void;
};

function FamilyConfirmation(props: FamilyConfirmationProps) {
  const availableChildren = props.mode === "CHECK_IN" ? props.family.children.filter((child) => child.active) : props.family.children.filter((child) => props.checkedInByChild.get(child.id)?.status === "CHECKED_IN");
  const toggle = (childId: string, enabled: boolean) => props.setSelected(enabled ? [...props.selected, childId] : props.selected.filter((id) => id !== childId));
  const placementMissing = props.mode === "CHECK_IN" && props.selected.some((childId) => !props.assignments.some((item) => item.groupId === props.placementByChild[childId]));
  const reasonMissing = props.mode === "CHECK_IN" && props.selected.some((childId) => { const child = props.family.children.find((item) => item.id === childId); return child?.ministryGroupId !== props.placementByChild[childId] && !props.overrideReasonByChild[childId]; });
  return <div className="confirmation"><button className="back-link" onClick={props.back}>← Cancel and clear family</button><div className="confirmation-head"><div><p className="eyebrow">{props.mode === "CHECK_IN" ? "Confirm attendance" : "Verify release"}</p><h1>{props.family.household.householdName}</h1><p>{props.mode === "CHECK_IN" ? "Select the children attending and choose where each child will be today." : "Select children being released, then identify an authorized guardian."}</p></div><ShieldCheck size={42} /></div>{props.error && <div className="form-error" role="alert">{props.error}</div>}{availableChildren.length ? <div className="child-options">{availableChildren.map((child) => { const existing = props.checkedInByChild.get(child.id); const disabled = props.mode === "CHECK_IN" && Boolean(existing); const chosenGroupId = props.placementByChild[child.id] || ""; const chosen = props.assignments.find((item) => item.groupId === chosenGroupId); const overridden = props.mode === "CHECK_IN" && child.ministryGroupId !== chosenGroupId && Boolean(chosenGroupId); const alerts = [child.allergies && `Allergies: ${child.allergies}`, child.medicalNotes && "Medical information recorded", child.assistanceNotes && "Assistance needs recorded"].filter(Boolean); return <article key={child.id} className={`child-option ${disabled ? "disabled" : ""}`}><label className="child-check"><input type="checkbox" checked={props.selected.includes(child.id) && !disabled} disabled={disabled} onChange={(event) => toggle(child.id, event.target.checked)} /><span className="child-main"><strong>{child.preferredName || child.firstName} {child.lastName}</strong><small>{disabled ? `Already ${existing?.status.toLowerCase().replace("_", " ")}` : child.ministryGroupId ? "Registered group placement available below" : "No registered group — choose today’s placement"}</small></span></label>{props.mode === "CHECK_IN" && !disabled && props.selected.includes(child.id) && <div className="child-placement"><label><span>Placement for this service</span><select value={chosenGroupId} onChange={(event) => props.setPlacementByChild({ ...props.placementByChild, [child.id]: event.target.value })}><option value="">Choose group and room</option>{props.assignments.map((assignment) => <option key={assignment.groupId} value={assignment.groupId}>{assignment.groupName} — {assignment.roomName}</option>)}</select></label>{overridden && <label className="override-reason"><span>Reason for different placement</span><select value={props.overrideReasonByChild[child.id] || ""} onChange={(event) => props.setOverrideReasonByChild({ ...props.overrideReasonByChild, [child.id]: event.target.value })}><option value="">Choose reason</option><option value="Staying with sibling">Staying with sibling</option><option value="Guardian or team request">Guardian or team request</option><option value="Room capacity or staffing">Room capacity or staffing</option><option value="Other approved placement">Other approved placement</option></select></label>}{chosen && <small className={overridden ? "placement-note override" : "placement-note"}>{overridden ? "Different from registered group · " : ""}{chosen.roomName}</small>}</div>}{alerts.length > 0 && <span className="safety-alert"><AlertTriangle size={16} />{alerts.join(" · ")}</span>}</article>; })}</div> : <Card className="empty-card"><Check size={40} /><h2>{props.mode === "CHECK_IN" ? "No children available" : "No children currently checked in"}</h2><p>Return to the ready station for the next family.</p></Card>}{props.mode === "CHECK_OUT" && props.selected.length > 0 && <Card className="release-card"><h2>Who is picking up?</h2><p>Only guardians authorized for every selected child are shown.</p>{props.eligibleGuardians.length ? <div className="guardian-options">{props.eligibleGuardians.map((guardian) => <label key={guardian.id}><input type="radio" name="guardian" checked={props.guardianId === guardian.id} onChange={() => props.setGuardianId(guardian.id)} /><span><strong>{guardian.fullName}</strong><small>{guardian.relationship}</small></span></label>)}</div> : <div className="form-error">No single guardian is authorized for every selected child. Release separately or call the guardian and escalate to the designated lead.</div>}<label className="verify-check"><input type="checkbox" checked={props.verified} onChange={(event) => props.setVerified(event.target.checked)} /><span><strong>I verified the presenting person</strong><small>I confirmed their identity and matched them to the selected authorized guardian. A pass alone is not authorization.</small></span></label><div className="field"><label htmlFor="checkout-note">Checkout note <span>(optional)</span></label><textarea id="checkout-note" maxLength={300} value={props.note} onChange={(event) => props.setNote(event.target.value)} placeholder="Only add a concise operational note when needed" /></div><div className="delegate-guidance"><AlertTriangle /><span><strong>Unexpected delegate?</strong> Do not release through this ordinary flow. Ask the designated lead to call a stored guardian, record one-time approval, and verify ID.</span></div></Card>}<div className="commit-bar"><div><strong>{props.selected.length}</strong> selected</div><Button disabled={props.busy || !props.selected.length || (props.mode === "CHECK_OUT" && (!props.guardianId || !props.verified)) || placementMissing || reasonMissing} onClick={props.commit}>{props.busy ? "Saving safely…" : props.mode === "CHECK_IN" ? "Confirm check-in" : "Confirm authorized release"}</Button></div></div>;
}
