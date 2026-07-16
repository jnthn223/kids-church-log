"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Card, EmptyState } from "@kcl/ui";
import { useMinistryCollection } from "@kcl/firebase";
import type { FamilyPassSecret, Household } from "@kcl/types";
import { FamilyPassCard } from "@/components/family-pass-card";

export default function PassesPage() {
  const families = useMinistryCollection<Household>("households");
  const passes = useMinistryCollection<FamilyPassSecret>("familyPassSecrets");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const familyId = new URLSearchParams(window.location.search).get("family");
    if (familyId) setSelected(familyId);
  }, []);

  const filtered = useMemo(
    () => families.data.filter((family) => family.householdName.toLowerCase().includes(query.toLowerCase())),
    [families.data, query]
  );
  const family = families.data.find((item) => item.id === selected);
  const pass = passes.data.find((item) => item.id === selected || item.householdId === selected);

  return <>
    <div className="page-heading"><div><h2>Family Passes</h2><p>Print, download, copy, or reprint an active pass. Verify the family before replacing a lost or damaged credential.</p></div></div>
    <div className="passes-layout grid grid-2">
      <Card className="pass-browser section">
        <div className="field"><label htmlFor="pass-search">Find a family</label><input id="pass-search" placeholder="Household name" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="family-list">{filtered.map((item) => <button key={item.id} className="family-row" onClick={() => setSelected(item.id)}><div><h3>{item.householdName}</h3><p>{item.childIds?.length || 0} children · {item.passStatus || "No pass"}</p></div></button>)}</div>
      </Card>
      <div className="pass-print-area">{family && pass
        ? <FamilyPassCard family={family} pass={pass} />
        : <Card><EmptyState title={selected ? "Pass unavailable" : "Choose a family"} description={selected ? "This family does not have a readable active pass. Escalate disabled or disputed cases to a Ministry Lead." : "Select a registered family to view its printable Family Pass."} action={<span className="empty-symbol"><BadgeCheck /></span>} /></Card>}
      </div>
    </div>
  </>;
}
