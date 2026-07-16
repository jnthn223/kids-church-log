"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@kcl/ui";
import {
  registerFamily,
  useAuthAccess,
  useMinistryCollection,
  type FamilyRegistrationInput
} from "@kcl/firebase";
import type { MinistryGroup } from "@kcl/types";
import { familyRegistrationSchema } from "@kcl/validation";
import {
  DuplicateFamilyWarning,
  type DuplicateMatch
} from "@/components/duplicate-family-warning";

const DRAFT_KEY = "kcl-admin-registration-draft";
const labels = ["Household", "Contacts", "Guardians", "Children", "Review", "Consent & issue"];
const blankGuardian = () => ({ fullName: "", phone: "", email: "", relationship: "Parent", authorizedPickup: true, emergencyContact: false });
const blankChild = () => ({ firstName: "", lastName: "", preferredName: "", birthdate: "", ministryGroupId: "", allergies: "", medicalNotes: "", assistanceNotes: "" });
const initial: FamilyRegistrationInput = {
  householdName: "",
  address: "",
  preferredContactMethod: "PHONE",
  emergencyContactName: "",
  emergencyContactPhone: "",
  consentAcknowledged: true,
  guardians: [blankGuardian()],
  children: [blankChild()]
};

export default function RegisterPage() {
  const { member } = useAuthAccess();
  const groups = useMinistryCollection<MinistryGroup>("ministryGroups");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FamilyRegistrationInput>(initial);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateReady, setDuplicateReady] = useState(false);
  const [confirmedDifferent, setConfirmedDifferent] = useState(false);
  const duplicateSignature = useRef("");
  const [result, setResult] = useState<{ householdId: string; token: string; childCount: number } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as { savedAt: number; values: FamilyRegistrationInput };
      if (Date.now() - draft.savedAt <= 30 * 60 * 1000) {
        setValues(draft.values);
        setRestored(true);
      } else localStorage.removeItem(DRAFT_KEY);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!result && values.householdName) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), values }));
    }
  }, [values, result]);

  const update = <K extends keyof FamilyRegistrationInput>(key: K, value: FamilyRegistrationInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };
  const validGroups = useMemo(
    () => groups.data.filter((group) => group.active).sort((a, b) => a.displayOrder - b.displayOrder),
    [groups.data]
  );
  const handleDuplicates = useCallback((matches: DuplicateMatch[]) => {
    const signature = matches.map((match) => `${match.householdId}:${match.reasons.join("|")}`).join(";");
    if (duplicateSignature.current !== signature) {
      duplicateSignature.current = signature;
      setConfirmedDifferent(false);
    }
    setDuplicateMatches(matches);
  }, []);

  function next() {
    setError("");
    if (step === 0 && values.householdName.trim().length < 2) return setError("Enter a household name before continuing.");
    if (step === 1 && (!values.emergencyContactName || !values.emergencyContactPhone)) return setError("Emergency contact name and phone are required.");
    if (step === 2 && values.guardians.some((guardian) => guardian.fullName.length < 2 || guardian.phone.length < 7)) return setError("Complete each guardian’s name and phone.");
    if (step === 3 && values.children.some((child) => !child.firstName || !child.lastName || !child.birthdate || !child.ministryGroupId)) return setError("Complete each child’s name, birthdate, and ministry group.");
    setStep((current) => Math.min(labels.length - 1, current + 1));
  }

  async function complete() {
    if (!member) return;
    if (!duplicateReady) return setError("Wait for duplicate checking to finish before issuing the pass.");
    if (duplicateMatches.length && !confirmedDifferent) return setError("Review the possible family matches and confirm they are different before continuing.");
    const parsed = familyRegistrationSchema.safeParse(values);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message || "Review the registration details.");
    setBusy(true);
    setError("");
    try {
      const created = await registerFamily(member, parsed.data);
      localStorage.removeItem(DRAFT_KEY);
      setResult(created);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Registration could not be completed. Your draft is still saved.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    localStorage.removeItem(DRAFT_KEY);
    setValues(initial);
    setStep(0);
    setResult(null);
    setRestored(false);
    setConfirmedDifferent(false);
  }

  if (result) {
    return <Card className="success"><div className="success-icon"><Check size={42} /></div><h1>Family registered</h1><p className="muted">{values.householdName} and {result.childCount} {result.childCount === 1 ? "child were registered" : "children were registered"}. Their Family Pass is ready.</p><div className="pass-actions"><Link className="button button-secondary" href={`/passes/?family=${result.householdId}`}>Open QR Family Pass</Link><Button onClick={reset}>Register another family</Button><Link className="button button-ghost" href="/home/">Return home</Link></div></Card>;
  }

  return <>
    <div className="page-heading"><div><h2>Register a family</h2><p>Enter the information with a guardian. The app checks existing records automatically as you go.</p></div></div>
    {restored && <div className="draft"><span><strong>Draft restored</strong><br /><small>This information was saved only on this device.</small></span><Button variant="ghost" onClick={reset}>Discard draft</Button></div>}
    <div className="wizard">
      <Card className="steps">{labels.map((label, index) => <div key={label} className={`step ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}><span className="step-number">{index < step ? <Check size={15} /> : index + 1}</span><span>{label}</span></div>)}</Card>
      <Card className="form-card">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <DuplicateFamilyWarning values={values} confirmedDifferent={confirmedDifferent} onConfirmedDifferentChange={setConfirmedDifferent} onDetected={handleDuplicates} onReadyChange={setDuplicateReady} />

        {step === 0 && <HouseholdStep values={values} update={update} />}
        {step === 1 && <ContactStep values={values} update={update} />}
        {step === 2 && <GuardianStep values={values} update={update} />}
        {step === 3 && <ChildStep values={values} update={update} groups={validGroups} groupsLoading={groups.loading} />}
        {step === 4 && <ReviewStep values={values} groups={validGroups} />}
        {step === 5 && <ConsentStep values={values} update={update} duplicateMatches={duplicateMatches} confirmedDifferent={confirmedDifferent} />}

        <div className="wizard-actions">
          <Button variant="ghost" disabled={step === 0 || busy} onClick={() => { setError(""); setStep((current) => Math.max(0, current - 1)); }}>Back</Button>
          {step < labels.length - 1
            ? <Button onClick={next}>Continue</Button>
            : <Button disabled={busy || !values.consentAcknowledged || !duplicateReady || (duplicateMatches.length > 0 && !confirmedDifferent)} onClick={() => void complete()}>{busy ? "Creating family & pass…" : "Create family & issue pass"}</Button>}
        </div>
      </Card>
    </div>
  </>;
}

type StepProps = {
  values: FamilyRegistrationInput;
  update<K extends keyof FamilyRegistrationInput>(key: K, value: FamilyRegistrationInput[K]): void;
};

function HouseholdStep({ values, update }: StepProps) {
  return <><h2>Tell us about the household</h2><p>Start with the familiar family name. Possible existing records will appear automatically.</p><div className="field"><label htmlFor="household">Household name</label><input id="household" required maxLength={80} placeholder="e.g. Santos Family" value={values.householdName} onChange={(event) => update("householdName", event.target.value)} /></div><div className="field"><label htmlFor="address">Address <span className="muted">(optional)</span></label><textarea id="address" maxLength={300} value={values.address} onChange={(event) => update("address", event.target.value)} /></div><div className="field"><label htmlFor="contact-method">Preferred contact method</label><select id="contact-method" value={values.preferredContactMethod} onChange={(event) => update("preferredContactMethod", event.target.value as FamilyRegistrationInput["preferredContactMethod"])}><option value="PHONE">Phone</option><option value="EMAIL">Email</option><option value="IN_PERSON">In person</option></select></div></>;
}

function ContactStep({ values, update }: StepProps) {
  return <><h2>Primary and emergency contacts</h2><p>The first guardian added on the next step becomes the primary contact. Record a reliable emergency contact here.</p><div className="split"><div className="field"><label htmlFor="emergency-name">Emergency contact name</label><input id="emergency-name" required value={values.emergencyContactName} onChange={(event) => update("emergencyContactName", event.target.value)} /></div><div className="field"><label htmlFor="emergency-phone">Emergency phone</label><input id="emergency-phone" type="tel" required value={values.emergencyContactPhone} onChange={(event) => update("emergencyContactPhone", event.target.value)} /></div></div></>;
}

function GuardianStep({ values, update }: StepProps) {
  return <><h2>Guardians and pickup authorization</h2><p>Phone and email are checked against existing guardians while you type. Pickup permission is always explicit.</p>{values.guardians.map((guardian, index) => <div className="sub-card" key={index}><div className="sub-card-head"><h3>{index === 0 ? "Primary guardian" : `Guardian ${index + 1}`}</h3>{values.guardians.length > 1 && <Button variant="ghost" aria-label={`Remove guardian ${index + 1}`} onClick={() => update("guardians", values.guardians.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></Button>}</div><div className="split"><GuardianInput label="Full name" value={guardian.fullName} onChange={(value) => updateGuardian(values, update, index, { fullName: value })} /><GuardianInput label="Phone" type="tel" value={guardian.phone} onChange={(value) => updateGuardian(values, update, index, { phone: value })} /><GuardianInput label="Email (optional)" type="email" value={guardian.email || ""} onChange={(value) => updateGuardian(values, update, index, { email: value })} /><GuardianInput label="Relationship" value={guardian.relationship} onChange={(value) => updateGuardian(values, update, index, { relationship: value })} /></div><label className="check"><input type="checkbox" checked={guardian.authorizedPickup} onChange={(event) => updateGuardian(values, update, index, { authorizedPickup: event.target.checked })} />Authorized to pick up registered children</label><label className="check"><input type="checkbox" checked={guardian.emergencyContact} onChange={(event) => updateGuardian(values, update, index, { emergencyContact: event.target.checked })} />Also an emergency contact</label></div>)}<Button variant="ghost" onClick={() => update("guardians", [...values.guardians, blankGuardian()])}><Plus size={17} /> Add guardian</Button></>;
}

function ChildStep({ values, update, groups, groupsLoading }: StepProps & { groups: MinistryGroup[]; groupsLoading: boolean }) {
  return <><h2>Children and care information</h2><p>Name and birthdate are checked against existing child records. Read care information back to the guardian.</p>{values.children.map((child, index) => <div className="sub-card" key={index}><div className="sub-card-head"><h3>Child {index + 1}</h3>{values.children.length > 1 && <Button variant="ghost" aria-label={`Remove child ${index + 1}`} onClick={() => update("children", values.children.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></Button>}</div><div className="split"><ChildInput label="First name" value={child.firstName} onChange={(value) => updateChild(values, update, index, { firstName: value })} /><ChildInput label="Last name" value={child.lastName} onChange={(value) => updateChild(values, update, index, { lastName: value })} /><ChildInput label="Preferred name (optional)" value={child.preferredName || ""} onChange={(value) => updateChild(values, update, index, { preferredName: value })} /><ChildInput label="Birthdate" type="date" value={child.birthdate} onChange={(value) => updateChild(values, update, index, { birthdate: value })} /></div><div className="field"><label>Ministry group</label><select value={child.ministryGroupId} onChange={(event) => updateChild(values, update, index, { ministryGroupId: event.target.value })}><option value="">Choose a group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>{!groupsLoading && !groups.length && <small className="help">No active groups are configured. Ask a Ministry Lead to add one.</small>}</div><ChildNotes label="Allergies" placeholder="Write “None known” when confirmed" value={child.allergies} onChange={(value) => updateChild(values, update, index, { allergies: value })} /><ChildNotes label="Medical information" value={child.medicalNotes} onChange={(value) => updateChild(values, update, index, { medicalNotes: value })} /><ChildNotes label="Assistance needs" value={child.assistanceNotes} onChange={(value) => updateChild(values, update, index, { assistanceNotes: value })} /></div>)}<Button variant="ghost" onClick={() => update("children", [...values.children, blankChild()])}><Plus size={17} /> Add child</Button></>;
}

function ReviewStep({ values, groups }: { values: FamilyRegistrationInput; groups: MinistryGroup[] }) {
  return <><h2>Review together</h2><p>Read this summary with the guardian. The app continues checking the complete record for possible duplicates.</p><div className="review-list"><div className="review-block"><h3>{values.householdName}</h3><p>{values.address || "No address provided"} · Prefers {values.preferredContactMethod.toLowerCase()}</p></div><div className="review-block"><h3>Emergency contact</h3><p>{values.emergencyContactName} · {values.emergencyContactPhone}</p></div><div className="review-block"><h3>{values.guardians.length} guardian{values.guardians.length === 1 ? "" : "s"}</h3>{values.guardians.map((guardian, index) => <p key={`${guardian.fullName}-${index}`}>{guardian.fullName} · {guardian.relationship} · {guardian.authorizedPickup ? "Pickup authorized" : "Not pickup authorized"}</p>)}</div><div className="review-block"><h3>{values.children.length} child{values.children.length === 1 ? "" : "ren"}</h3>{values.children.map((child, index) => <p key={`${child.firstName}-${child.birthdate}-${index}`}>{child.preferredName || child.firstName} {child.lastName} · {groups.find((group) => group.id === child.ministryGroupId)?.name || "No group"}{(child.allergies || child.medicalNotes || child.assistanceNotes) ? " · Care details recorded" : ""}</p>)}</div></div></>;
}

function ConsentStep({ values, update, duplicateMatches, confirmedDifferent }: StepProps & { duplicateMatches: DuplicateMatch[]; confirmedDifferent: boolean }) {
  return <><h2>Consent and Family Pass</h2><p>Record the ministry’s consent acknowledgment, then create the complete family record and permanent pass.</p>{duplicateMatches.length > 0 && !confirmedDifferent && <div className="alert alert-error">Possible matches still need review before this pass can be issued.</div>}<label className="check sub-card"><input type="checkbox" checked={values.consentAcknowledged} onChange={(event) => update("consentAcknowledged", event.target.checked as true)} /><span><strong>Consent acknowledgment reviewed</strong><br /><small className="muted">The guardian reviewed the registration information and acknowledged the ministry’s current registration and child-safety policy.</small></span></label><div className="alert alert-info">The QR will contain only a random Family Key—never a name, phone number, or child information.</div></>;
}

function GuardianInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange(value: string): void; type?: string }) {
  return <div className="field"><label>{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function ChildInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange(value: string): void; type?: string }) {
  return <div className="field"><label>{label}</label><input type={type} max={type === "date" ? new Date().toISOString().slice(0, 10) : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function ChildNotes({ label, value, onChange, placeholder }: { label: string; value: string; onChange(value: string): void; placeholder?: string }) {
  return <div className="field"><label>{label}</label><textarea placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function updateGuardian(values: FamilyRegistrationInput, update: StepProps["update"], index: number, patch: Partial<FamilyRegistrationInput["guardians"][number]>) {
  update("guardians", values.guardians.map((guardian, itemIndex) => itemIndex === index ? { ...guardian, ...patch } : guardian));
}

function updateChild(values: FamilyRegistrationInput, update: StepProps["update"], index: number, patch: Partial<FamilyRegistrationInput["children"][number]>) {
  update("children", values.children.map((child, itemIndex) => itemIndex === index ? { ...child, ...patch } : child));
}
