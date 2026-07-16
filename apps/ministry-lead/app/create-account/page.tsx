"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark, Button } from "@kcl/ui";
import { createEmailAccessAccount, useAuthAccess } from "@kcl/firebase";
import { passwordRequirements, passwordValidationError } from "@kcl/validation";

function accountErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
  const message = error instanceof Error ? error.message : "";

  if (code.includes("email-already-in-use")) {
    return "An account already uses this email. Return to sign in or reset its password.";
  }
  if (code.includes("weak-password")) return "That password does not meet the security policy.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";

  const passwordMessages = ["At least 12 characters", "Use 3 of:", "Avoid common passwords"];
  if (passwordMessages.some((prefix) => message.startsWith(prefix))) return message;
  return "The account could not be created. Check your connection and try again.";
}

export default function CreateAccountPage() {
  const { state } = useAuthAccess();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state === "ACTIVE") router.replace("/overview/");
    else if (!["LOADING", "SIGNED_OUT"].includes(state)) router.replace("/access/");
  }, [state, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const confirmation = String(form.get("confirmation") || "");
    const passwordError = passwordValidationError(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await createEmailAccessAccount({
        displayName: String(form.get("displayName") || "").trim(),
        email: String(form.get("email") || "").trim().toLowerCase(),
        password,
        ministryResponsibility: String(form.get("responsibility") || "").trim(),
        requestReason: String(form.get("reason") || "").trim()
      });
      router.replace("/access/");
    } catch (accountError) {
      setError(accountErrorMessage(accountError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <BrandMark />
        <div>
          <span className="auth-tag">Access request</span>
          <h1>One identity. Explicit ministry access.</h1>
          <p>
            Creating an account proves who you are. Another Ministry Lead still reviews the request
            and decides which role, if any, is appropriate.
          </p>
        </div>
        <small className="muted">Never create a shared team account.</small>
      </section>
      <section className="auth-panel create-panel">
        <form className="auth-form" onSubmit={submit}>
          <BrandMark />
          <h2>Create your account</h2>
          <p>Tell church leadership who you are and why you need the Ministry Lead application.</p>
          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="field">
            <label htmlFor="displayName">Full name</label>
            <input
              id="displayName"
              name="displayName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="e.g. Mara Santos"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="responsibility">Ministry responsibility</label>
            <input
              id="responsibility"
              name="responsibility"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Kids Church coordinator or church admin"
            />
            <small className="muted">This is context for the reviewer, not an automatic role.</small>
          </div>
          <div className="field">
            <label htmlFor="reason">Why do you need access?</label>
            <textarea
              id="reason"
              name="reason"
              required
              minLength={10}
              maxLength={500}
              placeholder="Briefly describe the work you need to do in KidsChurchLog."
            />
          </div>
          <div className="split">
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby="password-requirements"
              />
            </div>
            <div className="field">
              <label htmlFor="confirmation">Confirm password</label>
              <input
                id="confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </div>
          </div>
          <ul id="password-requirements" className="password-requirements" aria-live="polite">
            {passwordRequirements(password).map((requirement) => (
              <li className={requirement.met ? "met" : ""} key={requirement.id}>
                <span aria-hidden="true">{requirement.met ? "✓" : "○"}</span>
                {requirement.label}
              </li>
            ))}
          </ul>
          <label className="consent-check">
            <input name="individualAccount" type="checkbox" required />
            <span>I am creating an individual account for myself, and the information above is accurate.</span>
          </label>
          <Button disabled={busy}>
            {busy ? "Creating account…" : "Create account and verify email"}
          </Button>
          <p className="auth-switch">
            Already have an account? <Link href="/sign-in/">Return to sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
