"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, Button } from "@kcl/ui";
import {
  createEmailAccessAccount,
  submitAccessRequestDetails
} from "@kcl/firebase";

export function AccessRequestForm({ recovery = false }: { recovery?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState({
    displayName: "",
    email: "",
    password: "",
    confirm: "",
    ministryResponsibility: "Kids Church Sunday operations",
    requestReason: ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!recovery && values.password !== values.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const details = {
        displayName: values.displayName,
        ministryResponsibility: values.ministryResponsibility,
        requestReason: values.requestReason
      };
      if (recovery) {
        await submitAccessRequestDetails(details, "KIDS_CHURCH_VOLUNTEER");
      } else {
        await createEmailAccessAccount(
          { ...details, email: values.email, password: values.password },
          "KIDS_CHURCH_VOLUNTEER"
        );
      }
      router.replace("/access/");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Your request could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page"><section className="auth-story"><BrandMark /><div><span className="auth-tag">Sunday team access</span><h1>Welcome children safely, one family at a time.</h1><p>Accounts stay pending until a Ministry Lead approves the Kids Church Volunteer role.</p></div></section><section className="auth-panel"><form className="auth-form" onSubmit={submit}><BrandMark /><h2>{recovery ? "Complete your request" : "Request access"}</h2><p>Use your own ministry account. Never share a station login.</p>{error && <div className="form-error" role="alert">{error}</div>}<div className="field"><label htmlFor="name">Full name</label><input id="name" required minLength={2} value={values.displayName} onChange={(event) => set("displayName", event.target.value)} /></div>{!recovery && <><div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={values.email} onChange={(event) => set("email", event.target.value)} /></div><div className="field"><label htmlFor="password">Password</label><input id="password" type="password" required minLength={12} value={values.password} onChange={(event) => set("password", event.target.value)} /><small>Use at least 12 characters.</small></div><div className="field"><label htmlFor="confirm">Confirm password</label><input id="confirm" type="password" required value={values.confirm} onChange={(event) => set("confirm", event.target.value)} /></div></>}<div className="field"><label htmlFor="responsibility">Sunday responsibility</label><input id="responsibility" required minLength={2} maxLength={120} value={values.ministryResponsibility} onChange={(event) => set("ministryResponsibility", event.target.value)} /></div><div className="field"><label htmlFor="reason">Why do you need access?</label><textarea id="reason" required minLength={10} maxLength={500} value={values.requestReason} onChange={(event) => set("requestReason", event.target.value)} /></div><Button disabled={busy}>{busy ? "Submitting…" : "Submit request"}</Button></form></section></main>;
}
