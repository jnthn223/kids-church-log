"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Button, Card, StatusChip } from "@kcl/ui";
import {
  addChildToFamily,
  addGuardianToFamily,
  updateRegistrationDocument,
  useAuthAccess,
  useMinistryCollection
} from "@kcl/firebase";
import type { Child, Guardian, Household, MinistryGroup } from "@kcl/types";
import { childRegistrationSchema, guardianSchema } from "@kcl/validation";
import { Modal } from "@/components/modal";
import { AgeGroupGuidance } from "@/components/age-group-guidance";

type HouseholdDetail = Household & { address?: string; preferredContactMethod?: string; emergencyContactSummary?: { name?: string; phone?: string } };
const newGuardian = () => ({ fullName: "", phone: "", email: "", relationship: "Parent", authorizedPickup: false, emergencyContact: false });
const newChild = () => ({ firstName: "", lastName: "", preferredName: "", birthdate: "", ministryGroupId: "", allergies: "", medicalNotes: "", assistanceNotes: "" });

export function FamilyRecord({ family, onClose }: { family: HouseholdDetail; onClose(): void }) {
  const { member } = useAuthAccess();
  const guardianData = useMinistryCollection<Guardian>("guardians");
  const childData = useMinistryCollection<Child>("children");
  const groupData = useMinistryCollection<MinistryGroup>("ministryGroups");
  const guardians = guardianData.data.filter((item) => item.householdId === family.id && item.active);
  const children = childData.data.filter((item) => item.householdId === family.id && item.active);
  const groups = useMemo(() => groupData.data.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder), [groupData.data]);

  const [tab, setTab] = useState("overview");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [overview, setOverview] = useState({ householdName: family.householdName, address: family.address || "", preferredContactMethod: family.preferredContactMethod || "PHONE", emergencyName: family.emergencyContactSummary?.name || "", emergencyPhone: family.emergencyContactSummary?.phone || "" });
  const [guardian, setGuardian] = useState(newGuardian);
  const [guardianChildIds, setGuardianChildIds] = useState<string[]>([]);
  const [child, setChild] = useState(newChild);
  const [childGuardianIds, setChildGuardianIds] = useState<string[]>([]);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [contactEdit, setContactEdit] = useState({ phone: "", email: "" });
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [careEdit, setCareEdit] = useState({ allergies: "", medicalNotes: "", assistanceNotes: "" });

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); setError("");
    try { await action(); setNotice(success); setAdding(false); return true; }
    catch (value) { setError(value instanceof Error ? value.message : "The record could not be saved."); return false; }
    finally { setBusy(false); }
  };

  async function saveOverview(event: FormEvent) {
    event.preventDefault();
    if (!member) return;
    if (overview.householdName.trim().length < 2 || overview.emergencyName.trim().length < 2 || overview.emergencyPhone.trim().length < 7) return setError("Complete the household and emergency contact details.");
    await run(() => updateRegistrationDocument(member, "households", family.id, { householdName: overview.householdName.trim(), normalizedHouseholdName: overview.householdName.trim().toLowerCase(), address: overview.address.trim(), preferredContactMethod: overview.preferredContactMethod, emergencyContactSummary: { name: overview.emergencyName.trim(), phone: overview.emergencyPhone.trim() } }, "Ordinary registration details corrected with guardian"), "Household details updated.");
  }

  async function saveGuardian(event: FormEvent) {
    event.preventDefault();
    if (!member) return;
    const parsed = guardianSchema.safeParse(guardian);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message || "Complete the guardian details.");
    const guardianValues = { ...parsed.data, authorizedPickup: guardianChildIds.length > 0 };
    await run(() => addGuardianToFamily(member, family.id, children.map((item) => item.id), guardianChildIds, guardianValues), "Guardian added with per-child pickup authorization.");
    setGuardian(newGuardian()); setGuardianChildIds([]);
  }

  async function saveChild(event: FormEvent) {
    event.preventDefault();
    if (!member) return;
    const parsed = childRegistrationSchema.safeParse(child);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message || "Complete the child details.");
    if (!childGuardianIds.length) return setError("Choose at least one authorized pickup guardian.");
    await run(() => addChildToFamily(member, family.id, guardians.map((item) => item.id), childGuardianIds, parsed.data), "Child added with per-child pickup authorization.");
    setChild(newChild()); setChildGuardianIds([]);
  }

  function editGuardian(item: Guardian) {
    setError("");
    setEditingGuardian(item);
    setContactEdit({ phone: item.phone, email: item.email || "" });
  }

  function editCare(item: Child) {
    setError("");
    setEditingChild(item);
    setCareEdit({ allergies: item.allergies || "", medicalNotes: item.medicalNotes || "", assistanceNotes: item.assistanceNotes || "" });
  }

  async function saveContactEdit(event: FormEvent) {
    event.preventDefault();
    if (!member || !editingGuardian) return;
    const parsed = guardianSchema.safeParse({ ...editingGuardian, phone: contactEdit.phone, email: contactEdit.email });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message || "Review the contact information.");
    const saved = await run(() => updateRegistrationDocument(member, "guardians", editingGuardian.id, { phone: parsed.data.phone, normalizedPhone: parsed.data.phone.replace(/\D/g, ""), email: parsed.data.email || "", normalizedEmail: (parsed.data.email || "").toLowerCase() }, "Guardian contact details corrected with family"), "Guardian contact updated.");
    if (saved) setEditingGuardian(null);
  }

  async function saveCareEdit(event: FormEvent) {
    event.preventDefault();
    if (!member || !editingChild) return;
    if (careEdit.allergies.length > 1000 || careEdit.medicalNotes.length > 2000 || careEdit.assistanceNotes.length > 2000) return setError("Care information exceeds the allowed length.");
    const saved = await run(() => updateRegistrationDocument(member, "children", editingChild.id, { allergies: careEdit.allergies.trim(), medicalNotes: careEdit.medicalNotes.trim(), assistanceNotes: careEdit.assistanceNotes.trim() }, "Child safety information reviewed with guardian"), "Child care information updated.");
    if (saved) setEditingChild(null);
  }

  function startAddingGuardian() {
    setGuardian(newGuardian());
    setGuardianChildIds(children.map((item) => item.id));
    setAdding(true);
  }

  function startAddingChild() {
    setChild(newChild());
    setChildGuardianIds(guardians.map((item) => item.id));
    setAdding(true);
  }

  return <Card className="section family-record">
    <div className="section-head"><div><small className="muted">Family registration record</small><h2>{family.householdName}</h2></div><Button variant="ghost" aria-label="Close family record" onClick={onClose}><X /></Button></div>
    {notice && <div className="form-success" role="status">{notice}</div>}{error && <div className="form-error" role="alert">{error}</div>}
    <div className="record-tabs" role="tablist">{["overview", "guardians", "children", "pass"].map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setAdding(false); }}>{item === "pass" ? "Family Pass" : item[0].toUpperCase() + item.slice(1)}</button>)}</div>

    {tab === "overview" && <form onSubmit={(event) => void saveOverview(event)}><div className="split"><Field label="Household name" value={overview.householdName} onChange={(value) => setOverview({ ...overview, householdName: value })} /><label className="field"><span>Preferred contact</span><select value={overview.preferredContactMethod} onChange={(event) => setOverview({ ...overview, preferredContactMethod: event.target.value })}><option value="PHONE">Phone</option><option value="EMAIL">Email</option><option value="IN_PERSON">In person</option></select></label></div><Field label="Address" value={overview.address} onChange={(value) => setOverview({ ...overview, address: value })} textarea /><div className="split"><Field label="Emergency contact" value={overview.emergencyName} onChange={(value) => setOverview({ ...overview, emergencyName: value })} /><Field label="Emergency phone" value={overview.emergencyPhone} onChange={(value) => setOverview({ ...overview, emergencyPhone: value })} /></div><Button disabled={busy}>{busy ? "Saving…" : "Save ordinary corrections"}</Button><p className="help">Household deactivation and disputed changes must be escalated to a Ministry Lead.</p></form>}

    {tab === "guardians" && <>{guardians.map((item) => { const authorizedChildren = children.filter((childItem) => childItem.authorizedGuardianIds?.includes(item.id)); return <article className="family-row" key={item.id}><div><h3>{item.fullName}</h3><p>{item.relationship} · {item.phone}{item.email ? ` · ${item.email}` : ""}</p><small className="muted">Pickup: {authorizedChildren.map((childItem) => childItem.preferredName || childItem.firstName).join(", ") || "No children"}</small></div><div className="row-side"><StatusChip tone={authorizedChildren.length ? "success" : "neutral"}>{authorizedChildren.length ? `${authorizedChildren.length} authorized` : "Not authorized"}</StatusChip><Button variant="ghost" onClick={() => void editGuardian(item)}>Edit contact</Button></div></article>; })}{adding ? <form className="sub-card" onSubmit={(event) => void saveGuardian(event)}><h3>Add guardian</h3><div className="split"><Field label="Full name" value={guardian.fullName} onChange={(value) => setGuardian({ ...guardian, fullName: value })} /><Field label="Phone" value={guardian.phone} onChange={(value) => setGuardian({ ...guardian, phone: value })} /><Field label="Email (optional)" value={guardian.email} onChange={(value) => setGuardian({ ...guardian, email: value })} /><Field label="Relationship" value={guardian.relationship} onChange={(value) => setGuardian({ ...guardian, relationship: value })} /></div><AuthorizationChoices title="Which children may this guardian pick up? (optional)" options={children.map((item) => ({ id: item.id, label: `${item.preferredName || item.firstName} ${item.lastName}` }))} selected={guardianChildIds} onChange={setGuardianChildIds} /><Button disabled={busy}>Add guardian</Button></form> : <Button variant="ghost" onClick={startAddingGuardian}><Plus size={17} /> Add guardian</Button>}<p className="help">New guardians default to all children. Clear every child only when this guardian is not authorized for pickup.</p></>}

    {tab === "children" && <>{children.map((item) => { const authorized = guardians.filter((guardianItem) => item.authorizedGuardianIds?.includes(guardianItem.id)); return <article className="family-row" key={item.id}><div><h3>{item.preferredName || item.firstName} {item.lastName}</h3><p>{item.birthdate} · {groups.find((group) => group.id === item.ministryGroupId)?.name || "Group not set"}</p><small className="muted">Pickup: {authorized.map((guardianItem) => guardianItem.fullName).join(", ") || "No guardian selected"}</small></div><div className="row-side">{(item.allergies || item.medicalNotes || item.assistanceNotes) && <StatusChip tone="danger">Care details</StatusChip>}<Button variant="ghost" onClick={() => void editCare(item)}>Update care info</Button></div></article>; })}{adding ? <form className="sub-card" onSubmit={(event) => void saveChild(event)}><h3>Add child</h3><div className="split"><Field label="First name" value={child.firstName} onChange={(value) => setChild({ ...child, firstName: value })} /><Field label="Last name" value={child.lastName} onChange={(value) => setChild({ ...child, lastName: value })} /><Field label="Preferred name" value={child.preferredName} onChange={(value) => setChild({ ...child, preferredName: value })} /><Field label="Birthdate" type="date" value={child.birthdate} onChange={(value) => setChild({ ...child, birthdate: value })} /></div><AgeGroupGuidance birthdate={child.birthdate} groups={groups} /><label className="field"><span>Ministry group</span><select value={child.ministryGroupId} onChange={(event) => setChild({ ...child, ministryGroupId: event.target.value })}><option value="">Choose group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><AuthorizationChoices title="Who may pick up this child?" options={guardians.map((item) => ({ id: item.id, label: item.fullName }))} selected={childGuardianIds} onChange={setChildGuardianIds} /><Field label="Allergies" value={child.allergies} onChange={(value) => setChild({ ...child, allergies: value })} textarea /><Field label="Medical information" value={child.medicalNotes} onChange={(value) => setChild({ ...child, medicalNotes: value })} textarea /><Field label="Assistance needs" value={child.assistanceNotes} onChange={(value) => setChild({ ...child, assistanceNotes: value })} textarea /><Button disabled={busy}>Add child</Button></form> : <Button variant="ghost" onClick={startAddingChild}><Plus size={17} /> Add child</Button>}</>}

    {tab === "pass" && <div className="empty-state"><StatusChip tone={family.passStatus === "ACTIVE" ? "success" : "warning"}>{family.passStatus || "No pass"}</StatusChip><h3>Family Pass controls</h3><p>Print, download, copy, reprint, or perform a verified lost/damaged replacement.</p><Link className="button button-primary" href={`/passes/?family=${family.id}`}>Open Family Pass</Link></div>}

    {editingGuardian && <Modal title={`Edit ${editingGuardian.fullName}`} description="Update ordinary contact information. Pickup authorization is managed separately." onClose={() => { setEditingGuardian(null); setError(""); }} closeDisabled={busy}>
      <form onSubmit={(event) => void saveContactEdit(event)}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <Field label="Phone" type="tel" value={contactEdit.phone} onChange={(value) => setContactEdit({ ...contactEdit, phone: value })} />
        <Field label="Email (optional)" type="email" value={contactEdit.email} onChange={(value) => setContactEdit({ ...contactEdit, email: value })} />
        <div className="dialog-actions"><Button type="button" variant="ghost" disabled={busy} onClick={() => { setEditingGuardian(null); setError(""); }}>Cancel</Button><Button disabled={busy}>{busy ? "Saving…" : "Save contact"}</Button></div>
      </form>
    </Modal>}

    {editingChild && <Modal title={`Update care information for ${editingChild.preferredName || editingChild.firstName}`} description="Review these safety details verbally with the guardian before saving." onClose={() => { setEditingChild(null); setError(""); }} closeDisabled={busy}>
      <form onSubmit={(event) => void saveCareEdit(event)}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <Field label="Allergies" value={careEdit.allergies} onChange={(value) => setCareEdit({ ...careEdit, allergies: value })} textarea />
        <Field label="Medical information" value={careEdit.medicalNotes} onChange={(value) => setCareEdit({ ...careEdit, medicalNotes: value })} textarea />
        <Field label="Assistance needs" value={careEdit.assistanceNotes} onChange={(value) => setCareEdit({ ...careEdit, assistanceNotes: value })} textarea />
        <div className="dialog-actions"><Button type="button" variant="ghost" disabled={busy} onClick={() => { setEditingChild(null); setError(""); }}>Cancel</Button><Button disabled={busy}>{busy ? "Saving…" : "Save care information"}</Button></div>
      </form>
    </Modal>}
  </Card>;
}

