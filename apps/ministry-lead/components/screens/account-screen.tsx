"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button, Card } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";
import { formatDate } from "@kcl/utils";
import { ScreenLoading } from "./shared";

export function AccountScreen() {
  const { user, member, refresh, signOutUser } = useAuthAccess();
  if (!member) return <ScreenLoading />;

  return (
    <div className="account-grid">
      <Card className="section">
        <div className="section-head"><h3>Authenticated identity</h3></div>
        <dl>
          <Definition term="Name">{member.displayName}</Definition>
          <Definition term="Email">{member.email}</Definition>
          <Definition term="Providers">
            {user?.providerData.map((provider) => provider.providerId).join(", ") || "—"}
          </Definition>
          <Definition term="Roles">
            {member.roles.map((role) => role.replaceAll("_", " ")).join(", ")}
          </Definition>
          <Definition term="Access expires">{formatDate(member.expiresAt)}</Definition>
        </dl>
        <div className="toolbar">
          <Button onClick={() => void refresh()}><RefreshCw size={16} /> Refresh access</Button>
          <Button variant="ghost" onClick={() => void signOutUser()}>Sign out</Button>
        </div>
      </Card>

      <Card className="section">
        <div className="section-head"><h3>Security responsibilities</h3></div>
        <p className="muted">
          Use your individual church-managed Google account with 2-Step Verification. Never share
          credentials or approve your own access.
        </p>
        <p className="muted">
          Technical custodians recover Firebase access outside this application and do not receive
          Ministry Lead privileges automatically.
        </p>
      </Card>
    </div>
  );
}

function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="definition">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
