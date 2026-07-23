"use client";

import { useEffect, useMemo, useState } from "react";

export const KCL_SUPPORT_EMAIL = "kidschurchlog@googlegroups.com";
export const WHYTHOUGH_PORTFOLIO_URL = "https://whythough-space.web.app/";
export const SUPPORT_REPORT_EVENT = "kcl:support-report";

export type SupportReportContext = {
  errorCode?: string;
  summary?: string;
};

export type SupportReportInput = SupportReportContext & {
  appName: string;
  appVersion: string;
  category: string;
  description: string;
  online: boolean;
  pathname: string;
  reference: string;
  timestamp: Date;
};

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const familyKeyPattern = /\bKCL-[A-Z0-9-]{8,}\b/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/g;

export function sanitizeSupportDescription(value: string) {
  return value
    .replace(familyKeyPattern, "[Family Key redacted]")
    .replace(emailPattern, "[email redacted]")
    .replace(phonePattern, "[phone redacted]")
    .trim()
    .slice(0, 1200);
}

export function createSupportReference(timestamp = new Date(), random = Math.random()) {
  const date = timestamp.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.floor(random * 0x100000).toString(16).toUpperCase().padStart(5, "0");
  return `KCL-${date}-${suffix}`;
}

export function buildSupportReport(input: SupportReportInput) {
  const description = sanitizeSupportDescription(input.description);
  return [
    "KidsChurchLog problem report",
    `Reference: ${input.reference}`,
    `App: ${input.appName}`,
    `Screen: ${input.pathname || "/"}`,
    `Category: ${input.category}`,
    input.summary ? `Problem: ${input.summary}` : "",
    input.errorCode ? `Error code: ${input.errorCode}` : "",
    `Time: ${input.timestamp.toISOString()}`,
    `App version: ${input.appVersion}`,
    `Connection: ${input.online ? "Online" : "Offline"}`,
    "",
    "User description:",
    description || "No description provided."
  ].filter((line) => line !== "").join("\n");
}

export function requestSupportReport(context: SupportReportContext = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SupportReportContext>(SUPPORT_REPORT_EVENT, { detail: context }));
}

export function SupportErrorFallback({ error, reset }: { error: Error & { digest?: string }; reset(): void }) {
  return <main className="support-error-screen">
    <section>
      <span aria-hidden="true">!</span>
      <h1>Something went wrong</h1>
      <p>Your last action may not have completed. Try the screen again, or send a privacy-safe diagnostic report to KidsChurchLog Support.</p>
      <div><button className="button button-primary" type="button" onClick={reset}>Try again</button><button className="button button-secondary" type="button" onClick={() => requestSupportReport({ summary: "Unexpected application error", errorCode: error.digest || "UNEXPECTED_ERROR" })}>Report this problem</button></div>
    </section>
  </main>;
}

export function SupportReportLink({ label = "Need help?", className = "", context = {} }: { label?: string; className?: string; context?: SupportReportContext }) {
  return <button className={`support-report-link ${className}`} type="button" onClick={() => requestSupportReport(context)}>{label}</button>;
}

export function CreatorCredit({ className = "" }: { className?: string }) {
  return <a className={`creator-credit ${className}`} href={WHYTHOUGH_PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">Built with care by <strong>whyThough</strong></a>;
}

export function SupportReporter({ appName, appVersion = "0.1.0", showTrigger = false, showPublicHelp = true }: { appName: string; appVersion?: string; showTrigger?: boolean; showPublicHelp?: boolean }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Something failed");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState<SupportReportContext>({});
  const [reference, setReference] = useState("");
  const [timestamp, setTimestamp] = useState<Date>(() => new Date());
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  function show(nextContext: SupportReportContext = {}) {
    setContext(nextContext);
    setCategory(nextContext.summary ? "Something failed" : "Other");
    setDescription("");
    setReference(createSupportReference());
    setTimestamp(new Date());
    setCopied(false);
    setCopyError(false);
    setOpen(true);
  }

  useEffect(() => {
    const listener = (event: Event) => show((event as CustomEvent<SupportReportContext>).detail || {});
    window.addEventListener(SUPPORT_REPORT_EVENT, listener);
    return () => window.removeEventListener(SUPPORT_REPORT_EVENT, listener);
  }, []);

  const report = useMemo(() => buildSupportReport({
    appName,
    appVersion,
    category,
    description,
    errorCode: context.errorCode,
    summary: context.summary,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    pathname: typeof window === "undefined" ? "/" : window.location.pathname,
    reference,
    timestamp
  }), [appName, appVersion, category, context, description, reference, timestamp]);

  const ready = sanitizeSupportDescription(description).length >= 5;
  const subject = `[KidsChurchLog Support] ${appName} · ${reference}`;
  const emailHref = `mailto:${KCL_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(report)}`;

  async function copyReport() {
    setCopied(false);
    setCopyError(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
      } else {
        const field = document.createElement("textarea");
        field.value = report;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const successful = document.execCommand("copy");
        field.remove();
        if (!successful) throw new Error("COPY_FAILED");
      }
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }

  return <>
    {showPublicHelp && <SupportReportLink className="support-public-help" />}
    {showTrigger && <button className="support-report-trigger" type="button" onClick={() => show()} aria-haspopup="dialog">
      <span aria-hidden="true">?</span> Help & report
    </button>}
    {open && <div className="support-report-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="support-report-dialog" role="dialog" aria-modal="true" aria-labelledby="support-report-title">
        <div className="support-report-head">
          <div><small>KidsChurchLog Support</small><h2 id="support-report-title">Report a problem</h2></div>
          <button type="button" aria-label="Close support report" onClick={() => setOpen(false)}>×</button>
        </div>
        <p>Tell us what happened and we’ll prepare an email to <a href={`mailto:${KCL_SUPPORT_EMAIL}`}>{KCL_SUPPORT_EMAIL}</a>.</p>
        {context.summary && <div className="support-detected-error"><strong>Detected problem</strong><span>{context.summary}{context.errorCode ? ` (${context.errorCode})` : ""}</span></div>}
        <label className="support-report-field"><span>Type of problem</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Something failed</option><option>Cannot sign in or access the app</option><option>Information looks incorrect</option><option>Suggestion</option><option>Other</option></select></label>
        <label className="support-report-field"><span>What happened?</span><textarea required minLength={5} maxLength={1200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what you tried, what you expected, and what happened instead." /></label>
        <div className="support-privacy-note"><strong>Protect family privacy</strong><span>Do not enter names, medical details, phone numbers, passwords, or Family Keys. Common email, phone, and Family Key patterns are automatically redacted.</span></div>
        <p className="support-report-meta">Reference {reference} · {appName} · current screen and connection status will be included.</p>
        {copied && <p className="support-report-success" role="status">Report copied. Paste it into your preferred message.</p>}
        {copyError && <p className="support-report-error" role="alert">Your browser could not copy the report. Use the email option instead.</p>}
        <div className="support-report-actions"><button type="button" className="button button-ghost" disabled={!ready} onClick={() => void copyReport()}>Copy report</button><a className={`button button-primary ${ready ? "" : "disabled"}`} href={ready ? emailHref : undefined} aria-disabled={!ready} onClick={(event) => { if (!ready) event.preventDefault(); }}>Email support</a></div>
        <p className="support-attribution">KidsChurchLog by WhyThough Space</p>
      </section>
    </div>}
  </>;
}
