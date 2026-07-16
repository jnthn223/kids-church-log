"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, Button } from "@kcl/ui";
import { resetPassword, signInEmail, signInGoogle, useAuthAccess } from "@kcl/firebase";

function signInMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (["invalid-credential", "invalid-login-credentials", "user-not-found", "wrong-password"].some((value) => code.includes(value))) return "That email or password was not accepted.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("user-disabled")) return "This sign-in account has been disabled. Ask a Ministry Lead for help.";
  if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
  if (code.includes("popup-blocked")) return "The browser blocked the Google sign-in window. Allow popups for this site, then try again.";
  if (code.includes("cancelled-popup-request")) return "Another Google sign-in attempt was already open. Close it, then try again.";
  if (code.includes("account-exists-with-different-credential")) return "This email already uses another sign-in method. Sign in with email and password first.";
  if (code.includes("too-many")) return "Too many attempts. Wait a moment, then try again.";
  if (code.includes("unauthorized-domain")) return "This station address is not authorized for sign-in. Ask a Ministry Lead for help.";
  if (code.includes("operation-not-allowed") || code.includes("configuration-not-found")) return "This sign-in method is not enabled for the ministry project.";
  if (code.includes("web-storage-unsupported")) return "This browser is blocking sign-in storage. Enable cookies/site storage or leave private browsing.";
  if (code.includes("network")) return "A connection is required to sign in safely.";
  const diagnostic = code || (error instanceof Error ? error.message : "AUTH_UNKNOWN");
  return `Sign-in could not be completed. Diagnostic: ${diagnostic}`;
}

export default function SignInPage() {
  const { state } = useAuthAccess();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (state === "ACTIVE") router.replace("/check-in/");
    else if (!["LOADING", "SIGNED_OUT"].includes(state)) router.replace("/access/");
  }, [state, router]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await signInEmail(email, password); } catch (value) { setError(signInMessage(value)); } finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setError("");
    try { await signInGoogle(); } catch (value) { setError(signInMessage(value)); } finally { setBusy(false); }
  }
  async function reset() {
    if (!email) { setError("Enter your email first, then choose Reset password."); return; }
    setBusy(true); setError("");
    try { await resetPassword(email); setNotice("Password reset instructions were sent if that account exists."); } catch (value) { setError(signInMessage(value)); } finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-story"><BrandMark /><div><span className="auth-tag">Kids Church Volunteer</span><h1>Fast check-in. Careful release. Every child known.</h1><p>Use the family’s pass to check children in and verify every checkout with an authorized guardian.</p></div><small>No family account or phone is required.</small></section><section className="auth-panel"><form className="auth-form" onSubmit={submit}><BrandMark /><h2>Start your station</h2><p>Sign in with your approved Sunday-team account.</p>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="form-success" role="status">{notice}</div>}<div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div><Button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button><button className="text-button" type="button" onClick={() => void reset()} disabled={busy}>Reset password</button><div className="divider">or</div><Button variant="secondary" type="button" onClick={() => void google()} disabled={busy}>Continue with Google</Button><p className="auth-switch">New Sunday team member? <Link href="/create-account/">Request access</Link></p></form></section></main>;
}
