"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, Button } from "@kcl/ui";
import { resetPassword, signInEmail, signInGoogle, useAuthAccess } from "@kcl/firebase";

function signInErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
  if (code.includes("invalid-credential")) return "That email or password was not accepted.";
  if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
  if (code.includes("too-many")) return "Too many attempts. Please wait, then try again.";
  return "Sign-in is unavailable right now. Check your connection and try again.";
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
    if (state === "ACTIVE") router.replace("/overview/");
    else if (state === "WRONG_ROLE") router.replace("/");
    else if (!["LOADING", "SIGNED_OUT"].includes(state)) router.replace("/access/");
  }, [state, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInEmail(email, password);
    } catch (signInError) {
      setError(signInErrorMessage(signInError));
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    setBusy(true);
    setError("");
    try {
      await signInGoogle();
    } catch (signInError) {
      setError(signInErrorMessage(signInError));
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    if (!email) {
      setError("Enter your email first, then choose Reset password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await resetPassword(email);
      setNotice("Password reset instructions were sent if that account exists.");
    } catch (resetError) {
      setError(signInErrorMessage(resetError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <BrandMark />
        <div>
          <span className="auth-tag">Ministry Lead</span>
          <h1>Careful oversight for every child and every team.</h1>
          <p>
            Configure ministry operations, review access, and understand attendance without getting
            in the way of Sunday service.
          </p>
        </div>
        <small className="muted">Check in. Show up. Grow in Jesus.</small>
      </section>
      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <BrandMark />
          <h2>Welcome back</h2>
          <p>Sign in with your individual, approved ministry account.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          {notice && <div className="form-success" role="status">{notice}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</Button>
          <button
            className="text-button"
            type="button"
            onClick={() => void sendPasswordReset()}
            disabled={busy}
          >
            Reset password
          </button>
          <div className="divider">or</div>
          <Button
            variant="secondary"
            type="button"
            onClick={() => void continueWithGoogle()}
            disabled={busy}
          >
            Continue with Google
          </Button>
          <p className="auth-switch">
            New ministry team member? <Link href="/create-account/">Create an account and request access</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
