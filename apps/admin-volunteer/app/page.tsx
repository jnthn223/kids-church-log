"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthAccess } from "@kcl/firebase";
export default function HomeRedirect() { const { state } = useAuthAccess(); const router = useRouter(); useEffect(() => { if (state === "ACTIVE") router.replace("/home/"); else if (state === "SIGNED_OUT") router.replace("/sign-in/"); else if (state !== "LOADING") router.replace("/access/"); }, [state, router]); return <main className="loading"><div><div className="spinner" />Preparing registration…</div></main>; }
