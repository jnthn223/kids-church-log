#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

const rl = createInterface({ input, output });
const fail = (message) => { throw new Error(message); };
const clean = (value) => String(value || "").trim();

async function projectIdFromConfig() {
  const config = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
  return config.projects?.default || fail("No default Firebase project exists in .firebaserc.");
}

function ensureCredentials() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
  const check = spawnSync("gcloud", ["auth", "application-default", "print-access-token"], { stdio: "ignore" });
  if (check.error?.code === "ENOENT") fail("Google Cloud CLI is not installed. Install it from https://cloud.google.com/sdk/docs/install, then run this command again.");
  if (check.status === 0) return;
  output.write("\nA browser will open for the technical custodian’s one-time authorization.\n\n");
  const login = spawnSync("gcloud", ["auth", "application-default", "login"], { stdio: "inherit" });
  if (login.status !== 0) fail("Google Cloud administrative sign-in did not complete.");
}

async function main() {
  const projectId = await projectIdFromConfig();
  const ministryId = clean(process.env.KCL_MINISTRY_ID || "kidschurch");
  output.write("\nKidsChurchLog · First Ministry Lead setup\n");
  output.write("This utility works once and cannot perform routine approval or recovery.\n\n");
  output.write(`Firebase project: ${projectId}\nMinistry: ${ministryId}\n\n`);

  const uid = clean(await rl.question("Paste the Setup ID from the pending screen: "));
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(uid)) fail("That Setup ID is not a valid Firebase UID.");
  const custodianName = clean(await rl.question("Technical custodian name for the audit record: "));
  if (custodianName.length < 2) fail("A custodian name is required.");

  ensureCredentials();
  const app = initializeApp({ credential: applicationDefault(), projectId });
  try {
    const db = getFirestore(app);
    const ministryRef = db.doc(`ministries/${ministryId}`);
    const requestRef = db.doc(`ministries/${ministryId}/accessRequests/${uid}`);
    const memberRef = db.doc(`ministries/${ministryId}/members/${uid}`);
    const governanceRef = db.doc(`ministries/${ministryId}/settings/accessGovernance`);
    const [request, member, governance] = await Promise.all([requestRef.get(), memberRef.get(), governanceRef.get()]);
    if (!request.exists) fail("No pending request matches that Setup ID. Deploy the rules, ask the person to sign in, then choose Refresh status.");
    const person = request.data();
    if (person.status !== "PENDING") fail(`This request is already ${person.status}.`);
    if (member.exists) fail("A membership already exists for this Setup ID.");
    if (governance.exists && (governance.data().assignedMinistryLeadIds || []).length) fail("A Ministry Lead already exists. Use Team Access in the application.");

    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 150);
    output.write("\nPending identity found:\n");
    output.write(`  Name: ${person.displayName || "Not provided"}\n  Email: ${person.email || "Not provided"}\n  Setup ID: ${uid}\n  Access expires: ${expiresAt.toISOString().slice(0, 10)}\n\n`);
    const phrase = `BOOTSTRAP ${uid.slice(0, 8)}`;
    const confirmation = clean(await rl.question(`Type “${phrase}” to continue: `));
    if (confirmation !== phrase) fail("Confirmation did not match. No changes were made.");

    const auditRef = db.collection(`ministries/${ministryId}/auditLogs`).doc();
    await db.runTransaction(async (tx) => {
      const [latestRequest, latestMember, latestGovernance] = await Promise.all([tx.get(requestRef), tx.get(memberRef), tx.get(governanceRef)]);
      if (!latestRequest.exists || latestRequest.data().status !== "PENDING") fail("The pending request changed while setup was running.");
      if (latestMember.exists) fail("Another process already created this membership.");
      if (latestGovernance.exists && (latestGovernance.data().assignedMinistryLeadIds || []).length) fail("Another process already created the first Ministry Lead.");
      const actor = `TECHNICAL_CUSTODIAN:${custodianName}`;
      tx.set(ministryRef, { name: "Kids Church", timezone: "Asia/Manila", locale: "en-PH", active: true, schemaVersion: 1, createdAt: FieldValue.serverTimestamp(), createdBy: actor, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor }, { merge: true });
      tx.set(memberRef, { userId: uid, displayName: person.displayName || "Ministry Lead", email: person.email || "", roles: ["MINISTRY_LEAD"], status: "ACTIVE", termStartAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt), lastReviewedBy: actor, lastReviewedAt: FieldValue.serverTimestamp(), reviewOutcome: "BOOTSTRAPPED", approvedBy: actor, approvedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(), createdBy: actor, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor });
      tx.set(governanceRef, { assignedMinistryLeadIds: [uid], minimumActiveLeadTarget: 2, volunteerMaxTermDays: 365, leadReviewIntervalDays: 180, accessReviewWarningDays: 30, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor });
      tx.update(requestRef, { status: "APPROVED", reviewedAt: FieldValue.serverTimestamp(), reviewedBy: actor });
      tx.set(auditRef, { eventType: "INITIAL_MINISTRY_LEAD_BOOTSTRAPPED", actorUid: "TECHNICAL_CUSTODIAN", actorName: custodianName, targetCollection: "members", targetId: uid, timestamp: FieldValue.serverTimestamp(), reason: "Initial ministry access bootstrap", applicationSource: "TECHNICAL_CUSTODIAN" });
    });
    output.write("\nSetup complete. The Ministry Lead can now choose Refresh status.\n");
    output.write("The custodian should finish with: gcloud auth application-default revoke\n\n");
  } finally { await deleteApp(app); }
}

try { await main(); } catch (error) { output.write(`\nSetup stopped: ${error instanceof Error ? error.message : String(error)}\n\n`); process.exitCode = 1; } finally { rl.close(); }
