import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData
} from "firebase/firestore";
import type { MinistryMember } from "@kcl/types";
import { auditRef } from "./audit";
import { getFirebaseDb, ministryId } from "./client";

export async function createMinistryDocument(
  actor: MinistryMember,
  path: string,
  values: DocumentData
) {
  const db = getFirebaseDb();
  const documentRef = doc(collection(db, "ministries", ministryId, path));

  await runTransaction(db, async (transaction) => {
    transaction.set(documentRef, {
      ...values,
      createdAt: serverTimestamp(),
      createdBy: actor.userId,
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    });
    transaction.set(auditRef(db), {
      eventType: `${path.toUpperCase()}_CREATED`,
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: path,
      targetId: documentRef.id,
      timestamp: serverTimestamp(),
      reason: "Created through Ministry Lead application",
      applicationSource: "MINISTRY_LEAD"
    });
  });

  return documentRef.id;
}

export async function updateMinistryDocument(
  actor: MinistryMember,
  path: string,
  id: string,
  values: DocumentData,
  reason = "Updated through Ministry Lead application"
) {
  const db = getFirebaseDb();
  await runTransaction(db, async (transaction) => {
    transaction.update(doc(db, "ministries", ministryId, path, id), {
      ...values,
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    });
    transaction.set(auditRef(db), {
      eventType: `${path.toUpperCase()}_UPDATED`,
      actorUid: actor.userId,
      actorName: actor.displayName,
      targetCollection: path,
      targetId: id,
      timestamp: serverTimestamp(),
      reason,
      applicationSource: "MINISTRY_LEAD"
    });
  });
}

export async function getMinistryProfile() {
  const snapshot = await getDoc(doc(getFirebaseDb(), "ministries", ministryId));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveMinistryProfile(
  actor: MinistryMember,
  values: DocumentData
) {
  await setDoc(
    doc(getFirebaseDb(), "ministries", ministryId),
    {
      ...values,
      updatedAt: serverTimestamp(),
      updatedBy: actor.userId
    },
    { merge: true }
  );
}
