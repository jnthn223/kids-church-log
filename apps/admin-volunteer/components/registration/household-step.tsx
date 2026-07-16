import type { FamilyRegistrationInput } from "@kcl/firebase";
import type { RegistrationStepProps } from "./types";

export function HouseholdStep({ values, update }: RegistrationStepProps) {
  return (
    <>
      <h2>Tell us about the household</h2>
      <p>
        Start with the familiar family name. Possible existing records will appear
        automatically.
      </p>
      <div className="field">
        <label htmlFor="household">Household name</label>
        <input
          id="household"
          required
          maxLength={80}
          placeholder="e.g. Santos Family"
          value={values.householdName}
          onChange={(event) => update("householdName", event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="address">
          Address <span className="muted">(optional)</span>
        </label>
        <textarea
          id="address"
          maxLength={300}
          value={values.address}
          onChange={(event) => update("address", event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-method">Preferred contact method</label>
        <select
          id="contact-method"
          value={values.preferredContactMethod}
          onChange={(event) =>
            update(
              "preferredContactMethod",
              event.target.value as FamilyRegistrationInput["preferredContactMethod"]
            )
          }
        >
          <option value="PHONE">Phone</option>
          <option value="EMAIL">Email</option>
          <option value="IN_PERSON">In person</option>
        </select>
      </div>
    </>
  );
}
