"use client";
import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Check, ChevronRight, KeyRound, QrCode, Search, ShieldCheck, Users } from "lucide-react";
import { Button, Card, StatusChip } from "@kcl/ui";
import {
  checkInChildren,
  checkOutChildren,
  getOperationalFamilyByHousehold,
  resolveOperationalFamily,
  searchOperationalFamilies,
  useAuthAccess,
  type CheckMethod,
  type OperationalFamily
} from "@kcl/firebase";
import type { Attendance, Household, ServiceSession } from "@kcl/types";
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

  function reset(nextMode = mode) {
    setMode(nextMode);
    setStage("READY");
    setFamily(null);
    setSelected([]);
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
        const result = await checkInChildren(member, activeContext, family, selected, method);
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
      setError(code === "ROOM_ASSIGNMENT_MISSING" ? "A selected child has no room assignment. Ask the Ministry Lead before check-in." : code === "GUARDIAN_NOT_AUTHORIZED" || code === "RELEASE_NOT_VERIFIED" ? "Select an authorized guardian and confirm identity before release." : code === "SESSION_NOT_OPEN" ? "This service is no longer open. Return to service selection." : "The attendance update did not complete. Nothing should be assumed—check the current attendance and retry.");
    } finally { setBusy(false); }
  }

  if (stage === "SUCCESS") {
    return <div className="success-screen"><div className="success-mark"><Check size={52} /></div><p className="eyebrow">{mode === "CHECK_IN" ? "Check-in complete" : "Check-out complete"}</p><h1>{family?.household.householdName}</h1><p>{successText}</p><Button onClick={() => reset()}>Next family</Button></div>;
  }

  if (stage === "FAMILY" && family) {
    return <FamilyConfirmation mode={mode} family={family} selected={selected} setSelected={setSelected} checkedInByChild={checkedInByChild} assignments={context.roomAssignments} eligibleGuardians={eligibleGuardians} guardianId={guardianId} setGuardianId={setGuardianId} verified={verified} setVerified={setVerified} note={note} setNote={setNote} busy={busy} error={error} back={() => reset()} commit={() => void commit()} />;
  }

  const currentCount = operations.attendance.filter((record) => record.status === "CHECKED_IN").length;
  return <><section className="ready-hero"><div className="service-line"><StatusChip tone="success">Open</StatusChip><span>{context.session.scheduleName} · {context.session.localServiceDate}</span></div><h1>{mode === "CHECK_IN" ? "Ready to check in" : "Ready to check out"}</h1><p>{mode === "CHECK_IN" ? "Scan the family pass, then confirm the children attending." : "Scan the same pass, then verify the authorized guardian before release."}</p><div className="mode-switch"><button className={mode === "CHECK_IN" ? "active" : ""} onClick={() => reset("CHECK_IN")}>Check-in</button><button className={mode === "CHECK_OUT" ? "active" : ""} onClick={() => reset("CHECK_OUT")}>Check-out</button></div></section>{!operations.online && <div className="offline-banner"><AlertTriangle /><span><strong>Connection required</strong> Attendance actions are disabled until this station reconnects.</span></div>}{error && <div className="form-error" role="alert">{error}</div>}<div className="station-grid"><Card className="scan-card"><div className="scan-icon"><QrCode size={44} /></div><h2>Scan Family QR</h2><p>Camera access starts only when you tap below.</p><Button disabled={!operations.online || busy} onClick={() => setScannerOpen(true)}><QrCode /> Start scanner</Button><div className="key-entry"><span>or enter the Family Key</span><form onSubmit={(event) => { event.preventDefault(); void resolveKey(key, "MANUAL"); }}><input aria-label="Family Key" placeholder="KCL-XXXXX-XXXXX-XXXX" value={key} onChange={(event) => setKey(event.target.value)} /><Button variant="secondary" disabled={!key.trim() || busy}><KeyRound size={18} /> Find</Button></form></div></Card><Card className="manual-card"><div className="card-title"><Search /><div><h2>Manual family search</h2><p>Use a full household, guardian, or child name.</p></div></div><form className="search-form" onSubmit={(event) => void search(event)}><input placeholder="e.g. Santos Family" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /><Button variant="secondary" disabled={searching || !operations.online}>{searching ? "Searching…" : "Search"}</Button></form>{searchResults.length > 0 && <div className="search-results">{searchResults.map((household) => <button key={household.id} onClick={() => void chooseSearchResult(household.id)}><span><strong>{household.householdName}</strong><small>{household.childIds?.length || 0} registered children</small></span><ChevronRight /></button>)}</div>}</Card></div><div className="station-summary"><span><Users size={20} /><strong>{currentCount}</strong> children currently checked in</span><button onClick={operations.leaveSession}>Change service</button></div>{scannerOpen && <QrScanner onRead={(value) => void resolveKey(value, "QR")} onClose={() => setScannerOpen(false)} />}</>;
}

function ServiceSelector({ sessions, loading, selecting, select }: { sessions: ServiceSession[]; loading: boolean; selecting: boolean; select(session: ServiceSession): Promise<void> }) {
  const open = sessions.filter((session) => session.status === "OPEN").sort((a, b) => b.localServiceDate.localeCompare(a.localServiceDate));
  return <div className="service-select"><p className="eyebrow">Sunday station</p><h1>Choose an open service</h1><p>Join the service prepared by your Ministry Lead. The date suggestion is never selected automatically.</p>{loading ? <div className="loading"><div className="spinner" />Loading services…</div> : open.length ? <div className="service-list">{open.map((session) => <Card key={session.id} className="service-card"><div><StatusChip tone="success">Open</StatusChip><h2>{session.scheduleName}</h2><p>{session.localServiceDate}{session.scheduleStartTime ? ` · ${session.scheduleStartTime}` : ""}</p></div><Button disabled={selecting} onClick={() => void select(session)}>Join service <ChevronRight /></Button></Card>)}</div> : <Card className="empty-card"><Users size={42} /><h2>No open service</h2><p>Ask a Ministry Lead to open today’s service and configure its room assignments.</p></Card>}</div>;
}

