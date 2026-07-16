export const ROLES = ["MINISTRY_LEAD", "ADMIN_VOLUNTEER", "KIDS_CHURCH_VOLUNTEER"] as const;
export type MinistryRole = (typeof ROLES)[number];
export type MembershipStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";

export interface MinistryMember {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  roles: MinistryRole[];
  status: MembershipStatus;
  termStartAt?: unknown;
  expiresAt?: unknown;
  lastReviewedAt?: unknown;
  lastReviewedBy?: string;
  lastActiveAt?: unknown;
}

export interface AccessRequest {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  requestedApplication: string;
  ministryResponsibility?: string;
  requestReason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt?: unknown;
}

export interface MinistryGroup { id: string; name: string; shortLabel?: string; minAge?: number; maxAge?: number; displayOrder: number; active: boolean; }
export interface Room { id: string; name: string; buildingArea?: string; capacity?: number; accessibilityNotes?: string; displayOrder: number; active: boolean; }
export interface ServiceSchedule { id: string; name: string; weekday: number; startTime: string; endTime?: string; checkInOpeningOffset: number; displayOrder: number; active: boolean; }
export interface ServiceSession { id: string; localServiceDate: string; scheduleId: string; scheduleName: string; status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED"; }
export interface Household { id: string; householdName: string; primaryGuardianName?: string; childIds?: string[]; active: boolean; passStatus?: string; lastAttendanceAt?: unknown; }
export interface Guardian { id: string; householdId: string; fullName: string; phone: string; email?: string; relationship: string; linkedChildIds: string[]; authorizedPickup: boolean; emergencyContact: boolean; active: boolean; }
export interface Child { id: string; householdId: string; firstName: string; lastName: string; preferredName?: string; birthdate?: string; ministryGroupId?: string; allergies?: string; medicalNotes?: string; assistanceNotes?: string; authorizedGuardianIds?: string[]; active: boolean; }
export type FamilyPassStatus = "ACTIVE" | "LOST" | "REPLACED" | "DISABLED";
export interface FamilyPassSecret { id: string; currentOpaqueToken: string; formattedDisplayKey: string; tokenHash: string; householdId: string; status: FamilyPassStatus; issuedAt?: unknown; }
export interface Attendance { id: string; childNameSnapshot: string; householdNameSnapshot: string; localServiceDate?: string; groupNameSnapshot: string; roomNameSnapshot: string; status: "CHECKED_IN" | "CHECKED_OUT"; checkInAt?: unknown; checkOutAt?: unknown; }
export interface AuditLog { id: string; eventType: string; actorName: string; targetCollection: string; targetId: string; timestamp?: unknown; reason?: string; applicationSource: string; }
