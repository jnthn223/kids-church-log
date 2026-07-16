import type { MinistryGroup } from "@kcl/types";
import { calculateAge } from "@kcl/utils";

export function AgeGroupGuidance({ birthdate, groups }: { birthdate: string; groups: MinistryGroup[] }) {
  const age = calculateAge(birthdate);
  if (age == null) return null;
  const suggested = groups.filter((group) =>
    (group.minAge == null || age >= group.minAge) &&
    (group.maxAge == null || age <= group.maxAge) &&
    (group.minAge != null || group.maxAge != null)
  );

  return <div className="age-guidance" role="status"><strong>Age {age}</strong><span>{suggested.length ? `Suggested ${suggested.length === 1 ? "group" : "groups"}: ${suggested.map((group) => group.name).join(", ")}` : "No age-guided group matches. Choose using the ministry’s guidance."}</span></div>;
}
