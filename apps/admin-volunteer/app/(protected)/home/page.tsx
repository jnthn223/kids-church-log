"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Search, UserPlus, Users } from "lucide-react";
import { Card } from "@kcl/ui";
import { FamilySearch } from "@/components/family-search";

export default function HomePage() {
  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => setHasDraft(Boolean(localStorage.getItem("kcl-admin-registration-draft"))), []);

  return <>
    <section className="hero card"><div><h2>Welcome the next family with confidence.</h2><p>Register together, review safety details aloud, and let the app check for possible duplicate records as you go.</p><Link className="button button-primary" href="/register/"><UserPlus size={20} /> Register a family</Link></div><div className="hero-icon"><Users size={65} /></div></section>
    {hasDraft && <div className="draft"><span><strong>Unsaved registration draft</strong><br /><small>This device has an incomplete family registration.</small></span><Link className="button button-secondary" href="/register/">Continue</Link></div>}
    <section className="grid grid-3" style={{ marginTop: 22 }}>
      <Card className="quick-card"><Search /><h3>Find a family</h3><p>Open an existing family to update registration details or add a guardian or child.</p><Link className="button button-ghost" href="/families/">Search families</Link></Card>
      <Card className="quick-card"><BadgeCheck /><h3>Reprint a pass</h3><p>Open an active Family Pass for a paper or card reprint.</p><Link className="button button-ghost" href="/passes/">Open passes</Link></Card>
      <Card className="quick-card"><UserPlus /><h3>Register a new family</h3><p>The guided form automatically checks household, guardian, and child details for possible matches.</p><Link className="button button-ghost" href="/register/">Start registration</Link></Card>
    </section>
    <Card className="section"><div className="section-head"><h3>Recently registered families</h3><Link href="/families/">View all</Link></div><FamilySearch compact /></Card>
  </>;
}
