"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthAccess } from "@kcl/firebase";

export default function Home() {
  const { state } = useAuthAccess();
  const router = useRouter();

  useEffect(() => {
    if (state === "ACTIVE") router.replace("/overview/");
    else if (state === "SIGNED_OUT") router.replace("/sign-in/");
    else if (state !== "LOADING") router.replace("/access/");
  }, [state, router]);

  return (
    <main className="loading">
      <div><div className="spinner" />Checking ministry access…</div>
    </main>
  );
}
