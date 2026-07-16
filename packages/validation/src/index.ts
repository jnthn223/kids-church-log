import { z } from "zod";

export const namedEntitySchema = z.object({ name: z.string().trim().min(2).max(80), displayOrder: z.coerce.number().int().min(0).max(9999), active: z.boolean() });
export const groupSchema = namedEntitySchema.extend({ shortLabel: z.string().trim().max(20).optional(), minAge: z.coerce.number().int().min(0).max(18).optional(), maxAge: z.coerce.number().int().min(0).max(18).optional() }).refine((v) => v.minAge == null || v.maxAge == null || v.minAge <= v.maxAge, { message: "Minimum age cannot exceed maximum age" });
export const roomSchema = namedEntitySchema.extend({ buildingArea: z.string().trim().max(100).optional(), capacity: z.coerce.number().int().positive().max(1000).optional(), accessibilityNotes: z.string().trim().max(500).optional() });
export const scheduleSchema = namedEntitySchema.extend({ weekday: z.coerce.number().int().min(0).max(6), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), checkInOpeningOffset: z.coerce.number().int().min(0).max(240) }).refine((v) => !v.endTime || v.endTime > v.startTime, { message: "End time must be after start time" });
export const approvalSchema = z.object({ roles: z.array(z.enum(["MINISTRY_LEAD", "ADMIN_VOLUNTEER", "KIDS_CHURCH_VOLUNTEER"])).min(1), expiresAt: z.coerce.date().min(new Date()), reason: z.string().trim().min(5).max(500) });

const predictablePasswordParts = ["123456", "password", "qwerty", "letmein", "welcome", "admin", "kidschurch"];

export function passwordRequirements(password: string) {
  const categoryCount = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((pattern) => pattern.test(password)).length;
  const normalized = password.toLowerCase().replace(/\s/g, "");
  const predictable = predictablePasswordParts.some((part) => normalized.includes(part)) || /(.)\1{5,}/.test(password);
  return [
    { id: "length", label: "At least 12 characters", met: password.length >= 12 && password.length <= 128 },
    { id: "variety", label: "Use 3 of: uppercase, lowercase, number, or symbol — or a 16+ character passphrase", met: categoryCount >= 3 || password.length >= 16 },
    { id: "predictable", label: "Avoid common passwords, obvious sequences, and repeated characters", met: password.length > 0 && !predictable }
  ];
}

export function passwordValidationError(password: string) {
  const unmet = passwordRequirements(password).find((requirement) => !requirement.met);
  return unmet ? unmet.label : null;
}
