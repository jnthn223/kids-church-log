import { describe, expect, it } from "vitest";
import { daysFromNow, isExpired } from "@kcl/utils";
import { groupSchema, passwordValidationError, scheduleSchema } from "@kcl/validation";

describe("shared foundation", () => {
  it("treats past access as expired and future access as active", () => {
    expect(isExpired(new Date(Date.now() - 1_000))).toBe(true);
    expect(isExpired(daysFromNow(1))).toBe(false);
  });

  it("rejects inverted group age guidance", () => {
    expect(groupSchema.safeParse({ name: "Kids", shortLabel: "K", minAge: 10, maxAge: 5, displayOrder: 0, active: true }).success).toBe(false);
  });

  it("allows a ministry group without a short label", () => {
    expect(groupSchema.safeParse({ name: "Small Kids", displayOrder: 0, active: true }).success).toBe(true);
  });

  it("rejects schedules that end before they start", () => {
    expect(scheduleSchema.safeParse({ name: "Morning", weekday: 0, startTime: "10:00", endTime: "09:00", checkInOpeningOffset: 30, displayOrder: 0, active: true }).success).toBe(false);
  });

  it("rejects simple numeric passwords", () => {
    expect(passwordValidationError("12345678")).not.toBeNull();
  });

  it("accepts a long, varied password", () => {
    expect(passwordValidationError("Joyful-River-2026")).toBeNull();
  });
});
