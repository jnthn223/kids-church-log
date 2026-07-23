import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export { buildSupportReport, createSupportReference, CreatorCredit, KCL_SUPPORT_EMAIL, requestSupportReport, sanitizeSupportDescription, SupportErrorFallback, SupportReporter, SupportReportLink, WHYTHOUGH_PORTFOLIO_URL } from "./support-report";
export type { SupportReportContext, SupportReportInput } from "./support-report";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="brand" aria-label="Kids Church Log"><span className="brand-shapes" aria-hidden="true"><i className="shape triangle"/><i className="shape square"/><i className="shape circle"/></span>{!compact && <span className="brand-name">Kids Church <b>Log</b></span>}</div>;
}
export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) { return <button className={`button button-${variant} ${className}`} {...props}/>; }
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`card ${className}`} {...props}/>; }
export function StatusChip({ tone = "neutral", children }: { tone?: "success" | "warning" | "danger" | "info" | "neutral"; children: ReactNode }) { return <span className={`status status-${tone}`}>{children}</span>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="empty-state"><span className="empty-symbol" aria-hidden="true">✦</span><h3>{title}</h3><p>{description}</p>{action}</div>; }
