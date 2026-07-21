"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, LogOut, ShieldCheck, X } from "lucide-react";
import { Button, Card, StatusChip } from "@kcl/ui";
import { closeServiceSession, useAuthAccess } from "@kcl/firebase";
import { useVolunteerOperations } from "@/components/volunteer-context";

type SessionSummary = {
  serviceName: string;
  serviceDate: string;
  childrenServed: number;
  familiesServed: number;
  releasesCompleted: number;
};

export default function AccountPage() {
  const { member, user, signOutUser } = useAuthAccess();
  const { sessionContext, attendance, online, leaveSession } = useVolunteerOperations();
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const currentlyCheckedIn = attendance.filter((record) => record.status === "CHECKED_IN");

  async function closeService() {
    if (!member || !sessionContext || currentlyCheckedIn.length || !acknowledged) return;
    const nextSummary: SessionSummary = {
      serviceName: sessionContext.session.scheduleName,
      serviceDate: sessionContext.session.localServiceDate,
      childrenServed: attendance.length,
      familiesServed: new Set(attendance.map((record) => record.householdId)).size,
      releasesCompleted: attendance.filter((record) => record.status === "CHECKED_OUT").length
    };
    setClosing(true);
    setError("");
    try {
      await closeServiceSession(member, sessionContext.session.id, attendance, "KIDS_CHURCH_VOLUNTEER");
      setSummary(nextSummary);
      setConfirmingClose(false);
      leaveSession();
    } catch (value) {
      const code = value instanceof Error ? value.message : "";
      const firebaseCode = typeof value === "object" && value && "code" in value ? String(value.code) : "";
      setError(code === "CHILDREN_STILL_CHECKED_IN"
        ? "Every child must be checked out before this service can close."
        : code === "SESSION_NOT_OPEN"
        ? "This service was already closed at another station."
        : firebaseCode.includes("permission-denied")
        ? "Firestore blocked closing this service. Deploy the latest rules and retry."
        : "The service could not be closed. Nothing changed; check the connection and retry.");
    } finally {
      setClosing(false);
    }
  }

  if (summary) {
    return <div className="operational-page close-summary"><div className="success-mark"><Check size={52} /></div><p className="eyebrow">Service closed safely</p><h1>Thank you, {member?.displayName?.split(" ")[0] || "volunteer"}!</h1><p>Your care and attention helped every family move through today’s service safely. The service record remains available to the team.</p><Card className="session-summary-card"><h2>{summary.serviceName}</h2><p>{summary.serviceDate}</p><div className="session-summary-grid"><div><strong>{summary.childrenServed}</strong><span>children served</span></div><div><strong>{summary.familiesServed}</strong><span>families welcomed</span></div><div><strong>{summary.releasesCompleted}</strong><span>releases completed</span></div></div></Card><div className="close-summary-actions"><Link className="button button-primary" href="/attendance/">View attendance</Link><button className="button button-secondary" onClick={leaveSession}>Choose another service</button></div></div>;
  }

  const closed = sessionContext?.session.status === "CLOSED";
  return <div className="operational-page"><div className="page-head"><div><p className="eyebrow">Account & guidance</p><h1>More</h1><p>Your station identity and child-safety reminders.</p></div></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="account-grid"><Card className="account-card"><div className="account-person"><span className="large-avatar">{member?.displayName.charAt(0) || "V"}</span><div><h2>{member?.displayName}</h2><p>{user?.email}</p><StatusChip tone="success">Kids Church Volunteer</StatusChip></div></div><dl><div><dt>{closed ? "Selected service" : "Current service"}</dt><dd>{sessionContext?.session.scheduleName || "Not selected"}</dd></div><div><dt>Service date</dt><dd>{sessionContext?.session.localServiceDate || "—"}</dd></div>{sessionContext && <div><dt>Status</dt><dd>{closed ? "Closed · read only" : "Open"}</dd></div>}{sessionContext && !closed && <div><dt>Children still checked in</dt><dd>{currentlyCheckedIn.length}</dd></div>}</dl>{sessionContext && <Button variant="secondary" onClick={leaveSession}>Change service</Button>}{sessionContext && !closed && <Button variant="danger" disabled={!online} onClick={() => { setAcknowledged(false); setError(""); setConfirmingClose(true); }}>Close service</Button>}<Button variant="ghost" onClick={() => void signOutUser()}><LogOut /> Sign out</Button></Card><Card className="guidance-card"><div className="guidance-title"><ShieldCheck /><h2>Checkout guidelines</h2></div><ol><li>Scan the Family Pass only to find the family.</li><li>Select the children being released.</li><li>Choose a guardian authorized for every selected child.</li><li>Verify that person’s identity before confirming release.</li></ol><div className="delegate-guidance"><AlertTriangle /><span><strong>If another person arrives:</strong> pause checkout, involve the designated lead, call a guardian using the stored number, record session-only approval, and verify ID. If verification fails, do not release the child.</span></div><p className="version">KidsChurchLog Sunday Team · version 0.1.0</p></Card></div>{confirmingClose && sessionContext && <div className="close-service-backdrop" role="dialog" aria-modal="true" aria-labelledby="close-service-title"><Card className="close-service-dialog"><div className="close-service-head"><div><p className="eyebrow">End service operations</p><h2 id="close-service-title">Close {sessionContext.session.scheduleName}?</h2></div><Button variant="ghost" aria-label="Cancel closing service" disabled={closing} onClick={() => setConfirmingClose(false)}><X /></Button></div><p>Closing ends check-in and checkout at every station. This action is recorded in the audit log.</p><div className="close-service-totals"><div><strong>{attendance.length}</strong><span>children served</span></div><div className={currentlyCheckedIn.length ? "unsafe" : "safe"}><strong>{currentlyCheckedIn.length}</strong><span>still checked in</span></div></div>{currentlyCheckedIn.length ? <div className="form-error"><AlertTriangle /><span><strong>Service cannot close yet.</strong> Check out every child before ending operations.</span></div> : <label className="close-acknowledgement"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span><strong>All children have been safely released</strong><small>I reviewed current attendance and confirm this service can close.</small></span></label>}<div className="mapping-actions"><Button variant="ghost" disabled={closing} onClick={() => setConfirmingClose(false)}>Keep service open</Button><Button variant="danger" disabled={closing || currentlyCheckedIn.length > 0 || !acknowledged} onClick={() => void closeService()}>{closing ? "Closing safely…" : "Close service"}</Button></div></Card></div>}</div>;
}
