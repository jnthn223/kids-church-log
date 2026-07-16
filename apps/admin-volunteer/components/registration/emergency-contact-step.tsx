import type { RegistrationStepProps } from "./types";

export function EmergencyContactStep({
  values,
  update
}: RegistrationStepProps) {
  const primary = values.guardians[0];
  return (
    <>
      <h2>Emergency contact</h2>
      <p>
        The primary guardian is used automatically. Choose another option only
        when the family wants a different emergency contact.
      </p>
      <div className="contact-choices">
        <label
          className={`contact-choice ${
            values.emergencyContactMode === "PRIMARY_GUARDIAN" ? "selected" : ""
          }`}
        >
          <input
            type="radio"
            name="emergency-contact"
            checked={values.emergencyContactMode === "PRIMARY_GUARDIAN"}
            onChange={() => update("emergencyContactMode", "PRIMARY_GUARDIAN")}
          />
          <span>
            <strong>Use primary guardian</strong>
            <small>
              {primary?.fullName || "Primary guardian"} ·{" "}
              {primary?.phone || "Phone not entered"}
            </small>
          </span>
        </label>
        {values.guardians.length > 1 && (
          <label
            className={`contact-choice ${
              values.emergencyContactMode === "ANOTHER_GUARDIAN"
                ? "selected"
                : ""
            }`}
          >
            <input
              type="radio"
              name="emergency-contact"
              checked={values.emergencyContactMode === "ANOTHER_GUARDIAN"}
              onChange={() => {
                update("emergencyContactMode", "ANOTHER_GUARDIAN");
                update(
                  "emergencyGuardianIndex",
                  values.emergencyGuardianIndex &&
                    values.guardians[values.emergencyGuardianIndex]
                    ? values.emergencyGuardianIndex
                    : 1
                );
              }}
            />
            <span>
              <strong>Use another guardian</strong>
              <small>Select one of the guardians already entered.</small>
            </span>
          </label>
        )}
        <label
          className={`contact-choice ${
            values.emergencyContactMode === "OTHER" ? "selected" : ""
          }`}
        >
          <input
            type="radio"
            name="emergency-contact"
            checked={values.emergencyContactMode === "OTHER"}
            onChange={() => update("emergencyContactMode", "OTHER")}
          />
          <span>
            <strong>Enter a separate contact</strong>
            <small>
              Optional—for someone who is not already listed as a guardian.
            </small>
          </span>
        </label>
      </div>
      {values.emergencyContactMode === "ANOTHER_GUARDIAN" && (
        <div className="field">
          <label htmlFor="emergency-guardian">Emergency-contact guardian</label>
          <select
            id="emergency-guardian"
            value={values.emergencyGuardianIndex ?? 1}
            onChange={(event) =>
              update("emergencyGuardianIndex", Number(event.target.value))
            }
          >
            {values.guardians.map(
              (guardian, index) =>
                index > 0 && (
                  <option key={index} value={index}>
                    {guardian.fullName || `Guardian ${index + 1}`} ·{" "}
                    {guardian.phone}
                  </option>
                )
            )}
          </select>
        </div>
      )}
      {values.emergencyContactMode === "OTHER" && (
        <div className="split">
          <div className="field">
            <label htmlFor="emergency-name">Contact name</label>
            <input
              id="emergency-name"
              required
              value={values.emergencyContactName}
              onChange={(event) =>
                update("emergencyContactName", event.target.value)
              }
            />
          </div>
          <div className="field">
            <label htmlFor="emergency-phone">Contact phone</label>
            <input
              id="emergency-phone"
              type="tel"
              required
              value={values.emergencyContactPhone}
              onChange={(event) =>
                update("emergencyContactPhone", event.target.value)
              }
            />
          </div>
        </div>
      )}
    </>
  );
}
