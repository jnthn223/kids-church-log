"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, Card } from "@kcl/ui";
import { getMinistryProfile, saveMinistryProfile, useAuthAccess } from "@kcl/firebase";

export function SettingsScreen() {
  const { member } = useAuthAccess();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Manila");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void getMinistryProfile().then((profile) => {
      if (!profile) return;
      setName(profile.name || "");
      setTimezone(profile.timezone || "Asia/Manila");
      setContact(profile.contactInformation || "");
    });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!member) return;

    setBusy(true);
    try {
      await saveMinistryProfile(member, {
        name,
        timezone,
        locale: "en-PH",
        contactInformation: contact,
        active: true,
        schemaVersion: 1
      });
      setNotice("Ministry settings saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-2">
      <Card className="section">
        <div className="section-head"><h3>Ministry profile</h3></div>
        <form onSubmit={save}>
          {notice && <div className="form-success">{notice}</div>}
          <div className="field">
            <label>Ministry name</label>
            <input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label>Timezone</label>
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              <option>Asia/Manila</option>
              <option>Asia/Singapore</option>
              <option>UTC</option>
            </select>
          </div>
          <div className="field">
            <label>Ministry contact</label>
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="Church office contact"
            />
          </div>
          <Button disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
        </form>
      </Card>

      <Card className="section">
        <div className="section-head"><h3>Access governance</h3></div>
        <dl>
          <Definition term="Lead review">Every 90–180 days, by another Lead</Definition>
          <Definition term="Review warning">30 days before expiration</Definition>
          <Definition term="Minimum Leads">2 active and unexpired</Definition>
          <Definition term="Emergency recovery">Two named technical custodians outside this app</Definition>
          <Definition term="MFA policy">Google 2-Step Verification; optional TOTP, never SMS</Definition>
        </dl>
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
