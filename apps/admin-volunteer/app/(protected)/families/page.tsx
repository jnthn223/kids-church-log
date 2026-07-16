"use client";
import { useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Card } from "@kcl/ui";
import type { Household } from "@kcl/types";
import { FamilyRecord } from "@/components/family-record";
import { FamilySearch } from "@/components/family-search";

export default function FamiliesPage() {
  const [family, setFamily] = useState<Household | null>(null);
  return <><div className="page-heading"><div><h2>Families</h2><p>Find an existing registration, continue an ordinary update, or reprint its active Family Pass. Attendance history is intentionally not available here.</p></div><Link className="button button-primary" href="/register/"><UserPlus size={19} /> Register family</Link></div><Card className="section" style={{ marginTop: 0 }}><FamilySearch onSelect={setFamily} /></Card>{family && <FamilyRecord family={family} onClose={() => setFamily(null)} />}</>;
}
