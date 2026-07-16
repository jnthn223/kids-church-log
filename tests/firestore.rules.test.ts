import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";

const projectId = "kidschurchlog-app";
const ministryId = "kidschurch";
let env: RulesTestEnvironment;
const future = Timestamp.fromMillis(Date.now() + 30 * 86_400_000);
const past = Timestamp.fromMillis(Date.now() - 86_400_000);

beforeAll(async () => { env = await initializeTestEnvironment({ projectId }); });
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "ministries", ministryId), { name: "Kids Church", updatedBy: "lead" });
    await setDoc(doc(db, "ministries", ministryId, "members", "lead"), { userId: "lead", displayName: "Lead", email: "lead@example.org", roles: ["MINISTRY_LEAD"], status: "ACTIVE", expiresAt: future });
    await setDoc(doc(db, "ministries", ministryId, "members", "expired"), { userId: "expired", displayName: "Expired", email: "expired@example.org", roles: ["MINISTRY_LEAD"], status: "ACTIVE", expiresAt: past });
    await setDoc(doc(db, "ministries", ministryId, "members", "kids"), { userId: "kids", displayName: "Kids Volunteer", email: "kids@example.org", roles: ["KIDS_CHURCH_VOLUNTEER"], status: "ACTIVE", expiresAt: future });
    await setDoc(doc(db, "ministries", ministryId, "members", "admin"), { userId: "admin", displayName: "Admin Volunteer", email: "admin@example.org", roles: ["ADMIN_VOLUNTEER"], status: "ACTIVE", expiresAt: future });
    await setDoc(doc(db, "ministries", ministryId, "members", "legacy-suspended"), { userId: "legacy-suspended", displayName: "Legacy Suspended Lead", email: "legacy@example.org", roles: [], status: "SUSPENDED", expiresAt: past });
    await setDoc(doc(db, "ministries", ministryId, "settings", "accessGovernance"), { assignedMinistryLeadIds: ["lead"], minimumActiveLeadTarget: 2, leadReviewIntervalDays: 150, accessReviewWarningDays: 30, updatedBy: "lead" });
    await setDoc(doc(db, "ministries", ministryId, "households", "family"), { householdName: "Family", active: true });
    await setDoc(doc(db, "ministries", ministryId, "children", "child"), { firstName: "Child", active: true });
    await setDoc(doc(db, "ministries", ministryId, "households", "operational-family"), { householdName: "Operational Family", active: true, childIds: ["operational-child"], guardianIds: ["guardian"] });
    await setDoc(doc(db, "ministries", ministryId, "children", "operational-child"), { householdId: "operational-family", firstName: "Operational", lastName: "Child", active: true, authorizedGuardianIds: ["guardian"] });
    await setDoc(doc(db, "ministries", ministryId, "guardians", "guardian"), { householdId: "operational-family", fullName: "Guardian", active: true });
    await setDoc(doc(db, "ministries", ministryId, "guardians", "other-guardian"), { householdId: "operational-family", fullName: "Other Guardian", active: true });
    await setDoc(doc(db, "ministries", ministryId, "familyPasses", "pass-hash"), { householdId: "operational-family", status: "ACTIVE" });
    await setDoc(doc(db, "ministries", ministryId, "serviceSessions", "session"), { localServiceDate: "2026-07-16", scheduleId: "schedule", scheduleName: "Sunday Service", status: "OPEN" });
  });
});

