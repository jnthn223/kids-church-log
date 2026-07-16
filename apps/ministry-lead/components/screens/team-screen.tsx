"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Card, EmptyState, StatusChip } from "@kcl/ui";
import {
  approveAccessRequest,
  renewMembership,
  setMembershipStatus,
  useAuthAccess,
  useMinistryCollection
} from "@kcl/firebase";
import type { AccessRequest, MinistryMember, MinistryRole } from "@kcl/types";
import { daysFromNow, formatDate, formatDateTime, isExpired } from "@kcl/utils";
import { DataTable, membershipStatusTone, ScreenLoading } from "./shared";

type AccessAction = "approve" | "renew" | "suspend";

export function TeamScreen() {
  const { member: actor } = useAuthAccess();
  const members = useMinistryCollection<MinistryMember>("members");
  const requests = useMinistryCollection<AccessRequest>("accessRequests");
  const [selected, setSelected] = useState<AccessRequest | MinistryMember | null>(null);
  const [action, setAction] = useState<AccessAction | null>(null);

  const pendingRequests = requests.data.filter((request) => request.status === "PENDING");
  const activeLeads = members.data.filter(
    (member) =>
      member.status === "ACTIVE" &&
      !isExpired(member.expiresAt) &&
      member.roles?.includes("MINISTRY_LEAD")
  );

  function openModal(target: AccessRequest | MinistryMember, nextAction: AccessAction) {
    setSelected(target);
    setAction(nextAction);
  }

  function closeModal() {
    setSelected(null);
    setAction(null);
  }

  if (!actor || members.loading || requests.loading) return <ScreenLoading />;

  return (
    <>
      {activeLeads.length < 2 && (
        <Card className="critical">
          <AlertTriangle />
          <div>
            <h3>Add another Ministry Lead</h3>
            <p>
              Continuity policy requires at least two active and unexpired Leads. Ministry Lead
              grants always require a separate warned review.
            </p>
          </div>
        </Card>
      )}

      <Card className="section">
        <div className="section-head">
          <h3>Pending requests</h3>
          <StatusChip tone={pendingRequests.length ? "warning" : "neutral"}>
            {pendingRequests.length} pending
          </StatusChip>
        </div>
        {pendingRequests.length ? (
          <DataTable headers={["Person", "Ministry context", "Requested", "Action"]}>
            {pendingRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <strong>{request.displayName || "Unnamed user"}</strong><br />
                  <small className="muted">{request.email}</small>
                </td>
                <td>
                  <strong>{request.ministryResponsibility || "Not provided"}</strong><br />
                  <small className="muted">{request.requestReason || "No reason supplied"}</small>
                </td>
                <td>{formatDateTime(request.requestedAt)}</td>
                <td><Button onClick={() => openModal(request, "approve")}>Review</Button></td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            title="No pending requests"
            description="Authentication never grants access automatically."
          />
        )}
      </Card>

      <Card className="section">
        <div className="section-head"><h3>Current team</h3></div>
        {!members.data.length ? (
          <EmptyState
            title="No membership records"
            description="Provision the first Ministry Lead manually in Firebase Console."
          />
        ) : (
          <DataTable headers={["Person", "Roles", "Status", "Expires", "Actions"]}>
            {members.data.map((member) => (
              <tr key={member.id}>
                <td>
                  <strong>{member.displayName}</strong><br />
                  <small className="muted">{member.email}</small>
                </td>
                <td>
                  {(member.roles || []).map((role) => (
                    <StatusChip key={role} tone={role === "MINISTRY_LEAD" ? "info" : "neutral"}>
                      {role.replaceAll("_", " ")}
                    </StatusChip>
                  ))}
                </td>
                <td>
                  <StatusChip tone={membershipStatusTone(member)}>
                    {isExpired(member.expiresAt) ? "EXPIRED" : member.status}
                  </StatusChip>
                </td>
                <td>{formatDate(member.expiresAt)}</td>
                <td>
                  <div className="row-actions">
                    <Button
                      variant="ghost"
                      disabled={member.userId === actor.userId}
                      onClick={() => openModal(member, "renew")}
                    >
                      Renew
                    </Button>
                    <Button
                      variant="danger"
                      disabled={member.userId === actor.userId}
                      onClick={() => openModal(member, "suspend")}
                    >
                      Suspend
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      {selected && action && (
        <AccessModal actor={actor} target={selected} action={action} close={closeModal} />
      )}
    </>
  );
}

function AccessModal({
  actor,
  target,
  action,
  close
}: {
  actor: MinistryMember;
  target: AccessRequest | MinistryMember;
  action: AccessAction;
  close: () => void;
}) {
  const initialRoles: MinistryRole[] =
    action === "approve" ? [] : (target as MinistryMember).roles || [];
  const [roles, setRoles] = useState<MinistryRole[]>(initialRoles);
  const [expiry, setExpiry] = useState(
    daysFromNow(initialRoles.includes("MINISTRY_LEAD") ? 150 : 330)
      .toISOString()
      .slice(0, 10)
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const leadAccess = roles.includes("MINISTRY_LEAD");
  const showRoleChoices = action === "approve" || (action === "renew" && !initialRoles.length);
  const maximumDays = leadAccess ? 180 : 365;
  const maximumInputDate = daysFromNow(maximumDays - 1).toISOString().slice(0, 10);
  const minimumInputDate = daysFromNow(1).toISOString().slice(0, 10);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (reason.trim().length < 5) {
      setError("Give a reason of at least 5 characters.");
      return;
    }
    if (action !== "suspend" && !roles.length) {
      setError("Choose at least one role.");
      return;
    }

    const expiration = new Date(`${expiry}T23:59:59`);
    if (Number.isNaN(expiration.getTime()) || expiration <= new Date()) {
      setError("Choose a future access-expiry date.");
      return;
    }
    if (expiration.getTime() > Date.now() + maximumDays * 86_400_000) {
      setError(
        `Choose an expiry within ${maximumDays} days for ${leadAccess ? "Ministry Lead" : "volunteer"} access.`
      );
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (action === "approve") {
        await approveAccessRequest(actor, target as AccessRequest, roles, expiration, reason);
      } else if (action === "renew") {
        await renewMembership(actor, target as MinistryMember, roles, expiration, reason);
      } else {
        await setMembershipStatus(actor, target as MinistryMember, "SUSPENDED", reason);
      }
      close();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The access change could not be completed."
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleRole(role: MinistryRole) {
    setRoles((currentRoles) => {
      const nextRoles = currentRoles.includes(role)
        ? currentRoles.filter((currentRole) => currentRole !== role)
        : [...currentRoles, role];

      if (role === "MINISTRY_LEAD" && nextRoles.includes(role)) {
        setExpiry(daysFromNow(150).toISOString().slice(0, 10));
        setError("");
      }
      return nextRoles;
    });
  }

  const title =
    action === "approve"
      ? "Review access request"
      : action === "renew"
        ? "Renew membership"
        : "Suspend access";

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <p>{target.displayName} · {target.email}</p>

        {action === "approve" && "ministryResponsibility" in target && (
          <div className="impact-note">
            <strong>{target.ministryResponsibility || "Responsibility not provided"}</strong>
            <span>{target.requestReason || "No request reason supplied."}</span>
          </div>
        )}
        {action === "renew" && !initialRoles.length && (
          <div className="impact-note">
            <strong>Role recovery required</strong>
            <span>
              This membership was suspended by an older flow that removed its roles. Choose the
              role or roles to restore.
            </span>
          </div>
        )}
        {error && <div className="form-error" role="alert">{error}</div>}

        {showRoleChoices && (
          <div className="checkboxes">
            {(["ADMIN_VOLUNTEER", "KIDS_CHURCH_VOLUNTEER", "MINISTRY_LEAD"] as MinistryRole[])
              .map((role) => (
                <label className="check" key={role}>
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  <span>
                    <strong>{role.replaceAll("_", " ")}</strong>
                    {role === "MINISTRY_LEAD" && (
                      <small className="muted">
                        {" "}— Broad access; keep at least two and require 2-Step Verification.
                      </small>
                    )}
                  </span>
                </label>
              ))}
          </div>
        )}

        {action !== "suspend" && (
          <div className="field">
            <label htmlFor="expiry">Access expires</label>
            <input
              id="expiry"
              type="date"
              required
              min={minimumInputDate}
              max={maximumInputDate}
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            />
            <small className="muted">
              {leadAccess
                ? "Ministry Lead access defaults to 150 days and cannot exceed 180 days."
                : "Volunteer access cannot exceed 365 days."}
            </small>
          </div>
        )}

        <div className="field">
          <label htmlFor="reason">Reason</label>
          <textarea
            id="reason"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this access decision appropriate?"
          />
        </div>
        <div className="modal-actions">
          <Button variant="ghost" type="button" onClick={close}>Cancel</Button>
          <Button variant={action === "suspend" ? "danger" : "primary"} disabled={busy}>
            {busy ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </form>
    </div>
  );
}
