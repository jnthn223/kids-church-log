"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { StatusChip } from "@kcl/ui";
import { useMinistryCollection, type FamilyRegistrationInput } from "@kcl/firebase";
import type { Child, Guardian, Household } from "@kcl/types";

type SearchableGuardian = Guardian & { normalizedPhone?: string; normalizedEmail?: string };
type SearchableHousehold = Household & { normalizedHouseholdName?: string };

export type DuplicateMatch = {
  householdId: string;
  householdName: string;
  reasons: string[];
  exact: boolean;
};

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const digits = (value: string) => value.replace(/\D/g, "");

export function DuplicateFamilyWarning({
  values,
  confirmedDifferent,
  onConfirmedDifferentChange,
  onDetected,
  onReadyChange
}: {
  values: FamilyRegistrationInput;
  confirmedDifferent: boolean;
  onConfirmedDifferentChange(value: boolean): void;
  onDetected(matches: DuplicateMatch[]): void;
  onReadyChange(ready: boolean): void;
}) {
  const households = useMinistryCollection<SearchableHousehold>("households");
  const guardians = useMinistryCollection<SearchableGuardian>("guardians");
  const children = useMinistryCollection<Child>("children");
  const ready = !households.loading && !guardians.loading && !children.loading && !households.error && !guardians.error && !children.error;

  const matches = useMemo(() => {
    const reasons = new Map<string, { reasons: Set<string>; exact: boolean }>();
    const add = (householdId: string, reason: string, exact = true) => {
      const current = reasons.get(householdId) || { reasons: new Set<string>(), exact: false };
      current.reasons.add(reason);
      current.exact ||= exact;
      reasons.set(householdId, current);
    };

    const householdName = normalize(values.householdName);
    if (householdName.length >= 4) {
      households.data.forEach((household) => {
        const existing = household.normalizedHouseholdName || normalize(household.householdName);
        if (existing === householdName) add(household.id, "Same household name");
        else if (householdName.length >= 6 && existing.length >= 6 && (existing.includes(householdName) || householdName.includes(existing))) {
          add(household.id, "Similar household name", false);
        }
      });
    }

    values.guardians.forEach((guardian) => {
      const phone = digits(guardian.phone);
      const email = normalize(guardian.email || "");
      guardians.data.forEach((existing) => {
        const existingPhone = existing.normalizedPhone || digits(existing.phone);
        const existingEmail = existing.normalizedEmail || normalize(existing.email || "");
        if (phone.length >= 7 && phone === existingPhone) add(existing.householdId, `Phone already belongs to ${existing.fullName}`);
        if (email && email === existingEmail) add(existing.householdId, `Email already belongs to ${existing.fullName}`);
      });
    });

    values.children.forEach((child) => {
      const childName = normalize(`${child.firstName} ${child.lastName}`);
      if (!child.firstName.trim() || !child.lastName.trim() || !child.birthdate) return;
      children.data.forEach((existing) => {
        const existingName = normalize(`${existing.firstName} ${existing.lastName}`);
        if (childName === existingName && child.birthdate === existing.birthdate) {
          add(existing.householdId, `${child.firstName} ${child.lastName} has the same name and birthdate`);
        }
      });
    });

    return Array.from(reasons, ([householdId, match]) => ({
      householdId,
      householdName: households.data.find((household) => household.id === householdId)?.householdName || "Existing family",
      reasons: Array.from(match.reasons),
      exact: match.exact
    })).sort((a, b) => Number(b.exact) - Number(a.exact));
  }, [children.data, guardians.data, households.data, values]);

  const signature = matches.map((match) => `${match.householdId}:${match.reasons.join("|")}`).join(";");
  useEffect(() => onDetected(matches), [signature]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onReadyChange(Boolean(ready)), [ready, onReadyChange]);

  if (households.error || guardians.error || children.error) {
    return <div className="alert alert-error" role="alert">Duplicate checking is unavailable. Check the connection before issuing a Family Pass.</div>;
  }

  if (!matches.length) return null;

  return <section className="duplicate-warning" aria-live="polite">
    <div className="duplicate-warning-head"><AlertTriangle aria-hidden="true" /><div><h3>Possible existing family found</h3><p>Review these records before creating another household.</p></div></div>
    <div className="duplicate-matches">{matches.map((match) => <article key={match.householdId} className="duplicate-match"><div><strong>{match.householdName}</strong><ul>{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><StatusChip tone={match.exact ? "danger" : "warning"}>{match.exact ? "Strong match" : "Possible match"}</StatusChip></article>)}</div>
    <div className="duplicate-actions"><Link className="button button-secondary" href="/families/" target="_blank">Review family records <ExternalLink size={16} /></Link><label className="check"><input type="checkbox" checked={confirmedDifferent} onChange={(event) => onConfirmedDifferentChange(event.target.checked)} /><span><strong>These are different families</strong><br /><small>I reviewed the possible matches with the guardian.</small></span></label></div>
  </section>;
}
