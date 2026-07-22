import { describe, expect, it } from "vitest";
import { calculateAge, daysFromNow, isExpired } from "@kcl/utils";
import { groupSchema, passwordValidationError, scheduleSchema } from "@kcl/validation";
import { buildSupportReport, createSupportReference, sanitizeSupportDescription } from "@kcl/ui";

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

  it("calculates age around the birthday boundary", () => {
    expect(calculateAge("2020-07-16", new Date(2026, 6, 16))).toBe(6);
    expect(calculateAge("2020-07-17", new Date(2026, 6, 16))).toBe(5);
    expect(calculateAge("not-a-date", new Date(2026, 6, 16))).toBeNull();
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

  it("redacts common sensitive identifiers from support descriptions", () => {
    const sanitized = sanitizeSupportDescription("Family KCL-ABCDE-12345-XYZ used parent@example.com and +63 917 123 4567");
    expect(sanitized).toContain("[Family Key redacted]");
    expect(sanitized).toContain("[email redacted]");
    expect(sanitized).toContain("[phone redacted]");
    expect(sanitized).not.toContain("parent@example.com");
    expect(sanitized).not.toContain("917 123 4567");
  });

  it("builds a privacy-safe report with stable diagnostic context", () => {
    const timestamp = new Date("2026-07-21T02:28:00.000Z");
    const reference = createSupportReference(timestamp, 0.5);
    const report = buildSupportReport({ appName: "Kids Church Volunteer", appVersion: "0.1.0", category: "Something failed", description: "Confirm check-in showed permission-denied", online: true, pathname: "/check-in/", reference, timestamp, errorCode: "permission-denied", summary: "Attendance was not recorded" });
    expect(reference).toBe("KCL-20260721-80000");
    expect(report).toContain("App: Kids Church Volunteer");
    expect(report).toContain("Screen: /check-in/");
    expect(report).toContain("Error code: permission-denied");
    expect(report).not.toContain("User ID");
    expect(report).not.toContain("Service ID");
  });
});
