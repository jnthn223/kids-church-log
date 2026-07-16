"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type QueryConstraint
} from "firebase/firestore";
import { getFirebaseDb, ministryId } from "./client";

export function useMinistryCollection<T extends { id: string }>(
  path: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const constraintKey = constraints.map(String).join("|");

  useEffect(() => {
    setLoading(true);
    const collectionRef = collection(getFirebaseDb(), "ministries", ministryId, path);
    const collectionQuery = constraints.length
      ? query(collectionRef, ...constraints)
      : query(collectionRef, limit(100));

    return onSnapshot(
      collectionQuery,
      (snapshot) => {
        setData(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T)
        );
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setError(snapshotError.code || "LOAD_FAILED");
        setLoading(false);
      }
    );
    // constraintKey intentionally represents the caller's query constraints.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, constraintKey]);

  return { data, loading, error };
}

export const queryOrderBy = orderBy;
export const queryLimit = limit;