describe("Firestore ministry boundaries", () => {
  it("allows an active Ministry Lead to read ministry records", async () => {
    const db = env.authenticatedContext("lead", { email: "lead@example.org", email_verified: true }).firestore();
    await assertSucceeds(getDoc(doc(db, "ministries", ministryId, "households", "family")));
  });

  it("denies expired memberships even when still marked active", async () => {
    const db = env.authenticatedContext("expired", { email: "expired@example.org", email_verified: true }).firestore();
    await assertFails(getDoc(doc(db, "ministries", ministryId, "households", "family")));
  });

  it("denies ministry data until the authenticated email is verified", async () => {
    const db = env.authenticatedContext("lead", { email: "lead@example.org", email_verified: false }).firestore();
    await assertFails(getDoc(doc(db, "ministries", ministryId, "households", "family")));
  });

  it("allows a Kids Church Volunteer to read operational family records but not pass secrets", async () => {
    const db = env.authenticatedContext("kids", { email: "kids@example.org", email_verified: true }).firestore();
    await assertSucceeds(getDoc(doc(db, "ministries", ministryId, "children", "operational-child")));
    await assertSucceeds(getDoc(doc(db, "ministries", ministryId, "guardians", "guardian")));
    await assertSucceeds(getDoc(doc(db, "ministries", ministryId, "familyPasses", "pass-hash")));
    await assertFails(getDoc(doc(db, "ministries", ministryId, "familyPassSecrets", "operational-family")));
  });

  it("allows duplicate-safe volunteer check-in and constrained checkout", async () => {
    const db = env.authenticatedContext("kids", { email: "kids@example.org", email_verified: true }).firestore();
    const attendanceRef = doc(db, "ministries", ministryId, "attendance", "session_operational-child");
    await assertSucceeds(setDoc(attendanceRef, {
      childId: "operational-child", childNameSnapshot: "Operational Child", householdId: "operational-family", householdNameSnapshot: "Operational Family",
      sessionId: "session", scheduleId: "schedule", scheduleNameSnapshot: "Sunday Service", localServiceDate: "2026-07-16",
      groupId: "group", groupNameSnapshot: "Kids", roomId: "room", roomNameSnapshot: "Room 1", status: "CHECKED_IN",
      checkInAt: serverTimestamp(), checkInBy: "kids", checkInMethod: "QR"
    }));
    await assertFails(updateDoc(attendanceRef, {
      status: "CHECKED_OUT", checkOutAt: serverTimestamp(), checkOutBy: "kids", checkOutMethod: "QR",
      releasedToGuardianId: "other-guardian", releasedToName: "Other Guardian", checkoutNote: ""
    }));
    await assertSucceeds(updateDoc(attendanceRef, {
      status: "CHECKED_OUT", checkOutAt: serverTimestamp(), checkOutBy: "kids", checkOutMethod: "QR",
      releasedToGuardianId: "guardian", releasedToName: "Guardian", checkoutNote: ""
    }));
    await assertFails(updateDoc(attendanceRef, { status: "CHECKED_IN" }));
  });

  it("denies an Admin Volunteer from writing attendance", async () => {
    const db = env.authenticatedContext("admin", { email: "admin@example.org", email_verified: true }).firestore();
    await assertFails(setDoc(doc(db, "ministries", ministryId, "attendance", "session_operational-child"), {
      childId: "operational-child", childNameSnapshot: "Operational Child", householdId: "operational-family", householdNameSnapshot: "Operational Family",
      sessionId: "session", scheduleId: "schedule", scheduleNameSnapshot: "Sunday Service", localServiceDate: "2026-07-16",
      groupId: "group", groupNameSnapshot: "Kids", roomId: "room", roomNameSnapshot: "Room 1", status: "CHECKED_IN",
      checkInAt: serverTimestamp(), checkInBy: "admin", checkInMethod: "QR"
    }));
  });

  it("allows an Admin Volunteer to create an active family but not deactivate it", async () => {
    const db = env.authenticatedContext("admin", { email: "admin@example.org", email_verified: true }).firestore();
    const familyRef = doc(db, "ministries", ministryId, "households", "new-family");
    await assertSucceeds(setDoc(familyRef, { householdName: "New Family", active: true, passStatus: "ACTIVE", createdBy: "admin", updatedBy: "admin" }));
    await assertFails(updateDoc(familyRef, { active: false, updatedBy: "admin" }));
  });

  it("prevents an Admin Volunteer from administratively disabling a pass", async () => {
    await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "ministries", ministryId, "familyPasses", "hash"), { householdId: "family", status: "ACTIVE", issuedBy: "admin" }));
    const db = env.authenticatedContext("admin", { email: "admin@example.org", email_verified: true }).firestore();
    await assertFails(updateDoc(doc(db, "ministries", ministryId, "familyPasses", "hash"), { status: "DISABLED", replacedBy: "admin", replacementHash: "other" }));
    await assertSucceeds(updateDoc(doc(db, "ministries", ministryId, "familyPasses", "hash"), { status: "REPLACED", replacedBy: "admin", replacementHash: "other" }));
  });

  it("requires every Admin-created active child to retain an authorized pickup guardian", async () => {
    const db = env.authenticatedContext("admin", { email: "admin@example.org", email_verified: true }).firestore();
    const childRef = doc(db, "ministries", ministryId, "children", "new-child");
    await assertFails(setDoc(childRef, { householdId: "family", firstName: "New", lastName: "Child", active: true, authorizedGuardianIds: [], createdBy: "admin", updatedBy: "admin" }));
    await assertSucceeds(setDoc(childRef, { householdId: "family", firstName: "New", lastName: "Child", active: true, authorizedGuardianIds: ["guardian"], createdBy: "admin", updatedBy: "admin" }));
    await assertFails(updateDoc(childRef, { authorizedGuardianIds: [], updatedBy: "admin" }));
  });

  it("prevents a Ministry Lead from renewing themselves", async () => {
    const db = env.authenticatedContext("lead", { email: "lead@example.org", email_verified: true }).firestore();
    await assertFails(updateDoc(doc(db, "ministries", ministryId, "members", "lead"), { expiresAt: Timestamp.fromMillis(Date.now() + 60 * 86_400_000) }));
  });

  it("allows another Lead to recover a suspended legacy membership and its governance roster", async () => {
    const db = env.authenticatedContext("lead", { email: "lead@example.org", email_verified: true }).firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, "ministries", ministryId, "settings", "accessGovernance"), { assignedMinistryLeadIds: ["lead", "legacy-suspended"], updatedBy: "lead" });
    batch.update(doc(db, "ministries", ministryId, "members", "legacy-suspended"), { roles: ["MINISTRY_LEAD"], status: "ACTIVE", expiresAt: future, updatedBy: "lead" });
    await assertSucceeds(batch.commit());
  });

  it("allows a user to create only their own pending request", async () => {
    const db = env.authenticatedContext("new-user", { email: "new@example.org", email_verified: false }).firestore();
    await assertSucceeds(setDoc(doc(db, "ministries", ministryId, "accessRequests", "new-user"), { uid: "new-user", email: "new@example.org", displayName: "New User", providerIds: ["password"], requestedApplication: "MINISTRY_LEAD", ministryResponsibility: "Kids Church coordinator", requestReason: "I configure ministry services.", status: "PENDING", requestedAt: Timestamp.now() }));
    await expect(assertFails(setDoc(doc(db, "ministries", ministryId, "accessRequests", "someone-else"), { uid: "someone-else", email: "x@example.org", displayName: "X", providerIds: ["password"], requestedApplication: "MINISTRY_LEAD", status: "PENDING", requestedAt: Timestamp.now() }))).resolves.toBeDefined();
  });

  it("allows a verified orphaned identity to recover by creating its request", async () => {
    const db = env.authenticatedContext("orphaned-user", { email: "orphaned@example.org", email_verified: true }).firestore();
    await assertSucceeds(setDoc(doc(db, "ministries", ministryId, "accessRequests", "orphaned-user"), { uid: "orphaned-user", email: "orphaned@example.org", displayName: "Orphaned User", providerIds: ["password"], requestedApplication: "MINISTRY_LEAD", ministryResponsibility: "Kids Church coordinator", requestReason: "I need to help manage ministry services.", status: "PENDING", requestedAt: Timestamp.now() }));
  });
});
