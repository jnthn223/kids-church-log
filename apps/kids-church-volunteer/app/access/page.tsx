"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, Button, Card } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";

const copy = {
  VERIFY_EMAIL: ["Verify your email", "Open the verification link before church leadership reviews your request."],
  REQUEST_DETAILS_REQUIRED: ["Complete your access request", "Tell church leadership how you will help with Sunday operations."],
  PENDING: ["Approval is still needed", "A Ministry Lead must grant the Kids Church Volunteer role before you can handle attendance."],
  SUSPENDED: ["Access is suspended", "Contact church leadership if this is unexpected."],
  REVOKED: ["Access was removed", "This account no longer has Sunday operations access."],
  EXPIRED: ["Membership review is due", "Your service term ended and a Ministry Lead must renew it."],
  WRONG_ROLE: ["This is the Sunday Team app", "Your active account does not have the Kids Church Volunteer role."],
  ERROR: ["We could not check access", "Check your connection, then try again."]
} as const;

export default function AccessPage() {
  const { state, error, user, refresh, signOutUser } = useAuthAccess();
  const router = useRouter();
  useEffect(() => {
    if (state === "ACTIVE") router.replace("/check-in/");
    if (state === "SIGNED_OUT") router.replace("/sign-in/");
  }, [state, router]);
  if (state === "LOADING") return <main className="loading"><div className="spinner" />Checking access…</main>;
  const [title, description] = copy[state as keyof typeof copy] || copy.ERROR;
  return <main className="access-page"><Card className="access-card"><BrandMark /><h1>{title}</h1><p>{description}</p>{state === "REQUEST_DETAILS_REQUIRED" && <Link className="button button-primary" href="/request-access/">Complete access request</Link>}{state === "PENDING" && user && <div className="setup-id"><strong>Setup ID</strong><code>{user.uid}</code></div>}{error && <p className="form-error">Diagnostic: {error}</p>}<Button onClick={() => void refresh()}>Refresh status</Button><Button variant="ghost" onClick={() => void signOutUser()}>Sign out</Button></Card></main>;
}
