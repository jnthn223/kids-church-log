import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { passwordValidationError } from "@kcl/validation";
import { getFirebaseAuth, getFirebaseDb, ministryId } from "./client";

type AccessRequestDetails = {
  displayName: string;
  ministryResponsibility: string;
  requestReason: string;
};

export async function signInEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signInGoogle() {
  return signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function createEmailAccessAccount(
  values: AccessRequestDetails & { email: string; password: string },
  requestedApplication = "MINISTRY_LEAD"
) {
  const passwordError = passwordValidationError(values.password);
  if (passwordError) throw new Error(passwordError);

  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    values.email,
    values.password
  );
  await updateProfile(credential.user, { displayName: values.displayName });
  await sendEmailVerification(credential.user);

  try {
    await writeUserProfile(credential.user.uid, {
      displayName: values.displayName,
      normalizedEmail: values.email.toLowerCase(),
      photoUrl: ""
    });
    await setDoc(
      accessRequestRef(credential.user.uid),
      accessRequestData({
        uid: credential.user.uid,
        email: values.email.toLowerCase(),
        providerIds: ["password"],
        displayName: values.displayName,
        ministryResponsibility: values.ministryResponsibility,
        requestReason: values.requestReason
      }, requestedApplication)
    );
  } catch {
    // Authentication has already succeeded. The verified user will be routed to
    // the request-recovery form instead of creating a duplicate Firebase account.
  }

  return credential.user;
}

export async function submitAccessRequestDetails(
  values: AccessRequestDetails,
  requestedApplication = "MINISTRY_LEAD"
) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in before completing the request.");

  await user.reload();
  if (!getFirebaseAuth().currentUser?.emailVerified) {
    throw new Error("Verify your email before submitting the request.");
  }

  const requestRef = accessRequestRef(user.uid);
  if ((await getDoc(requestRef)).exists()) return;

  await updateProfile(user, { displayName: values.displayName });
  await writeUserProfile(user.uid, {
    displayName: values.displayName,
    normalizedEmail: user.email?.toLowerCase() || "",
    photoUrl: user.photoURL || ""
  });
  await setDoc(
    requestRef,
    accessRequestData({
      uid: user.uid,
      email: user.email?.toLowerCase() || "",
      providerIds: user.providerData.map((provider) => provider.providerId),
      ...values
    }, requestedApplication)
  );
}

export async function resendVerificationEmail() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("No signed-in account.");
  await sendEmailVerification(user);
}

function accessRequestRef(uid: string) {
  return doc(getFirebaseDb(), "ministries", ministryId, "accessRequests", uid);
}

function accessRequestData(
  values: AccessRequestDetails & { uid: string; email: string; providerIds: string[] },
  requestedApplication: string
) {
  return {
    uid: values.uid,
    email: values.email,
    displayName: values.displayName,
    providerIds: values.providerIds,
    requestedApplication,
    ministryResponsibility: values.ministryResponsibility,
    requestReason: values.requestReason,
    status: "PENDING",
    requestedAt: serverTimestamp()
  };
}

async function writeUserProfile(
  uid: string,
  profile: { displayName: string; normalizedEmail: string; photoUrl: string }
) {
  await setDoc(
    doc(getFirebaseDb(), "users", uid),
    {
      ...profile,
      defaultMinistryId: ministryId,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
