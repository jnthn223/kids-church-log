import type { DuplicateMatch } from "@/components/duplicate-family-warning";
import type { RegistrationStepProps } from "./types";

type ConsentStepProps = RegistrationStepProps & {
  duplicateMatches: DuplicateMatch[];
  confirmedDifferent: boolean;
};

export function ConsentStep({
  values,
  update,
  duplicateMatches,
  confirmedDifferent
}: ConsentStepProps) {
  return (
    <>
      <h2>Consent and Family Pass</h2>
      <p>
        Record the ministry’s consent acknowledgment, then create the complete
        family record and permanent pass.
      </p>
      {duplicateMatches.length > 0 && !confirmedDifferent && (
        <div className="alert alert-error">
          Possible matches still need review before this pass can be issued.
        </div>
      )}
      <label className="check sub-card">
        <input
          type="checkbox"
          checked={values.consentAcknowledged}
          onChange={(event) =>
            update("consentAcknowledged", event.target.checked as true)
          }
        />
        <span>
          <strong>Consent acknowledgment reviewed</strong>
          <br />
          <small className="muted">
            The guardian reviewed the registration information and acknowledged the
            ministry’s current registration and child-safety policy.
          </small>
        </span>
      </label>
      <div className="alert alert-info">
        The QR will contain only a random Family Key—never a name, phone number, or
        child information.
      </div>
    </>
  );
}
