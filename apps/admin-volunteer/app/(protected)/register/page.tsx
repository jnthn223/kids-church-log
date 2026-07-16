"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
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
import { ChildrenStep } from "@/components/registration/children-step";
import { ConsentStep } from "@/components/registration/consent-step";
import { EmergencyContactStep } from "@/components/registration/emergency-contact-step";
import { GuardiansStep } from "@/components/registration/guardians-step";
import {
  createInitialRegistration,
  REGISTRATION_DRAFT_KEY,
  REGISTRATION_STEP_LABELS,
  resolveRegistration,
  restoreRegistrationDraft,
  validateRegistrationStep
} from "@/components/registration/helpers";
import { HouseholdStep } from "@/components/registration/household-step";
import { ReviewStep } from "@/components/registration/review-step";

export default function RegisterPage() {
  const { member } = useAuthAccess();
  const groups = useMinistryCollection<MinistryGroup>("ministryGroups");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FamilyRegistrationInput>(() =>
    createInitialRegistration()
  );
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateReady, setDuplicateReady] = useState(false);
  const [confirmedDifferent, setConfirmedDifferent] = useState(false);
  const duplicateSignature = useRef("");
  const [result, setResult] = useState<{
    householdId: string;
    token: string;
    childCount: number;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REGISTRATION_DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as {
        savedAt: number;
        values: FamilyRegistrationInput;
      };
      if (Date.now() - draft.savedAt <= 30 * 60 * 1000) {
        setValues(restoreRegistrationDraft(draft.values));
        setRestored(true);
      } else {
        localStorage.removeItem(REGISTRATION_DRAFT_KEY);
      }
    } catch {
      localStorage.removeItem(REGISTRATION_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!result && values.householdName) {
      localStorage.setItem(
        REGISTRATION_DRAFT_KEY,
        JSON.stringify({ savedAt: Date.now(), values })
      );
    }
  }, [values, result]);

  const update = <K extends keyof FamilyRegistrationInput>(
    key: K,
    value: FamilyRegistrationInput[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const validGroups = useMemo(
    () =>
      groups.data
        .filter((group) => group.active)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [groups.data]
  );

  const handleDuplicates = useCallback((matches: DuplicateMatch[]) => {
    const signature = matches
      .map((match) => `${match.householdId}:${match.reasons.join("|")}`)
      .join(";");
    if (duplicateSignature.current !== signature) {
      duplicateSignature.current = signature;
      setConfirmedDifferent(false);
    }
    setDuplicateMatches(matches);
  }, []);

  function next() {
    setError("");
    const validationError = validateRegistrationStep(step, values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) =>
      Math.min(REGISTRATION_STEP_LABELS.length - 1, current + 1)
    );
  }

  async function complete() {
    if (!member) return;
    if (!duplicateReady) {
      setError("Wait for duplicate checking to finish before issuing the pass.");
      return;
    }
    if (duplicateMatches.length && !confirmedDifferent) {
      setError(
        "Review the possible family matches and confirm they are different before continuing."
      );
      return;
    }

    const parsed = familyRegistrationSchema.safeParse(resolveRegistration(values));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Review the registration details.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const created = await registerFamily(member, parsed.data);
      localStorage.removeItem(REGISTRATION_DRAFT_KEY);
      setResult(created);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Registration could not be completed. Your draft is still saved."
      );
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    localStorage.removeItem(REGISTRATION_DRAFT_KEY);
    setValues(createInitialRegistration());
    setStep(0);
    setResult(null);
    setRestored(false);
    setConfirmedDifferent(false);
  }

  if (result) {
    return (
      <Card className="success">
        <div className="success-icon">
          <Check size={42} />
        </div>
        <h1>Family registered</h1>
        <p className="muted">
          {values.householdName} and {result.childCount}{" "}
          {result.childCount === 1
            ? "child were registered"
            : "children were registered"}
          . Their Family Pass is ready.
        </p>
        <div className="pass-actions">
          <Link
            className="button button-secondary"
            href={`/passes/?family=${result.householdId}`}
          >
            Open QR Family Pass
          </Link>
          <Button onClick={reset}>Register another family</Button>
          <Link className="button button-ghost" href="/home/">
            Return home
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Register a family</h2>
          <p>
            Enter the information with a guardian. The app checks existing records
            automatically as you go.
          </p>
        </div>
      </div>
      {restored && (
        <div className="draft">
          <span>
            <strong>Draft restored</strong>
            <br />
            <small>This information was saved only on this device.</small>
          </span>
          <Button variant="ghost" onClick={reset}>
            Discard draft
          </Button>
        </div>
      )}
      <div className="wizard">
        <Card className="steps">
          {REGISTRATION_STEP_LABELS.map((label, index) => (
            <div
              key={label}
              className={`step ${index === step ? "active" : ""} ${
                index < step ? "done" : ""
              }`}
            >
              <span className="step-number">
                {index < step ? <Check size={15} /> : index + 1}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </Card>
        <Card className="form-card">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <DuplicateFamilyWarning
            values={values}
            confirmedDifferent={confirmedDifferent}
            onConfirmedDifferentChange={setConfirmedDifferent}
            onDetected={handleDuplicates}
            onReadyChange={setDuplicateReady}
          />

          {step === 0 && <HouseholdStep values={values} update={update} />}
          {step === 1 && <GuardiansStep values={values} update={update} />}
          {step === 2 && (
            <ChildrenStep
              values={values}
              update={update}
              groups={validGroups}
              groupsLoading={groups.loading}
            />
          )}
          {step === 3 && (
            <EmergencyContactStep values={values} update={update} />
          )}
          {step === 4 && <ReviewStep values={values} groups={validGroups} />}
          {step === 5 && (
            <ConsentStep
              values={values}
              update={update}
              duplicateMatches={duplicateMatches}
              confirmedDifferent={confirmedDifferent}
            />
          )}

          <div className="wizard-actions">
            <Button
              variant="ghost"
              disabled={step === 0 || busy}
              onClick={() => {
                setError("");
                setStep((current) => Math.max(0, current - 1));
              }}
            >
              Back
            </Button>
            {step < REGISTRATION_STEP_LABELS.length - 1 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button
                disabled={
                  busy ||
                  !values.consentAcknowledged ||
                  !duplicateReady ||
                  (duplicateMatches.length > 0 && !confirmedDifferent)
                }
                onClick={() => void complete()}
              >
                {busy
                  ? "Creating family & pass…"
                  : "Create family & issue pass"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