function AuthorizationChoices({ title, options, selected, onChange }: { title: string; options: Array<{ id: string; label: string }>; selected: string[]; onChange(ids: string[]): void }) {
  return <div className="pickup-authorization"><strong>{title}</strong><p>All eligible options are selected by default. Clear only those that do not apply.</p>{options.map((option) => <label className="check" key={option.id}><input type="checkbox" checked={selected.includes(option.id)} onChange={(event) => onChange(event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))} />{option.label}</label>)}</div>;
}

function Field({ label, value, onChange, textarea = false, type = "text" }: { label: string; value: string; onChange(value: string): void; textarea?: boolean; type?: string }) {
  const guidance = careFieldGuidance(label);
  return <label className="field"><span>{label}{guidance && <span className="optional-label"> (optional)</span>}</span>{textarea ? <textarea placeholder={guidance?.placeholder} value={value} onChange={(event) => onChange(event.target.value)} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />}{guidance && <small className="help">{guidance.help}</small>}</label>;
}

function careFieldGuidance(label: string) {
  if (label === "Medical information") return { placeholder: "Relevant conditions, medication instructions, or emergency guidance", help: "Share only information volunteers may need to care for the child. Leave blank if none." };
  if (label === "Assistance needs") return { placeholder: "Communication, sensory, mobility, toileting, or participation support", help: "Describe anything that helps the child participate comfortably. Leave blank if none." };
  return null;
}