type FamilyConfirmationProps = {
  mode: Mode; family: OperationalFamily; selected: string[]; setSelected(value: string[]): void;
  checkedInByChild: Map<string, Attendance>; assignments: Array<{ groupId: string; roomName: string }>;
  eligibleGuardians: OperationalFamily["guardians"]; guardianId: string; setGuardianId(value: string): void;
  verified: boolean; setVerified(value: boolean): void; note: string; setNote(value: string): void;
  busy: boolean; error: string; back(): void; commit(): void;
};

function FamilyConfirmation(props: FamilyConfirmationProps) {
  const availableChildren = props.mode === "CHECK_IN" ? props.family.children.filter((child) => child.active) : props.family.children.filter((child) => props.checkedInByChild.get(child.id)?.status === "CHECKED_IN");
  const toggle = (childId: string, enabled: boolean) => props.setSelected(enabled ? [...props.selected, childId] : props.selected.filter((id) => id !== childId));
  const roomMissing = props.mode === "CHECK_IN" && props.selected.some((childId) => !props.assignments.some((item) => item.groupId === props.family.children.find((child) => child.id === childId)?.ministryGroupId));
  return <div className="confirmation"><button className="back-link" onClick={props.back}>← Cancel and clear family</button><div className="confirmation-head"><div><p className="eyebrow">{props.mode === "CHECK_IN" ? "Confirm attendance" : "Verify release"}</p><h1>{props.family.household.householdName}</h1><p>{props.mode === "CHECK_IN" ? "Select the children attending and confirm their assigned rooms." : "Select children being released, then identify an authorized guardian."}</p></div><ShieldCheck size={42} /></div>{props.error && <div className="form-error" role="alert">{props.error}</div>}{availableChildren.length ? <div className="child-options">{availableChildren.map((child) => { const existing = props.checkedInByChild.get(child.id); const assignment = props.assignments.find((item) => item.groupId === child.ministryGroupId); const disabled = props.mode === "CHECK_IN" && Boolean(existing); const alerts = [child.allergies && `Allergies: ${child.allergies}`, child.medicalNotes && "Medical information recorded", child.assistanceNotes && "Assistance needs recorded"].filter(Boolean); return <label key={child.id} className={`child-option ${disabled ? "disabled" : ""}`}><input type="checkbox" checked={props.selected.includes(child.id) && !disabled} disabled={disabled} onChange={(event) => toggle(child.id, event.target.checked)} /><span className="child-main"><strong>{child.preferredName || child.firstName} {child.lastName}</strong><small>{disabled ? `Already ${existing?.status.toLowerCase().replace("_", " ")}` : assignment ? `Room: ${assignment.roomName}` : "No room assignment — check-in blocked"}</small>{alerts.length > 0 && <span className="safety-alert"><AlertTriangle size={16} />{alerts.join(" · ")}</span>}</span></label>; })}</div> : <Card className="empty-card"><Check size={40} /><h2>{props.mode === "CHECK_IN" ? "No children available" : "No children currently checked in"}</h2><p>Return to the ready station for the next family.</p></Card>}{props.mode === "CHECK_OUT" && props.selected.length > 0 && <Card className="release-card"><h2>Who is picking up?</h2><p>Only guardians authorized for every selected child are shown.</p>{props.eligibleGuardians.length ? <div className="guardian-options">{props.eligibleGuardians.map((guardian) => <label key={guardian.id}><input type="radio" name="guardian" checked={props.guardianId === guardian.id} onChange={() => props.setGuardianId(guardian.id)} /><span><strong>{guardian.fullName}</strong><small>{guardian.relationship}</small></span></label>)}</div> : <div className="form-error">No single guardian is authorized for every selected child. Release separately or call the guardian and escalate to the designated lead.</div>}<label className="verify-check"><input type="checkbox" checked={props.verified} onChange={(event) => props.setVerified(event.target.checked)} /><span><strong>I verified the presenting person</strong><small>I confirmed their identity and matched them to the selected authorized guardian. A pass alone is not authorization.</small></span></label><div className="field"><label htmlFor="checkout-note">Checkout note <span>(optional)</span></label><textarea id="checkout-note" maxLength={300} value={props.note} onChange={(event) => props.setNote(event.target.value)} placeholder="Only add a concise operational note when needed" /></div><div className="delegate-guidance"><AlertTriangle /><span><strong>Unexpected delegate?</strong> Do not release through this ordinary flow. Ask the designated lead to call a stored guardian, record one-time approval, and verify ID.</span></div></Card>}<div className="commit-bar"><div><strong>{props.selected.length}</strong> selected</div><Button disabled={props.busy || !props.selected.length || (props.mode === "CHECK_OUT" && (!props.guardianId || !props.verified)) || roomMissing} onClick={props.commit}>{props.busy ? "Saving safely…" : props.mode === "CHECK_IN" ? "Confirm check-in" : "Confirm authorized release"}</Button></div></div>;
}
