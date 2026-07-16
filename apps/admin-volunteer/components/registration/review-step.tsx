import type { FamilyRegistrationInput } from "@kcl/firebase";
import type { MinistryGroup } from "@kcl/types";
import { resolveRegistration } from "./helpers";

type ReviewStepProps = {
  values: FamilyRegistrationInput;
  groups: MinistryGroup[];
};

export function ReviewStep({ values, groups }: ReviewStepProps) {
  const resolved = resolveRegistration(values);
  return (
    <>
      <h2>Review together</h2>
      <p>
        Read this summary with the guardian. The app continues checking the complete
        record for possible duplicates.
      </p>
      <div className="review-list">
        <div className="review-block">
          <h3>{values.householdName}</h3>
          <p>
            {values.address || "No address provided"} · Prefers{" "}
            {values.preferredContactMethod.toLowerCase()}
          </p>
        </div>
        <div className="review-block">
          <h3>Emergency contact</h3>
          <p>
            {resolved.emergencyContactName} · {resolved.emergencyContactPhone}
            {values.emergencyContactMode === "PRIMARY_GUARDIAN"
              ? " · Primary guardian"
              : ""}
          </p>
        </div>
        <div className="review-block">
          <h3>
            {resolved.guardians.length} guardian
            {resolved.guardians.length === 1 ? "" : "s"}
          </h3>
          {resolved.guardians.map((guardian, index) => (
            <p key={`${guardian.fullName}-${index}`}>
              {guardian.fullName} · {guardian.relationship} ·{" "}
              {guardian.authorizedPickup
                ? "Pickup authorized for selected children"
                : "Not selected for pickup"}
            </p>
          ))}
        </div>
        <div className="review-block">
          <h3>
            {values.children.length} child
            {values.children.length === 1 ? "" : "ren"}
          </h3>
          {values.children.map((child, index) => (
            <div
              key={`${child.firstName}-${child.birthdate}-${index}`}
              className="child-review"
            >
              <p>
                {child.preferredName || child.firstName} {child.lastName} ·{" "}
                {groups.find((group) => group.id === child.ministryGroupId)?.name ||
                  "No group"}
                {child.allergies || child.medicalNotes || child.assistanceNotes
                  ? " · Care details recorded"
                  : ""}
              </p>
              <small>
                Pickup:{" "}
                {child.authorizedGuardianIndexes
                  .map(
                    (guardianIndex) =>
                      values.guardians[guardianIndex]?.fullName ||
                      `Guardian ${guardianIndex + 1}`
                  )
                  .join(", ") || "None selected"}
              </small>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
