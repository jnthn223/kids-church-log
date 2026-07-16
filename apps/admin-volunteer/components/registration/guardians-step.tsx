import { Plus, Trash2 } from "lucide-react";
import { Button } from "@kcl/ui";
import type { FamilyRegistrationInput } from "@kcl/firebase";
import { RegistrationInput } from "./fields";
import { createBlankGuardian } from "./helpers";
import type { RegistrationStepProps } from "./types";

export function GuardiansStep({ values, update }: RegistrationStepProps) {
  return (
    <>
      <h2>Guardians</h2>
      <p>
        Enter the adults connected to this family. Phone and email are checked
        against existing guardians while you type. Pickup authorization is
        configured per child on the next step.
      </p>
      {values.guardians.map((guardian, index) => (
        <div className="sub-card" key={index}>
          <div className="sub-card-head">
            <h3>{index === 0 ? "Primary guardian" : `Guardian ${index + 1}`}</h3>
            {values.guardians.length > 1 && (
              <Button
                variant="ghost"
                aria-label={`Remove guardian ${index + 1}`}
                onClick={() => removeGuardian(values, update, index)}
              >
                <Trash2 size={17} />
              </Button>
            )}
          </div>
          <div className="split">
            <RegistrationInput
              label="Full name"
              value={guardian.fullName}
              onChange={(value) =>
                updateGuardian(values, update, index, { fullName: value })
              }
            />
            <RegistrationInput
              label="Phone"
              type="tel"
              value={guardian.phone}
              onChange={(value) =>
                updateGuardian(values, update, index, { phone: value })
              }
            />
            <RegistrationInput
              label="Email (optional)"
              type="email"
              value={guardian.email || ""}
              onChange={(value) =>
                updateGuardian(values, update, index, { email: value })
              }
            />
            <RegistrationInput
              label="Relationship"
              value={guardian.relationship}
              onChange={(value) =>
                updateGuardian(values, update, index, { relationship: value })
              }
            />
          </div>
        </div>
      ))}
      <Button variant="ghost" onClick={() => addGuardian(values, update)}>
        <Plus size={17} /> Add guardian
      </Button>
    </>
  );
}

function updateGuardian(
  values: FamilyRegistrationInput,
  update: RegistrationStepProps["update"],
  index: number,
  patch: Partial<FamilyRegistrationInput["guardians"][number]>
) {
  update(
    "guardians",
    values.guardians.map((guardian, itemIndex) =>
      itemIndex === index ? { ...guardian, ...patch } : guardian
    )
  );
}

function addGuardian(
  values: FamilyRegistrationInput,
  update: RegistrationStepProps["update"]
) {
  const guardianIndex = values.guardians.length;
  update("guardians", [...values.guardians, createBlankGuardian()]);
  update(
    "children",
    values.children.map((child) => ({
      ...child,
      authorizedGuardianIndexes: [
        ...child.authorizedGuardianIndexes,
        guardianIndex
      ]
    }))
  );
}

function removeGuardian(
  values: FamilyRegistrationInput,
  update: RegistrationStepProps["update"],
  guardianIndex: number
) {
  update(
    "guardians",
    values.guardians.filter((_, index) => index !== guardianIndex)
  );
  update(
    "children",
    values.children.map((child) => ({
      ...child,
      authorizedGuardianIndexes: child.authorizedGuardianIndexes
        .filter((index) => index !== guardianIndex)
        .map((index) => (index > guardianIndex ? index - 1 : index))
    }))
  );

  if (values.emergencyContactMode === "ANOTHER_GUARDIAN") {
    if (values.emergencyGuardianIndex === guardianIndex) {
      update("emergencyContactMode", "PRIMARY_GUARDIAN");
      update("emergencyGuardianIndex", 0);
    } else if ((values.emergencyGuardianIndex ?? 0) > guardianIndex) {
      update(
        "emergencyGuardianIndex",
        (values.emergencyGuardianIndex ?? 1) - 1
      );
    }
  }
}
