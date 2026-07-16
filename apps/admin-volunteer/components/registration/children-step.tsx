import { Plus, Trash2 } from "lucide-react";
import { Button } from "@kcl/ui";
import type { FamilyRegistrationInput } from "@kcl/firebase";
import type { MinistryGroup } from "@kcl/types";
import { AgeGroupGuidance } from "@/components/age-group-guidance";
import { ChildNotes, RegistrationInput } from "./fields";
import { createBlankChild, getGuardianIndexes } from "./helpers";
import type { RegistrationStepProps } from "./types";

type ChildrenStepProps = RegistrationStepProps & {
  groups: MinistryGroup[];
  groupsLoading: boolean;
};

export function ChildrenStep({
  values,
  update,
  groups,
  groupsLoading
}: ChildrenStepProps) {
  return (
    <>
      <h2>Children and care information</h2>
      <p>
        Name and birthdate are checked against existing child records. Age guidance
        helps with group selection; the volunteer still confirms the final group.
      </p>
      {values.children.map((child, index) => (
        <div className="sub-card" key={index}>
          <div className="sub-card-head">
            <h3>Child {index + 1}</h3>
            {values.children.length > 1 && (
              <Button
                variant="ghost"
                aria-label={`Remove child ${index + 1}`}
                onClick={() =>
                  update(
                    "children",
                    values.children.filter(
                      (_, itemIndex) => itemIndex !== index
                    )
                  )
                }
              >
                <Trash2 size={17} />
              </Button>
            )}
          </div>
          <div className="split">
            <RegistrationInput
              label="First name"
              value={child.firstName}
              onChange={(value) =>
                updateChild(values, update, index, { firstName: value })
              }
            />
            <RegistrationInput
              label="Last name"
              value={child.lastName}
              onChange={(value) =>
                updateChild(values, update, index, { lastName: value })
              }
            />
            <RegistrationInput
              label="Preferred name (optional)"
              value={child.preferredName || ""}
              onChange={(value) =>
                updateChild(values, update, index, { preferredName: value })
              }
            />
            <RegistrationInput
              label="Birthdate"
              type="date"
              value={child.birthdate}
              onChange={(value) =>
                updateChild(values, update, index, { birthdate: value })
              }
            />
          </div>
          <AgeGroupGuidance birthdate={child.birthdate} groups={groups} />
          <div className="field">
            <label>Ministry group</label>
            <select
              value={child.ministryGroupId}
              onChange={(event) =>
                updateChild(values, update, index, {
                  ministryGroupId: event.target.value
                })
              }
            >
              <option value="">Choose a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {!groupsLoading && !groups.length && (
              <small className="help">
                No active groups are configured. Ask a Ministry Lead to add one.
              </small>
            )}
          </div>
          <div className="pickup-authorization">
            <strong>Who may pick up this child?</strong>
            <p>
              Select at least one guardian. All guardians are selected by default;
              clear only those that do not apply.
            </p>
            {values.guardians.map((guardian, guardianIndex) => (
              <label className="check" key={guardianIndex}>
                <input
                  type="checkbox"
                  checked={child.authorizedGuardianIndexes.includes(guardianIndex)}
                  onChange={(event) =>
                    toggleChildGuardian(
                      values,
                      update,
                      index,
                      guardianIndex,
                      event.target.checked
                    )
                  }
                />
                {guardian.fullName || `Guardian ${guardianIndex + 1}`}
              </label>
            ))}
          </div>
          <ChildNotes
            label="Allergies"
            placeholder="Write “None known” when confirmed"
            value={child.allergies}
            onChange={(value) =>
              updateChild(values, update, index, { allergies: value })
            }
          />
          <ChildNotes
            label="Medical information"
            value={child.medicalNotes}
            onChange={(value) =>
              updateChild(values, update, index, { medicalNotes: value })
            }
          />
          <ChildNotes
            label="Assistance needs"
            value={child.assistanceNotes}
            onChange={(value) =>
              updateChild(values, update, index, { assistanceNotes: value })
            }
          />
        </div>
      ))}
      <Button
        variant="ghost"
        onClick={() =>
          update("children", [
            ...values.children,
            createBlankChild(getGuardianIndexes(values))
          ])
        }
      >
        <Plus size={17} /> Add child
      </Button>
    </>
  );
}

function updateChild(
  values: FamilyRegistrationInput,
  update: RegistrationStepProps["update"],
  index: number,
  patch: Partial<FamilyRegistrationInput["children"][number]>
) {
  update(
    "children",
    values.children.map((child, itemIndex) =>
      itemIndex === index ? { ...child, ...patch } : child
    )
  );
}

function toggleChildGuardian(
  values: FamilyRegistrationInput,
  update: RegistrationStepProps["update"],
  childIndex: number,
  guardianIndex: number,
  enabled: boolean
) {
  const current = values.children[childIndex].authorizedGuardianIndexes;
  updateChild(values, update, childIndex, {
    authorizedGuardianIndexes: enabled
      ? Array.from(new Set([...current, guardianIndex])).sort((a, b) => a - b)
      : current.filter((index) => index !== guardianIndex)
  });
}
