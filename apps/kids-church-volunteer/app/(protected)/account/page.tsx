"use client";
import { AlertTriangle, LogOut, ShieldCheck } from "lucide-react";
import { Button, Card, StatusChip } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";
import { useVolunteerOperations } from "@/components/volunteer-context";

export default function AccountPage() {
  const { member, user, signOutUser } = useAuthAccess();
  const { sessionContext, leaveSession } = useVolunteerOperations();
  return <div className="operational-page"><div className="page-head"><div><p className="eyebrow">Account & guidance</p><h1>More</h1><p>Your station identity and child-safety reminders.</p></div></div><div className="account-grid"><Card className="account-card"><div className="account-person"><span className="large-avatar">{member?.displayName.charAt(0) || "V"}</span><div><h2>{member?.displayName}</h2><p>{user?.email}</p><StatusChip tone="success">Kids Church Volunteer</StatusChip></div></div><dl><div><dt>Current service</dt><dd>{sessionContext?.session.scheduleName || "Not selected"}</dd></div><div><dt>Service date</dt><dd>{sessionContext?.session.localServiceDate || "—"}</dd></div></dl>{sessionContext && <Button variant="secondary" onClick={leaveSession}>Change service</Button>}<Button variant="ghost" onClick={() => void signOutUser()}><LogOut /> Sign out</Button></Card><Card className="guidance-card"><div className="guidance-title"><ShieldCheck /><h2>Checkout guidelines</h2></div><ol><li>Scan the Family Pass only to find the family.</li><li>Select the children being released.</li><li>Choose a guardian authorized for every selected child.</li><li>Verify that person’s identity before confirming release.</li></ol><div className="delegate-guidance"><AlertTriangle /><span><strong>If another person arrives:</strong> pause checkout, involve the designated lead, call a guardian using the stored number, record session-only approval, and verify ID. If verification fails, do not release the child.</span></div><p className="version">KidsChurchLog Sunday Team · version 0.1.0</p></Card></div></div>;
}
