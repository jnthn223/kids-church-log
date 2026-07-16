import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData
} from "firebase/firestore";
import type { AccessRequest, MinistryMember, MinistryRole } from "@kcl/types";
import { auditRef } from "./audit";
import { getFirebaseDb, ministryId } from "./client";

export async function approveAccessRequest(
  actor: MinistryMember,
  request: AccessRequest,
  roles: MinistryRole[],
  expiresAt: Date,
  reason: string
) {
  if (actor.userId === request.uid) {
    throw new Error("You cannot approve or elevate yourself.");
  }

  const db = getFirebaseDb();
  const memberRef = doc(db, "ministries", ministryId, "members", request.uid);
  const requestRef = doc(db, "ministries", ministryId, "accessRequests", request.uid);
  const governanceRef = doc(db, "ministries", ministryId, "settings", "accessGovernance");

  await runTransaction(db, async (transaction) => {
    const governance = await transaction.get(governanceRef);
    const assignedLeadIds: string[] = governance.data()?.assignedMinistryLeadIds || [];
    if (roles.includes("MINISTRY_LEAD") && !assignedLeadIds.includes(request.uid)) {
      assignedLeadIds.push(request.uid);
    }

    transaction.set(
      memberRef,
      {
        userId: request.uid,
        displayName: request.displayName,
        email: request.email,
        roles,
        status: "ACTIVE",
        termStartAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        lastReviewedBy: actor.userId,
        lastReviewedAt: serverTimestamp(),
        reviewOutcome: "APPROVED",
        approvedBy: actor.userId,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: actor.userId
      },
      { merge: true }
    );
    transaction.update(requestRef, {
      status: "APPROVED",
      reviewedAt: serverTimestamp(),
      reviewedBy: actor.userId
    });

    if (roles.includes("MINISTRY_LEAD")) {
      transaction.set(
        governanceRef,
        {
          assignedMinistryLeadIds: assignedLeadIds,
          minimumActiveLeadTarget: governance.data()?.minimumActiveLeadTarget || 2,
          leadReviewIntervalDays: governance.data()?.leadReviewIntervalDays || 180,
          accessReviewWarningDays: 30,
          updatedAt: serverTimestamp(),
          updatedBy: actor.userId
        },
        { merge: true }
      );
    }

    transaction.set(auditRef(db), {
      eventType: "MEMBERSHIP_APPROVED",
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: "members",
      targetId: request.uid,
      timestamp: serverTimestamp(),
      reason,
      applicationSource: "MINISTRY_LEAD"
    });
  });
}

export async function renewMembership(
  actor: MinistryMember,
  target: MinistryMember,
  roles: MinistryRole[],
  expiresAt: Date,
  reason: string
) {
  if (actor.userId === target.userId) {
    throw new Error("You cannot renew your own membership.");
  }
  if (!roles.length) {
    throw new Error("Choose at least one role before renewing access.");
  }

  const db = getFirebaseDb();
  await runTransaction(db, async (transaction) => {
    const governanceRef = doc(db, "ministries", ministryId, "settings", "accessGovernance");
    const governance = await transaction.get(governanceRef);
    const assignedLeadIds: string[] = governance.data()?.assignedMinistryLeadIds || [];
    const nextAssignedLeadIds = roles.includes("MINISTRY_LEAD")
      ? [...new Set([...assignedLeadIds, target.userId])]
      : assignedLeadIds.filter((uid) => uid !== target.userId);

    transaction.update(governanceRef, {
      assignedMinistryLeadIds: nextAssignedLeadIds,
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    });
    transaction.update(doc(db, "ministries", ministryId, "members", target.userId), {
      roles,
      status: "ACTIVE",
      expiresAt: Timestamp.fromDate(expiresAt),
      lastReviewedBy: actor.userId,
      lastReviewedAt: serverTimestamp(),
      reviewOutcome: "RENEWED",
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    });
    transaction.set(auditRef(db), {
      eventType: "MEMBERSHIP_RENEWED",
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: "members",
      targetId: target.userId,
      timestamp: serverTimestamp(),
      reason,
      applicationSource: "MINISTRY_LEAD"
    });
  });
}

export async function setMembershipStatus(
  actor: MinistryMember,
  target: MinistryMember,
  status: "SUSPENDED" | "REVOKED",
  reason: string
) {
  if (actor.userId === target.userId) {
    throw new Error("You cannot change your own membership.");
  }

  const db = getFirebaseDb();
  await runTransaction(db, async (transaction) => {
    const update: DocumentData = {
      status,
      [`${status.toLowerCase()}By`]: actor.userId,
      [`${status.toLowerCase()}At`]: serverTimestamp(),
      [`${status.toLowerCase()}Reason`]: reason,
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    };

    if (target.roles.includes("MINISTRY_LEAD")) {
      const governanceRef = doc(db, "ministries", ministryId, "settings", "accessGovernance");
      const governance = await transaction.get(governanceRef);
      const remainingLeadIds: string[] = (governance.data()?.assignedMinistryLeadIds || [])
        .filter((uid: string) => uid !== target.userId);

      if (!remainingLeadIds.length) {
        throw new Error("The final assigned Ministry Lead cannot be suspended through the application.");
      }
      transaction.update(governanceRef, {
        assignedMinistryLeadIds: remainingLeadIds,
        updatedAt: serverTimestamp(),
        updatedBy: actor.userId
      });
    }

    transaction.update(
      doc(db, "ministries", ministryId, "members", target.userId),
      update
    );
    transaction.set(auditRef(db), {
      eventType: `MEMBERSHIP_${status}`,
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: "members",
      targetId: target.userId,
      timestamp: serverTimestamp(),
      reason,
      applicationSource: "MINISTRY_LEAD"
    });
  });
}
