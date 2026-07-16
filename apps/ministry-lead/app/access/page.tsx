"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, Button, Card } from "@kcl/ui";
import { resendVerificationEmail, useAuthAccess } from "@kcl/firebase";

const copy = {
  VERIFY_EMAIL: ["Verify your email", "We sent a verification link to your email. Open it before your access request can be reviewed."],
  REQUEST_DETAILS_REQUIRED: ["Complete your access request", "Your account exists, but church leadership still needs your ministry information before it can be reviewed."],
  PENDING: ["Approval is still needed", "Your account is signed in, but a Ministry Lead has not granted access to this application."],
  SUSPENDED: ["Access is suspended", "Your ministry access is temporarily unavailable. Contact church leadership if you believe this is unexpected."],
  REVOKED: ["Access was removed", "This account no longer has access to ministry information."],
  EXPIRED: ["Membership review is due", "Your access term ended. Another active Ministry Lead must review and renew it."],
  WRONG_ROLE: ["This is the Ministry Lead app", "Your account is active, but it does not have the Ministry Lead role."],
  ERROR: ["We could not check access", "Check your connection and Firebase configuration, then try again."]
} as const;

export default function AccessPage() {
  const { state, error, user, refresh, signOutUser } = useAuthAccess();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    if (state === "ACTIVE") router.replace("/overview/");
    if (state === "SIGNED_OUT") router.replace("/sign-in/");
  }, [state, router]);

  if (state === "LOADING") return <main className="loading"><div><div className="spinner" />Checking ministry access…</div></main>;

  const [title, description] = copy[state as keyof typeof copy] || copy.ERROR;

  async function copyId() {
    if (!user) return;
    await navigator.clipboard.writeText(user.uid);
    setCopied(true);
  }

  async function resend() {
    setVerificationError("");
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch {
      setVerificationError("The verification email could not be sent yet. Please wait and try again.");
    }
  }

  return <main className="access-page"><Card className="access-card">
    <BrandMark />
    <h1>{title}</h1>
    <p>{description}</p>
    {state === "VERIFY_EMAIL" && user && <div className="setup-id">
      <span>Verification email</span>
      <code>{user.email}</code>
      {sent && <small className="form-success">A new verification email was sent.</small>}
      <Button variant="secondary" onClick={() => void resend()}>Resend verification email</Button>
    </div>}
    {state === "REQUEST_DETAILS_REQUIRED" && <Link className="button button-primary" href="/request-access/">Complete access request</Link>}
    {state === "PENDING" && user && <div className="setup-id">
      <span>Setup ID for the technical custodian</span>
      <code>{user.uid}</code>
      <Button variant="secondary" onClick={() => void copyId()}>{copied ? "Copied" : "Copy Setup ID"}</Button>
    </div>}
    {(error || verificationError) && <p className="error-box">{verificationError || `Diagnostic: ${error}`}</p>}
    {state !== "REQUEST_DETAILS_REQUIRED" && <Button onClick={() => void refresh()}>{state === "VERIFY_EMAIL" ? "I’ve verified my email" : "Refresh status"}</Button>}
    <Button variant="ghost" onClick={() => void signOutUser()}>Sign out</Button>
  </Card></main>;
}
