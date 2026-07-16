"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut,
  type User
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type DocumentData } from "firebase/firestore";
import type { MinistryMember, MinistryRole } from "@kcl/types";
import { isExpired } from "@kcl/utils";
import {
  configureFirebaseClient,
  getFirebaseAuth,
  getFirebaseDb,
  ministryId,
  type FirebaseClientConfig
} from "./client";

export type AccessState =
  | "LOADING"
  | "SIGNED_OUT"
  | "VERIFY_EMAIL"
  | "REQUEST_DETAILS_REQUIRED"
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED"
  | "EXPIRED"
  | "WRONG_ROLE"
  | "ERROR";

type AuthContextValue = {
  user: User | null;
  member: MinistryMember | null;
  state: AccessState;
  error: string | null;
  refresh(): Promise<void>;
  signOutUser(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function memberFrom(id: string, data: DocumentData): MinistryMember {
  return {
    id,
    userId: id,
    displayName: data.displayName || "Team member",
    email: data.email || "",
    roles: data.roles || [],
    status: data.status || "PENDING",
    ...data
  };
}

function stateForMember(member: MinistryMember, requiredRole: MinistryRole): AccessState {
  if (member.status === "SUSPENDED") return "SUSPENDED";
  if (member.status === "REVOKED") return "REVOKED";
  if (member.status !== "ACTIVE") return "PENDING";
  if (isExpired(member.expiresAt)) return "EXPIRED";
  if (!member.roles.includes(requiredRole)) return "WRONG_ROLE";
  return "ACTIVE";
}

async function stateWithoutMembership(uid: string): Promise<AccessState> {
  const request = await getDoc(
    doc(getFirebaseDb(), "ministries", ministryId, "accessRequests", uid)
  );
  return request.exists() ? "PENDING" : "REQUEST_DETAILS_REQUIRED";
}

async function syncUserProfile(user: User) {
  await setDoc(
    doc(getFirebaseDb(), "users", user.uid),
    {
      displayName: user.displayName || "",
      normalizedEmail: user.email?.toLowerCase() || "",
      photoUrl: user.photoURL || "",
      defaultMinistryId: ministryId,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export function AuthAccessProvider({
  children,
  requiredRole = "MINISTRY_LEAD",
  firebaseConfig
}: {
  children: ReactNode;
  requiredRole?: MinistryRole;
  firebaseConfig?: FirebaseClientConfig;
}) {
  if (firebaseConfig) configureFirebaseClient(firebaseConfig);
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MinistryMember | null>(null);
  const [state, setState] = useState<AccessState>("LOADING");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      setMember(null);
      setState("SIGNED_OUT");
      return;
    }

    try {
      await currentUser.reload();
      const reloadedUser = getFirebaseAuth().currentUser;
      setUser(reloadedUser);

      if (!reloadedUser?.emailVerified) {
        setMember(null);
        setState("VERIFY_EMAIL");
        return;
      }

      const snapshot = await getDoc(
        doc(getFirebaseDb(), "ministries", ministryId, "members", currentUser.uid)
      );
      if (!snapshot.exists()) {
        setMember(null);
        setState(await stateWithoutMembership(currentUser.uid));
        return;
      }

      const nextMember = memberFrom(snapshot.id, snapshot.data());
      setMember(nextMember);
      setState(stateForMember(nextMember, requiredRole));
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "MEMBERSHIP_UNAVAILABLE");
    }
  }, [requiredRole]);

  useEffect(() => {
    let unsubscribeMembership: (() => void) | undefined;

    try {
      const auth = getFirebaseAuth();
      void setPersistence(auth, browserLocalPersistence);

      const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
        unsubscribeMembership?.();
        setUser(nextUser);
        setMember(null);
        setError(null);

        if (!nextUser) {
          setState("SIGNED_OUT");
          return;
        }

        setState("LOADING");
        try {
          await syncUserProfile(nextUser);
        } catch {
          // Profile synchronization can be retried. Membership remains authoritative.
        }

        if (!nextUser.emailVerified) {
          setState("VERIFY_EMAIL");
          return;
        }

        const membershipRef = doc(
          getFirebaseDb(),
          "ministries",
          ministryId,
          "members",
          nextUser.uid
        );
        unsubscribeMembership = onSnapshot(
          membershipRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setMember(null);
              void stateWithoutMembership(nextUser.uid)
                .then(setState)
                .catch(() => setState("ERROR"));
              return;
            }

            const nextMember = memberFrom(snapshot.id, snapshot.data());
            setMember(nextMember);
            setState(stateForMember(nextMember, requiredRole));
          },
          (snapshotError) => {
            setError(snapshotError.code || "MEMBERSHIP_UNAVAILABLE");
            setState(snapshotError.code === "permission-denied" ? "PENDING" : "ERROR");
          }
        );
      });

      return () => {
        unsubscribeAuth();
        unsubscribeMembership?.();
      };
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "AUTH_UNAVAILABLE");
      setState("ERROR");
    }
  }, [requiredRole]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      member,
      state,
      error,
      refresh,
      signOutUser: async () => signOut(getFirebaseAuth())
    }),
    [user, member, state, error, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthAccess() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthAccessProvider missing");
  return value;
}
