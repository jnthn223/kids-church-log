import { collection, doc, type Firestore } from "firebase/firestore";
import { ministryId } from "./client";

export function auditRef(db: Firestore) {
  return doc(collection(db, "ministries", ministryId, "auditLogs"));
}
