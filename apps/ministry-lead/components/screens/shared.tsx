import type { ReactNode } from "react";
import { Card } from "@kcl/ui";
import type { MinistryMember } from "@kcl/types";
import { isExpired } from "@kcl/utils";

export function ScreenLoading() {
  return (
    <div className="loading">
      <div>
        <div className="spinner" />
        Loading ministry information…
      </div>
    </div>
  );
}

export function ScreenError({ code }: { code: string }) {
  return (
    <div className="error-box" role="alert">
      This information could not be loaded. Diagnostic: {code}
    </div>
  );
}

export function Metric({
  label,
  value,
  foot
}: {
  label: string;
  value: string | number;
  foot: string;
}) {
  return (
    <Card className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{foot}</div>
    </Card>
  );
}

export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function membershipStatusTone(member: MinistryMember) {
  if (member.status !== "ACTIVE" || isExpired(member.expiresAt)) return "danger" as const;

  const expiresAt = new Date(
    (member.expiresAt as { toDate?: () => Date })?.toDate?.() || String(member.expiresAt)
  );

  return expiresAt.getTime() - Date.now() < 30 * 86_400_000
    ? ("warning" as const)
    : ("success" as const);
}
