import type { FamilyRegistrationInput } from "@kcl/firebase";

export type RegistrationStepProps = {
  values: FamilyRegistrationInput;
  update<K extends keyof FamilyRegistrationInput>(
    key: K,
    value: FamilyRegistrationInput[K]
  ): void;
};
