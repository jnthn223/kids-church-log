"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, Button } from "@kcl/ui";
import { submitAccessRequestDetails, useAuthAccess } from "@kcl/firebase";

function requestError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("permission") || message.includes("insufficient")) return "Firebase did not allow the request. Deploy the latest Firestore rules, then try again.";
  if (message.includes("Verify your email")) return message;
  return "The access request could not be submitted. Check your connection and try again.";
}

export default function RequestAccessPage() {
  const { state, user, refresh } = useAuthAccess();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (state === "ACTIVE") router.replace("/overview/");
    else if (state === "SIGNED_OUT") router.replace("/sign-in/");
    else if (!["LOADING", "REQUEST_DETAILS_REQUIRED"].includes(state)) router.replace("/access/");
  }, [state, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") || "").trim();
    const ministryResponsibility = String(form.get("responsibility") || "").trim();
    const requestReason = String(form.get("reason") || "").trim();
    setBusy(true);
    setError("");
    try {
      await submitAccessRequestDetails({ displayName, ministryResponsibility, requestReason });
      await refresh();
      router.replace("/access/");
    } catch (reason) {
      setError(requestError(reason));
    } finally {
      setBusy(false);
    }
  }

  if (state === "LOADING") return <main className="loading"><div><div className="spinner" />Checking your account…</div></main>;

  return <main className="auth-page">
    <section className="auth-story">
      <BrandMark />
      <div><span className="auth-tag">Request recovery</span><h1>Your account is safe.</h1><p>Finish the missing ministry details so church leadership can identify you and review your access.</p></div>
      <small className="muted">This does not grant a role automatically.</small>
    </section>
    <section className="auth-panel create-panel"><form className="auth-form" onSubmit={submit}>
      <BrandMark />
      <h2>Complete access request</h2>
      <p>Signed in as <strong>{user?.email}</strong></p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="field"><label htmlFor="displayName">Full name</label><input id="displayName" name="displayName" autoComplete="name" required minLength={2} maxLength={100} defaultValue={user?.displayName || ""} placeholder="e.g. Mara Santos" /></div>
      <div className="field"><label htmlFor="responsibility">Ministry responsibility</label><input id="responsibility" name="responsibility" required minLength={2} maxLength={120} placeholder="e.g. Kids Church coordinator or church admin" /><small className="muted">This gives the reviewer context; it does not select your role.</small></div>
      <div className="field"><label htmlFor="reason">Why do you need access?</label><textarea id="reason" name="reason" required minLength={10} maxLength={500} placeholder="Briefly describe the work you need to do in KidsChurchLog." /></div>
      <Button disabled={busy}>{busy ? "Submitting request…" : "Submit for review"}</Button>
      <p className="auth-switch"><Link href="/access/">Back to access status</Link></p>
    </form></section>
  </main>;
}
