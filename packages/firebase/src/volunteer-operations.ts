import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";
import type {
  Attendance,
  Child,
  Guardian,
  Household,
  MinistryMember,
  RoomAssignment,
  ServiceSession,
  VolunteerAssignment
} from "@kcl/types";
import { getFirebaseDb, ministryId } from "./client";
import { hashFamilyKey } from "./family-registration";

export type CheckMethod = "QR" | "MANUAL" | "NFC";

export type OperationalFamily = {
  household: Household;
  children: Child[];
  guardians: Guardian[];
  passHash: string;
};

export type SessionContext = {
  session: ServiceSession;
  roomAssignments: RoomAssignment[];
  volunteerAssignments: VolunteerAssignment[];
};

export type ApplicationSource = "MINISTRY_LEAD" | "KIDS_CHURCH_VOLUNTEER";

export type OpenServiceInput = {
  localServiceDate: string;
  scheduleId: string;
  scheduleName: string;
  scheduleStartTime?: string;
  sessionKind: "SCHEDULED" | "ON_DEMAND";
  stationName?: string;
};

export type SessionRoomMappingInput = {
  groupId: string;
  groupName: string;
  roomId: string;
  roomName: string;
  capacity?: number;
};

export type CheckInPlacementInput = {
  childId: string;
  groupId: string;
  overrideReason?: string;
};

export type VolunteerServingAreaInput = {
  groupId: string;
  roomId: string;
  servingAreaLabel: string;
};

