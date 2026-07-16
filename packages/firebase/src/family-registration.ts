import { arrayUnion, collection, doc, getDoc, runTransaction, serverTimestamp, type DocumentData } from "firebase/firestore";
import type { MinistryMember } from "@kcl/types";
import { getFirebaseDb, ministryId } from "./client";

const PASS_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export type FamilyRegistrationInput = {
  householdName: string; address: string; preferredContactMethod: "PHONE" | "EMAIL" | "IN_PERSON";
  emergencyContactMode: "PRIMARY_GUARDIAN" | "ANOTHER_GUARDIAN" | "OTHER"; emergencyGuardianIndex?: number;
  emergencyContactName: string; emergencyContactPhone: string; consentAcknowledged: true;
  guardians: Array<{ fullName: string; phone: string; email?: string; relationship: string; authorizedPickup: boolean; emergencyContact: boolean }>;
  children: Array<{ firstName: string; lastName: string; preferredName?: string; birthdate: string; ministryGroupId: string; allergies: string; medicalNotes: string; assistanceNotes: string; authorizedGuardianIndexes: number[] }>;
};

function randomPassToken() {
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (byte) => PASS_ALPHABET[byte % PASS_ALPHABET.length]).join("");
  return `KCL-${body.slice(0, 5)}-${body.slice(5, 10)}-${body.slice(10)}`;
}

export async function hashFamilyKey(token: string) {
  const canonical = token.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export async function registerFamily(actor: MinistryMember, input: FamilyRegistrationInput) {
  const db = getFirebaseDb();
  const householdRef = doc(collection(db, "ministries", ministryId, "households"));
  const guardianRefs = input.guardians.map(() => doc(collection(db, "ministries", ministryId, "guardians")));
  const childRefs = input.children.map(() => doc(collection(db, "ministries", ministryId, "children")));
  const emergencyGuardianIndex = input.emergencyContactMode === "PRIMARY_GUARDIAN"
    ? 0
    : input.emergencyContactMode === "ANOTHER_GUARDIAN"
      ? input.emergencyGuardianIndex
      : undefined;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomPassToken();
    const tokenHash = await hashFamilyKey(token);
    const passRef = doc(db, "ministries", ministryId, "familyPasses", tokenHash);
    const secretRef = doc(db, "ministries", ministryId, "familyPassSecrets", householdRef.id);
    const auditRef = doc(collection(db, "ministries", ministryId, "auditLogs"));

    try {
      await runTransaction(db, async (transaction) => {
        if ((await transaction.get(passRef)).exists()) throw new Error("PASS_COLLISION");
        const common = { createdAt: serverTimestamp(), createdBy: actor.userId, updatedAt: serverTimestamp(), updatedBy: actor.userId };
        transaction.set(householdRef, {
          householdName: input.householdName, normalizedHouseholdName: normalize(input.householdName), address: input.address,
          preferredContactMethod: input.preferredContactMethod, emergencyContactSummary: { name: input.emergencyContactName, phone: input.emergencyContactPhone },
          primaryGuardianId: guardianRefs[0].id, primaryGuardianName: input.guardians[0].fullName, guardianIds: guardianRefs.map((ref) => ref.id), childIds: childRefs.map((ref) => ref.id),
          normalizedSearchTerms: [normalize(input.householdName), ...input.guardians.flatMap((guardian) => [normalize(guardian.fullName), guardian.phone.replace(/\D/g, "")]), ...input.children.map((child) => normalize(`${child.firstName} ${child.lastName} ${child.preferredName || ""}`))],
          active: true, passStatus: "ACTIVE", consentAcknowledgedAt: serverTimestamp(), ...common
        });
        guardianRefs.forEach((ref, index) => transaction.set(ref, {
          householdId: householdRef.id, ...input.guardians[index], authorizedPickup: input.children.some((child) => child.authorizedGuardianIndexes.includes(index)), emergencyContact: index === emergencyGuardianIndex, normalizedName: normalize(input.guardians[index].fullName),
          normalizedPhone: input.guardians[index].phone.replace(/\D/g, ""), normalizedEmail: normalize(input.guardians[index].email || ""),
          linkedChildIds: childRefs.map((childRef) => childRef.id), active: true, ...common
        }));
        childRefs.forEach((ref, index) => transaction.set(ref, {
          householdId: householdRef.id, ...input.children[index], normalizedSearchName: normalize(`${input.children[index].firstName} ${input.children[index].lastName} ${input.children[index].preferredName || ""}`),
          authorizedGuardianIds: input.children[index].authorizedGuardianIndexes.map((guardianIndex) => guardianRefs[guardianIndex].id), active: true, firstVisit: true, ...common
        }));
        transaction.set(passRef, { householdId: householdRef.id, status: "ACTIVE", issuedAt: serverTimestamp(), issuedBy: actor.userId });
        transaction.set(secretRef, { householdId: householdRef.id, currentOpaqueToken: token, formattedDisplayKey: token, tokenHash, status: "ACTIVE", issuedAt: serverTimestamp(), issuedBy: actor.userId, ...common });
        transaction.set(auditRef, { eventType: "FAMILY_REGISTERED", actorUid: actor.userId, actorName: actor.displayName, targetCollection: "households", targetId: householdRef.id, timestamp: serverTimestamp(), reason: "Assisted family registration completed", applicationSource: "ADMIN_VOLUNTEER" });
      });
      return { householdId: householdRef.id, token, tokenHash, childCount: childRefs.length };
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "PASS_COLLISION") throw error;
    }
  }
  throw new Error("Could not generate a unique Family Key. Please try again.");
}

