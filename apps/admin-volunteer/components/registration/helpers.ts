import type { FamilyRegistrationInput } from "@kcl/firebase";

export const REGISTRATION_DRAFT_KEY = "kcl-admin-registration-draft";

export const REGISTRATION_STEP_LABELS = [
  "Household",
  "Guardians",
  "Children",
  "Emergency contact (optional)",
  "Review",
  "Consent & issue"
];

export function createBlankGuardian(): FamilyRegistrationInput["guardians"][number] {
  return {
    fullName: "",
    phone: "",
    email: "",
    relationship: "Parent",
    authorizedPickup: false,
    emergencyContact: false
  };
}

export function createBlankChild(
  authorizedGuardianIndexes = [0]
): FamilyRegistrationInput["children"][number] {
  return {
    firstName: "",
    lastName: "",
    preferredName: "",
    birthdate: "",
    ministryGroupId: "",
    allergies: "",
    medicalNotes: "",
    assistanceNotes: "",
    authorizedGuardianIndexes
  };
}

export function createInitialRegistration(): FamilyRegistrationInput {
  return {
    householdName: "",
    address: "",
    preferredContactMethod: "PHONE",
    emergencyContactMode: "PRIMARY_GUARDIAN",
    emergencyGuardianIndex: 0,
    emergencyContactName: "",
    emergencyContactPhone: "",
    consentAcknowledged: true,
    guardians: [createBlankGuardian()],
    children: [createBlankChild()]
  };
}

export function getGuardianIndexes(values: FamilyRegistrationInput) {
  return values.guardians.map((_, index) => index);
}

export function restoreRegistrationDraft(
  values: FamilyRegistrationInput
): FamilyRegistrationInput {
  const defaultGuardianIndexes = getGuardianIndexes(values);
  return {
    ...values,
    emergencyContactMode: values.emergencyContactMode || "PRIMARY_GUARDIAN",
    emergencyGuardianIndex: values.emergencyGuardianIndex ?? 0,
    children: values.children.map((child) => ({
      ...child,
      authorizedGuardianIndexes:
        child.authorizedGuardianIndexes ?? defaultGuardianIndexes
    }))
  };
}

export function validateRegistrationStep(
  step: number,
  values: FamilyRegistrationInput
): string | null {
  if (step === 0 && values.householdName.trim().length < 2) {
    return "Enter a household name before continuing.";
  }
  if (
    step === 1 &&
    values.guardians.some(
      (guardian) => guardian.fullName.length < 2 || guardian.phone.length < 7
    )
  ) {
    return "Complete each guardian’s name and phone.";
  }
  if (
    step === 2 &&
    values.children.some(
      (child) =>
        !child.firstName ||
        !child.lastName ||
        !child.birthdate ||
        !child.ministryGroupId
    )
  ) {
    return "Complete each child’s name, birthdate, and ministry group.";
  }
  if (
    step === 2 &&
    values.children.some(
      (child) => child.authorizedGuardianIndexes.length === 0
    )
  ) {
    return "Choose at least one authorized pickup guardian for each child.";
  }
  if (
    step === 3 &&
    values.emergencyContactMode === "ANOTHER_GUARDIAN" &&
    !values.guardians[values.emergencyGuardianIndex ?? -1]
  ) {
    return "Choose a guardian for emergency contact.";
  }
  if (
    step === 3 &&
    values.emergencyContactMode === "OTHER" &&
    (!values.emergencyContactName.trim() ||
      values.emergencyContactPhone.trim().length < 7)
  ) {
    return "Complete the separate emergency contact name and phone.";
  }
  return null;
}

export function resolveRegistration(
  values: FamilyRegistrationInput
): FamilyRegistrationInput {
  const guardians = values.guardians.map((guardian, index) => ({
    ...guardian,
    authorizedPickup: values.children.some((child) =>
      child.authorizedGuardianIndexes.includes(index)
    )
  }));

  if (values.emergencyContactMode === "OTHER") {
    return {
      ...values,
      guardians,
      emergencyContactName: values.emergencyContactName.trim(),
      emergencyContactPhone: values.emergencyContactPhone.trim()
    };
  }

  const guardianIndex =
    values.emergencyContactMode === "ANOTHER_GUARDIAN"
      ? values.emergencyGuardianIndex ?? 1
      : 0;
  const guardian = values.guardians[guardianIndex];
  return {
    ...values,
    guardians,
    emergencyGuardianIndex: guardianIndex,
    emergencyContactName: guardian?.fullName || "",
    emergencyContactPhone: guardian?.phone || ""
  };
}