function serviceSessionId(input: OpenServiceInput) {
  const safeScheduleId = input.scheduleId
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${input.localServiceDate}_${safeScheduleId}`;
}

export async function openServiceSession(
  actor: MinistryMember,
  input: OpenServiceInput,
  applicationSource: ApplicationSource,
  mappings: SessionRoomMappingInput[] = [],
  servingArea: VolunteerServingAreaInput = {
    groupId: "",
    roomId: "",
    servingAreaLabel: "Check-in / service-wide"
  }
) {
  if (applicationSource === "KIDS_CHURCH_VOLUNTEER" && !mappings.length) {
    throw new Error("ROOM_MAPPINGS_REQUIRED");
  }
  if (new Set(mappings.map((mapping) => mapping.groupId)).size !== mappings.length) {
    throw new Error("DUPLICATE_GROUP_MAPPING");
  }
  const db = getFirebaseDb();
  const sessionId = serviceSessionId(input);
  const sessionRef = doc(
    db,
    "ministries",
    ministryId,
    "serviceSessions",
    sessionId
  );
  const auditRef = doc(collection(db, "ministries", ministryId, "auditLogs"));

  const result = await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(sessionRef);
    if (existing.exists()) {
      const session = { id: existing.id, ...existing.data() } as ServiceSession;
      if (session.status === "OPEN") return { session, created: false };
      if (session.status === "CLOSED") throw new Error("SERVICE_SESSION_CLOSED");
      if (session.status === "CANCELLED") throw new Error("SERVICE_SESSION_CANCELLED");
      throw new Error("SERVICE_SESSION_ALREADY_FINISHED");
    }

    const session: Omit<ServiceSession, "id"> = {
      localServiceDate: input.localServiceDate,
      scheduleId: input.scheduleId,
      scheduleName: input.scheduleName.trim(),
      scheduleStartTime: input.scheduleStartTime || "",
      sessionKind: input.sessionKind,
      status: "OPEN",
      openedAt: serverTimestamp(),
      openedBy: actor.userId,
      stationName: input.stationName?.trim() || "",
      revision: 0
    };
    transaction.set(sessionRef, {
      ...session,
      createdAt: serverTimestamp(),
      createdBy: actor.userId,
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    });
    mappings.forEach((mapping) => {
      transaction.set(doc(sessionRef, "roomAssignments", mapping.groupId), {
        ...mapping,
        capacity: mapping.capacity || null,
        active: true,
        updatedAt: serverTimestamp(),
        updatedBy: actor.userId
      });
    });
    transaction.set(doc(sessionRef, "volunteerAssignments", actor.userId), {
      memberUid: actor.userId,
      displayName: actor.displayName,
      assignmentRole: "Service opener",
      groupId: servingArea.groupId,
      roomId: servingArea.roomId,
      servingAreaLabel: servingArea.servingAreaLabel,
      active: true,
      joinedAt: serverTimestamp(),
      joinedBy: actor.userId
    });
    transaction.set(auditRef, {
      eventType: "SERVICE_SESSION_OPENED",
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: "serviceSessions",
      targetId: sessionId,
      timestamp: serverTimestamp(),
      reason: `${input.sessionKind === "ON_DEMAND" ? "On-demand" : "Scheduled"} service opened${mappings.length ? ` with ${mappings.length} group-room placements` : ""}`,
      applicationSource
    });
    return { session: { id: sessionId, ...session } as ServiceSession, created: true };
  });
  return result;
}

export async function recordVolunteerSessionParticipation(
  actor: MinistryMember,
  sessionId: string,
  servingArea: VolunteerServingAreaInput
) {
  const db = getFirebaseDb();
  const sessionRef = doc(db, "ministries", ministryId, "serviceSessions", sessionId);
  const assignmentRef = doc(sessionRef, "volunteerAssignments", actor.userId);
  const auditRef = doc(collection(db, "ministries", ministryId, "auditLogs"));
  return runTransaction(db, async (transaction) => {
    const [sessionSnapshot, assignmentSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(assignmentRef)
    ]);
    if (!sessionSnapshot.exists() || sessionSnapshot.data().status !== "OPEN") {
      throw new Error("SESSION_NOT_OPEN");
    }
    if (assignmentSnapshot.exists()) {
      const current = assignmentSnapshot.data();
      if (
        String(current.groupId || "") === servingArea.groupId &&
        String(current.roomId || "") === servingArea.roomId &&
        String(current.servingAreaLabel || "") === servingArea.servingAreaLabel
      ) return false;
      transaction.update(assignmentRef, {
        groupId: servingArea.groupId,
        roomId: servingArea.roomId,
        servingAreaLabel: servingArea.servingAreaLabel,
        assignmentUpdatedAt: serverTimestamp(),
        assignmentUpdatedBy: actor.userId
      });
      transaction.set(auditRef, {
        eventType: "SERVICE_VOLUNTEER_AREA_UPDATED",
        actorUid: actor.userId,
        actorName: actor.displayName,
        targetCollection: "serviceSessions",
        targetId: sessionId,
        timestamp: serverTimestamp(),
        reason: `Serving area selected: ${servingArea.servingAreaLabel}`,
        applicationSource: "KIDS_CHURCH_VOLUNTEER"
      });
      return true;
    }
    transaction.set(assignmentRef, {
      memberUid: actor.userId,
      displayName: actor.displayName,
      assignmentRole: "Session volunteer",
      groupId: servingArea.groupId,
      roomId: servingArea.roomId,
      servingAreaLabel: servingArea.servingAreaLabel,
      active: true,
      joinedAt: serverTimestamp(),
      joinedBy: actor.userId
    });
    transaction.set(auditRef, {
      eventType: "SERVICE_VOLUNTEER_JOINED",
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: "serviceSessions",
      targetId: sessionId,
      timestamp: serverTimestamp(),
      reason: `Volunteer joined service operations: ${servingArea.servingAreaLabel}`,
      applicationSource: "KIDS_CHURCH_VOLUNTEER"
    });
    return true;
  });
}

export async function closeServiceSession(
  actor: MinistryMember,
  sessionId: string,
  attendanceRecords: Attendance[],
  applicationSource: ApplicationSource
) {
  const stillCheckedIn = attendanceRecords.filter((record) => record.status === "CHECKED_IN");
  if (stillCheckedIn.length) throw new Error("CHILDREN_STILL_CHECKED_IN");
  const db = getFirebaseDb();
  const sessionRef = doc(db, "ministries", ministryId, "serviceSessions", sessionId);
  const auditRef = doc(collection(db, "ministries", ministryId, "auditLogs"));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists() || snapshot.data().status !== "OPEN") {
      throw new Error("SESSION_NOT_OPEN");
    }
    transaction.update(sessionRef, {
      status: "CLOSED",
      closedAt: serverTimestamp(),
      closedBy: actor.userId,
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    });
    transaction.set(auditRef, {
      eventType: "SERVICE_SESSION_CLOSED",
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: "serviceSessions",
      targetId: sessionId,
      timestamp: serverTimestamp(),
      reason: "Service closed after all children were released",
      applicationSource
    });
    return { id: snapshot.id, ...snapshot.data(), status: "CLOSED" as const };
  });
}

export async function saveSessionRoomMappings(
  actor: MinistryMember,
  sessionId: string,
  expectedRevision: number,
  mappings: SessionRoomMappingInput[],
  reason: string,
  applicationSource: ApplicationSource,
  attendanceRecords: Attendance[] = []
) {
  if (!mappings.length) throw new Error("ROOM_MAPPINGS_REQUIRED");
  if (reason.trim().length < 5) throw new Error("ROOM_MAPPING_REASON_REQUIRED");
  const db = getFirebaseDb();
  const sessionRef = doc(
    db,
    "ministries",
    ministryId,
    "serviceSessions",
    sessionId
  );
  const auditRef = doc(collection(db, "ministries", ministryId, "auditLogs"));
  const existingAssignments = await getDocs(collection(sessionRef, "roomAssignments"));
  const selectedGroupIds = new Set(mappings.map((mapping) => mapping.groupId));
  const removedAssignments = existingAssignments.docs.filter(
    (item) => item.data().active === true && !selectedGroupIds.has(String(item.data().groupId || item.id))
  );
  if (removedAssignments.some((assignment) => attendanceRecords.some(
    (record) => record.status === "CHECKED_IN" && record.groupId === assignment.data().groupId
  ))) {
    throw new Error("PLACEMENT_HAS_CHECKED_IN_CHILDREN");
  }

  return runTransaction(db, async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists() || sessionSnapshot.data().status !== "OPEN") {
      throw new Error("SESSION_NOT_OPEN");
    }
    const currentRevision = Number(sessionSnapshot.data().revision || 0);
    if (currentRevision !== expectedRevision) {
      throw new Error("ROOM_MAPPING_CONFLICT");
    }

    mappings.forEach((mapping) => {
      transaction.set(
        doc(sessionRef, "roomAssignments", mapping.groupId),
        {
          groupId: mapping.groupId,
          groupName: mapping.groupName,
          roomId: mapping.roomId,
          roomName: mapping.roomName,
          capacity: mapping.capacity || null,
          active: true,
          updatedAt: serverTimestamp(),
          updatedBy: actor.userId
        },
        { merge: true }
      );
    });
    removedAssignments.forEach((assignment) => {
      transaction.set(assignment.ref, {
        active: false,
        updatedAt: serverTimestamp(),
        updatedBy: actor.userId
      }, { merge: true });
    });
    transaction.update(sessionRef, {
      revision: currentRevision + 1,
      roomMappingUpdatedAt: serverTimestamp(),
      roomMappingUpdatedBy: actor.userId,
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    });
    transaction.set(auditRef, {
      eventType: "SESSION_ROOM_MAPPING_UPDATED",
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: "serviceSessions",
      targetId: sessionId,
      timestamp: serverTimestamp(),
      reason: reason.trim(),
      applicationSource
    });
    return currentRevision + 1;
  });
}

export async function moveCheckedInChildrenToMappedRooms(
  actor: MinistryMember,
  sessionId: string,
  attendanceRecords: Attendance[],
  mappings: SessionRoomMappingInput[],
  reason: string,
  applicationSource: ApplicationSource
) {
  const db = getFirebaseDb();
  const sessionRef = doc(db, "ministries", ministryId, "serviceSessions", sessionId);
  const candidates = attendanceRecords
    .filter((record) => record.status === "CHECKED_IN")
    .map((record) => ({
      record,
      mapping: mappings.find((mapping) => mapping.groupId === record.groupId),
      ref: doc(db, "ministries", ministryId, "attendance", record.id)
    }))
    .filter((item) => item.mapping && item.record.roomId !== item.mapping.roomId);
  if (!candidates.length) return 0;

  return runTransaction(db, async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    const mappingSnapshots = await Promise.all(
      candidates.map((item) =>
        transaction.get(doc(sessionRef, "roomAssignments", item.record.groupId))
      )
    );
    const attendanceSnapshots = await Promise.all(
      candidates.map((item) => transaction.get(item.ref))
    );
    if (!sessionSnapshot.exists() || sessionSnapshot.data().status !== "OPEN") {
      throw new Error("SESSION_NOT_OPEN");
    }

    let moved = 0;
    candidates.forEach((item, index) => {
      const attendanceSnapshot = attendanceSnapshots[index];
      const mappingSnapshot = mappingSnapshots[index];
      if (
        !attendanceSnapshot.exists() ||
        attendanceSnapshot.data().status !== "CHECKED_IN" ||
        !mappingSnapshot.exists()
      ) return;
      transaction.update(item.ref, {
        roomId: mappingSnapshot.data().roomId,
        roomNameSnapshot: mappingSnapshot.data().roomName,
        roomChangedAt: serverTimestamp(),
        roomChangedBy: actor.userId,
        roomChangeReason: reason.trim()
      });
      moved += 1;
    });
    if (moved) {
      transaction.set(doc(collection(db, "ministries", ministryId, "auditLogs")), {
        eventType: "CHECKED_IN_CHILDREN_ROOM_MOVED",
        actorUid: actor.userId,
        actorName: actor.displayName,
        targetCollection: "serviceSessions",
        targetId: sessionId,
        timestamp: serverTimestamp(),
        reason: reason.trim(),
        applicationSource
      });
    }
    return moved;
  });
}

export async function resolveOperationalFamily(
  presentedKey: string
): Promise<OperationalFamily> {
  const passHash = await hashFamilyKey(presentedKey);
  const db = getFirebaseDb();
  const pass = await getDoc(
    doc(db, "ministries", ministryId, "familyPasses", passHash)
  );
  if (!pass.exists()) throw new Error("FAMILY_PASS_NOT_FOUND");
  if (pass.data().status !== "ACTIVE") throw new Error("FAMILY_PASS_INACTIVE");

  const householdId = String(pass.data().householdId || "");
  const householdSnapshot = await getDoc(
    doc(db, "ministries", ministryId, "households", householdId)
  );
  if (!householdSnapshot.exists() || householdSnapshot.data().active !== true) {
    throw new Error("HOUSEHOLD_INACTIVE");
  }

  return loadOperationalFamily(
    {
      id: householdSnapshot.id,
      ...householdSnapshot.data()
    } as Household,
    passHash
  );
}

async function loadOperationalFamily(
  household: Household,
  passHash: string
): Promise<OperationalFamily> {
  const db = getFirebaseDb();
  const childIds = household.childIds || [];
  const householdSnapshot = await getDoc(
    doc(db, "ministries", ministryId, "households", household.id)
  );
  const guardianIds = (householdSnapshot.data()?.guardianIds || []) as string[];
  const [childSnapshots, guardianSnapshots] = await Promise.all([
    Promise.all(
      childIds.map((id) =>
        getDoc(doc(db, "ministries", ministryId, "children", id))
      )
    ),
    Promise.all(
      guardianIds.map((id) =>
        getDoc(doc(db, "ministries", ministryId, "guardians", id))
      )
    )
  ]);

  return {
    household,
    children: childSnapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Child),
    guardians: guardianSnapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Guardian),
    passHash
  };
}

export async function searchOperationalFamilies(term: string) {
  const normalized = term.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (normalized.length < 3) return [];
  const snapshot = await getDocs(
    query(
      collection(getFirebaseDb(), "ministries", ministryId, "households"),
      where("normalizedSearchTerms", "array-contains", normalized)
    )
  );
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Household)
    .filter((household) => household.active)
    .slice(0, 10);
}

export async function getOperationalFamilyByHousehold(
  householdId: string
): Promise<OperationalFamily> {
  const db = getFirebaseDb();
  const householdSnapshot = await getDoc(
    doc(db, "ministries", ministryId, "households", householdId)
  );
  if (!householdSnapshot.exists() || householdSnapshot.data().active !== true) {
    throw new Error("HOUSEHOLD_INACTIVE");
  }
  return loadOperationalFamily(
    { id: householdSnapshot.id, ...householdSnapshot.data() } as Household,
    "MANUAL"
  );
}

export async function loadSessionContext(
  session: ServiceSession
): Promise<SessionContext> {
  const db = getFirebaseDb();
  const base = ["ministries", ministryId, "serviceSessions", session.id] as const;
  const [rooms, volunteers] = await Promise.all([
    getDocs(collection(db, ...base, "roomAssignments")),
    getDocs(collection(db, ...base, "volunteerAssignments"))
  ]);
  return {
    session,
    roomAssignments: rooms.docs
      .map((item) => ({ id: item.id, ...item.data() }) as RoomAssignment)
      .filter((item) => item.active),
    volunteerAssignments: volunteers.docs
      .map((item) => ({ id: item.id, ...item.data() }) as VolunteerAssignment)
      .filter((item) => item.active)
  };
}

export async function checkInChildren(
  actor: MinistryMember,
  context: SessionContext,
  family: OperationalFamily,
  placements: CheckInPlacementInput[],
  method: CheckMethod
) {
  const db = getFirebaseDb();
  const sessionRef = doc(
    db,
    "ministries",
    ministryId,
    "serviceSessions",
    context.session.id
  );
  const householdRef = doc(
    db,
    "ministries",
    ministryId,
    "households",
    family.household.id
  );
  const selections = placements.map((placement) => {
    const child = family.children.find((item) => item.id === placement.childId);
    if (!child || !child.active) throw new Error("CHILD_INACTIVE");
    const assignment = context.roomAssignments.find(
      (item) => item.groupId === placement.groupId
    );
    if (!assignment) throw new Error("ROOM_ASSIGNMENT_MISSING");
    const registeredGroupId = child.ministryGroupId || "";
    const placementOverridden = registeredGroupId !== assignment.groupId;
    const overrideReason = placement.overrideReason?.trim() || "";
    if (placementOverridden && overrideReason.length < 3) {
      throw new Error("PLACEMENT_OVERRIDE_REASON_REQUIRED");
    }
    return {
      child,
      assignment,
      registeredGroupId,
      placementOverridden,
      overrideReason,
      childRef: doc(db, "ministries", ministryId, "children", child.id),
      attendanceRef: doc(
        db,
        "ministries",
        ministryId,
        "attendance",
        `${context.session.id}_${child.id}`
      )
    };
  });

  return runTransaction(db, async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    const householdSnapshot = await transaction.get(householdRef);
    const passSnapshot = family.passHash === "MANUAL"
      ? null
      : await transaction.get(
          doc(db, "ministries", ministryId, "familyPasses", family.passHash)
        );
    const childSnapshots = await Promise.all(
      selections.map((selection) => transaction.get(selection.childRef))
    );
    const assignmentSnapshots = await Promise.all(
      selections.map((selection) => transaction.get(
        doc(sessionRef, "roomAssignments", selection.assignment.groupId)
      ))
    );
    const attendanceSnapshots = await Promise.all(
      selections.map((selection) => transaction.get(selection.attendanceRef))
    );

    if (!sessionSnapshot.exists() || sessionSnapshot.data().status !== "OPEN") {
      throw new Error("SESSION_NOT_OPEN");
    }
    if (!householdSnapshot.exists() || householdSnapshot.data().active !== true) {
      throw new Error("HOUSEHOLD_INACTIVE");
    }
    if (passSnapshot && (!passSnapshot.exists() || passSnapshot.data().status !== "ACTIVE")) {
      throw new Error("FAMILY_PASS_INACTIVE");
    }
    const results: Array<{ childId: string; status: "CREATED" | "ALREADY_CHECKED_IN" }> = [];
    selections.forEach(({ child, assignment, registeredGroupId, placementOverridden, overrideReason, attendanceRef }, index) => {
      if (!childSnapshots[index].exists() || childSnapshots[index].data().active !== true) {
        throw new Error("CHILD_INACTIVE");
      }
      if (String(childSnapshots[index].data().ministryGroupId || "") !== registeredGroupId) {
        throw new Error("CHILD_PLACEMENT_CHANGED");
      }
      const currentAssignment = assignmentSnapshots[index];
      if (
        !currentAssignment.exists() ||
        currentAssignment.data().active !== true ||
        currentAssignment.data().groupName !== assignment.groupName ||
        currentAssignment.data().roomId !== assignment.roomId ||
        currentAssignment.data().roomName !== assignment.roomName
      ) {
        throw new Error("SESSION_PLACEMENT_CHANGED");
      }
      if (attendanceSnapshots[index].exists()) {
        results.push({ childId: child.id, status: "ALREADY_CHECKED_IN" });
        return;
      }
      transaction.set(attendanceRef, {
        childId: child.id,
        childNameSnapshot: `${child.firstName} ${child.lastName}`.trim(),
        householdId: family.household.id,
        householdNameSnapshot: family.household.householdName,
        sessionId: context.session.id,
        scheduleId: context.session.scheduleId,
        scheduleNameSnapshot: context.session.scheduleName,
        localServiceDate: context.session.localServiceDate,
        groupId: assignment.groupId,
        groupNameSnapshot: assignment.groupName,
        roomId: assignment.roomId,
        roomNameSnapshot: assignment.roomName,
        registeredGroupId,
        placementOverridden,
        placementOverrideReason: placementOverridden ? overrideReason : "",
        status: "CHECKED_IN",
        checkInAt: serverTimestamp(),
        checkInBy: actor.userId,
        checkInMethod: method
      });
      results.push({ childId: child.id, status: "CREATED" });
    });
    return results;
  });
}

export async function checkOutChildren(
  actor: MinistryMember,
  family: OperationalFamily,
  attendanceRecords: Attendance[],
  guardianId: string,
  note: string,
  method: CheckMethod
) {
  const guardian = family.guardians.find(
    (item) => item.id === guardianId && item.active
  );
  if (!guardian) throw new Error("GUARDIAN_NOT_AUTHORIZED");
  const selectedChildIds = attendanceRecords.map((record) => record.childId);
  if (
    selectedChildIds.some((childId) => {
      const child = family.children.find((item) => item.id === childId);
      return !child?.authorizedGuardianIds?.includes(guardianId);
    })
  ) {
    throw new Error("GUARDIAN_NOT_AUTHORIZED");
  }

  const db = getFirebaseDb();
  const attendanceRefs = attendanceRecords.map((record) =>
    doc(db, "ministries", ministryId, "attendance", record.id)
  );
  const childRefs = attendanceRecords.map((record) =>
    doc(db, "ministries", ministryId, "children", record.childId)
  );
  const guardianRef = doc(
    db,
    "ministries",
    ministryId,
    "guardians",
    guardian.id
  );
  const sessionRef = doc(
    db,
    "ministries",
    ministryId,
    "serviceSessions",
    attendanceRecords[0]?.sessionId || "missing"
  );
  return runTransaction(db, async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    const guardianSnapshot = await transaction.get(guardianRef);
    const childSnapshots = await Promise.all(
      childRefs.map((childRef) => transaction.get(childRef))
    );
    const attendanceSnapshots = await Promise.all(
      attendanceRefs.map((attendanceRef) => transaction.get(attendanceRef))
    );
    if (!sessionSnapshot.exists() || sessionSnapshot.data().status !== "OPEN") {
      throw new Error("SESSION_NOT_OPEN");
    }
    if (!guardianSnapshot.exists() || guardianSnapshot.data().active !== true) {
      throw new Error("GUARDIAN_NOT_AUTHORIZED");
    }
    const results: Array<{ id: string; status: "CHECKED_OUT" | "ALREADY_CHECKED_OUT" }> = [];
    attendanceRecords.forEach((record, index) => {
      const childSnapshot = childSnapshots[index];
      const snapshot = attendanceSnapshots[index];
      if (
        !childSnapshot.exists() ||
        !childSnapshot.data().authorizedGuardianIds?.includes(guardian.id)
      ) {
        throw new Error("GUARDIAN_NOT_AUTHORIZED");
      }
      if (!snapshot.exists()) throw new Error("ATTENDANCE_NOT_FOUND");
      if (snapshot.data().status !== "CHECKED_IN") {
        results.push({ id: record.id, status: "ALREADY_CHECKED_OUT" });
        return;
      }
      transaction.update(attendanceRefs[index], {
        status: "CHECKED_OUT",
        checkOutAt: serverTimestamp(),
        checkOutBy: actor.userId,
        checkOutMethod: method,
        releasedToGuardianId: guardian.id,
        releasedToName: guardian.fullName,
        checkoutNote: note.trim()
      });
      results.push({ id: record.id, status: "CHECKED_OUT" });
    });
    return results;
  });
}

export function subscribeToSessionAttendance(
  sessionId: string,
  onData: (records: Attendance[]) => void,
  onError: (code: string) => void
) {
  return onSnapshot(
    query(
      collection(getFirebaseDb(), "ministries", ministryId, "attendance"),
      where("sessionId", "==", sessionId)
    ),
    (snapshot) =>
      onData(
        snapshot.docs.map(
          (item) => ({ id: item.id, ...item.data() }) as Attendance
        )
      ),
    (error) => onError(error.code)
  );
}