export async function getFamilyPassSecret(householdId: string) {
  const snapshot = await getDoc(doc(getFirebaseDb(), "ministries", ministryId, "familyPassSecrets", householdId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function replaceFamilyPass(actor: MinistryMember, householdId: string, reason: string) {
  if (reason.trim().length < 5) throw new Error("Enter a clear replacement reason (at least 5 characters).");
  const db = getFirebaseDb();
  const secretRef = doc(db, "ministries", ministryId, "familyPassSecrets", householdId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomPassToken(); const tokenHash = await hashFamilyKey(token);
    const newPassRef = doc(db, "ministries", ministryId, "familyPasses", tokenHash);
    try {
      await runTransaction(db, async (transaction) => {
        const secretSnapshot = await transaction.get(secretRef);
        if (!secretSnapshot.exists()) throw new Error("This family does not have a pass to replace.");
        const current = secretSnapshot.data();
        if (current.status === "DISABLED") throw new Error("A disabled pass requires Ministry Lead review.");
        if (current.status !== "ACTIVE") throw new Error("Another replacement may already have completed. Reload the family pass.");
        const oldPassRef = doc(db, "ministries", ministryId, "familyPasses", current.tokenHash);
        const [oldPass, collision] = await Promise.all([transaction.get(oldPassRef), transaction.get(newPassRef)]);
        if (collision.exists()) throw new Error("PASS_COLLISION");
        if (!oldPass.exists() || oldPass.data().status !== "ACTIVE") throw new Error("The current credential is no longer active. Reload before trying again.");
        transaction.update(oldPassRef, { status: "REPLACED", replacedAt: serverTimestamp(), replacedBy: actor.userId, replacementHash: tokenHash });
        transaction.set(newPassRef, { householdId, status: "ACTIVE", issuedAt: serverTimestamp(), issuedBy: actor.userId });
        transaction.update(secretRef, { currentOpaqueToken: token, formattedDisplayKey: token, tokenHash, status: "ACTIVE", issuedAt: serverTimestamp(), issuedBy: actor.userId, updatedAt: serverTimestamp(), updatedBy: actor.userId });
        transaction.update(doc(db, "ministries", ministryId, "households", householdId), { passStatus: "ACTIVE", updatedAt: serverTimestamp(), updatedBy: actor.userId });
        transaction.set(doc(collection(db, "ministries", ministryId, "auditLogs")), { eventType: "FAMILY_PASS_REPLACED", actorUid: actor.userId, actorName: actor.displayName, targetCollection: "households", targetId: householdId, timestamp: serverTimestamp(), reason: reason.trim(), applicationSource: "ADMIN_VOLUNTEER" });
      });
      return { token, tokenHash };
    } catch (error) { if (!(error instanceof Error) || error.message !== "PASS_COLLISION") throw error; }
  }
  throw new Error("Could not generate a unique replacement key. Please try again.");
}

export async function updateRegistrationDocument(actor: MinistryMember, path: "households" | "guardians" | "children", id: string, values: DocumentData, reason: string) {
  const db = getFirebaseDb(); const target = doc(db, "ministries", ministryId, path, id);
  await runTransaction(db, async (transaction) => {
    if (!(await transaction.get(target)).exists()) throw new Error("This record is no longer available.");
    transaction.update(target, { ...values, updatedAt: serverTimestamp(), updatedBy: actor.userId });
    transaction.set(doc(collection(db, "ministries", ministryId, "auditLogs")), { eventType: `${path.toUpperCase()}_UPDATED`, actorUid: actor.userId, actorName: actor.displayName, targetCollection: path, targetId: id, timestamp: serverTimestamp(), reason, applicationSource: "ADMIN_VOLUNTEER" });
  });
}

export async function addGuardianToFamily(actor: MinistryMember, householdId: string, linkedChildIds: string[], authorizedChildIds: string[], guardian: { fullName: string; phone: string; email?: string; relationship: string; authorizedPickup: boolean; emergencyContact: boolean }) {
  const db = getFirebaseDb(); const householdRef = doc(db, "ministries", ministryId, "households", householdId); const guardianRef = doc(collection(db, "ministries", ministryId, "guardians"));
  await runTransaction(db, async (transaction) => {
    if (!(await transaction.get(householdRef)).exists()) throw new Error("This family is no longer available.");
    const common = { createdAt: serverTimestamp(), createdBy: actor.userId, updatedAt: serverTimestamp(), updatedBy: actor.userId };
    transaction.set(guardianRef, { householdId, ...guardian, normalizedName: normalize(guardian.fullName), normalizedPhone: guardian.phone.replace(/\D/g, ""), normalizedEmail: normalize(guardian.email || ""), linkedChildIds, active: true, ...common });
    transaction.update(householdRef, { guardianIds: arrayUnion(guardianRef.id), updatedAt: serverTimestamp(), updatedBy: actor.userId });
    if (guardian.authorizedPickup) authorizedChildIds.forEach((childId) => transaction.update(doc(db, "ministries", ministryId, "children", childId), { authorizedGuardianIds: arrayUnion(guardianRef.id), updatedAt: serverTimestamp(), updatedBy: actor.userId }));
    transaction.set(doc(collection(db, "ministries", ministryId, "auditLogs")), { eventType: "GUARDIAN_ADDED", actorUid: actor.userId, actorName: actor.displayName, targetCollection: "guardians", targetId: guardianRef.id, timestamp: serverTimestamp(), reason: "Guardian added during verified family maintenance", applicationSource: "ADMIN_VOLUNTEER" });
  });
}

export async function addChildToFamily(actor: MinistryMember, householdId: string, allGuardianIds: string[], authorizedGuardianIds: string[], child: { firstName: string; lastName: string; preferredName?: string; birthdate: string; ministryGroupId: string; allergies: string; medicalNotes: string; assistanceNotes: string }) {
  if (!authorizedGuardianIds.length) throw new Error("At least one authorized guardian is required.");
  const db = getFirebaseDb(); const householdRef = doc(db, "ministries", ministryId, "households", householdId); const childRef = doc(collection(db, "ministries", ministryId, "children"));
  await runTransaction(db, async (transaction) => {
    if (!(await transaction.get(householdRef)).exists()) throw new Error("This family is no longer available.");
    transaction.set(childRef, { householdId, ...child, normalizedSearchName: normalize(`${child.firstName} ${child.lastName} ${child.preferredName || ""}`), authorizedGuardianIds, active: true, firstVisit: true, createdAt: serverTimestamp(), createdBy: actor.userId, updatedAt: serverTimestamp(), updatedBy: actor.userId });
    transaction.update(householdRef, { childIds: arrayUnion(childRef.id), updatedAt: serverTimestamp(), updatedBy: actor.userId });
    allGuardianIds.forEach((guardianId) => transaction.update(doc(db, "ministries", ministryId, "guardians", guardianId), { linkedChildIds: arrayUnion(childRef.id), ...(authorizedGuardianIds.includes(guardianId) ? { authorizedPickup: true } : {}), updatedAt: serverTimestamp(), updatedBy: actor.userId }));
    transaction.set(doc(collection(db, "ministries", ministryId, "auditLogs")), { eventType: "CHILD_ADDED", actorUid: actor.userId, actorName: actor.displayName, targetCollection: "children", targetId: childRef.id, timestamp: serverTimestamp(), reason: "Child added during verified family maintenance", applicationSource: "ADMIN_VOLUNTEER" });
  });
}
