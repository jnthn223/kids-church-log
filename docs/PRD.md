# KidsChurchLog Product Requirements Document

**Status:** Architectural blueprint  
**Version:** 1.0  
**Product:** KidsChurchLog  
**Audience:** Product, design, engineering, ministry leadership, and QA  
**Implementation status:** This document contains requirements only. It is not an implementation plan or code specification.

---

## 1. Executive summary

KidsChurchLog is a children’s-ministry operations platform that replaces repeated paper registration and manual attendance tracking with a safe, fast, family-centered workflow.

The core promise is:

1. A family registers once.
2. The family receives one permanent, opaque Family Pass.
3. A volunteer scans the pass, confirms the attending children and room suggestions, and completes check-in in seconds.
4. The same pass is used for verified check-out.

KidsChurchLog is deliberately not a general church-management system. It owns children’s-ministry registration, access, services, rooms, attendance, family passes, volunteer approval, and child-safety workflows.

The MVP consists of three independent applications in one repository:

- **Ministry Lead:** in-depth monitoring, configuration, reporting, corrections, and role delegation.
- **Admin Volunteer:** assisted family registration, family-record maintenance, and Family Pass issuance.
- **Kids Church Volunteer:** fast Sunday check-in, check-out, and room operations.

The applications share Firebase, domain types, validation, utilities, and UI primitives. They do not share navigation or application-specific page components. There is no Family application: families do not authenticate or manage church records directly.

---

## 2. Mission and product principles

### 2.1 Mission

Parents should not have to rewrite the same information every Sunday. Technology should remove administration from the church entrance so volunteers can focus on welcoming children and protecting families.

### 2.2 Experience principle

The primary operational experience is:

**Register once → Scan → Confirm → Done**

### 2.3 Product principles

1. **Child safety before convenience.** Authorization, medical visibility, pass status, and release confirmation must never be weakened to save a tap.
2. **Speed without ambiguity.** Volunteer screens show one primary task and one primary action at a time.
3. **No personal data in a pass.** QR and future NFC payloads contain only a cryptographically random opaque identifier.
4. **Explicit access.** Authentication proves identity; approved roles grant ministry capabilities. New accounts are pending until approved.
5. **Configurable ministry operations.** Ministry groups, rooms, schedules, and room assignments are data, not hardcoded application behavior.
6. **Independent products.** Ministry Lead, Admin Volunteer, and Kids Church Volunteer have separate navigation and release boundaries.
7. **Spark-first architecture.** The MVP must not require Cloud Functions, Firebase Admin SDK, server APIs, or the Blaze plan.
8. **Calm visual hierarchy.** Brand expression should support clarity, not compete with operational content.
9. **No family technology requirement.** Registration, pass issuance, check-in, and check-out must work for a family without a smartphone, email address, account, mobile data, or confidence using digital tools.

---

## 3. Goals, non-goals, and success measures

### 3.1 MVP goals

- Register a household, its guardians, and its children once.
- Generate and manage a permanent Family Pass.
- Approve and disable ministry users.
- Configure ministry groups, rooms, and recurring service schedules.
- Open a service session and assign groups, rooms, and volunteers.
- Check children in by QR or manual family search.
- Prevent duplicate attendance for the same child and session.
- Check children out with guardian and pass verification.
- Show live session and room attendance.
- Search and export attendance history.
- Provide printable, downloadable, and manually readable Family Pass formats through the Admin Volunteer application.
- Operate entirely on Firebase Spark quotas.

### 3.2 Non-goals for MVP

- General membership, giving, worship, sermon, or adult attendance management.
- Billing, payments, donations, or subscriptions.
- SMS or email automation.
- Cloud Functions, scheduled jobs, or server-rendered application logic.
- NFC hardware support beyond reserving compatible data fields and input abstractions.
- Full offline attendance writes or conflict synchronization.
- Biometric identification, facial recognition, or location tracking.
- Legal custody adjudication; the system records ministry-provided authorization only.
- Multiple organizations in one UI. The data model remains multi-ministry-ready, but each application session operates in one ministry context.
- Family authentication, self-registration, self-service record editing, or a family-facing application.

### 3.3 Product success measures

- Median returning-family check-in completed in 15 seconds or less.
- At least 95% of returning-family check-ins require no typing.
- Zero duplicate attendance documents for a child within one session.
- Check-out records contain volunteer, time, and release method for 100% of completed releases.
- Every active ministry user has explicit roles and an active membership.
- Every attendance record preserves service, group, and room snapshots.
- No personal information appears in QR or NFC payloads.
- Core pages remain usable at 320 px width and on common tablets.
- 100% of family-related workflows can be completed through an assisting volunteer without the family operating a device.

---

## 4. Product boundaries and repository model

### 4.1 Repository

One repository contains:

- `apps/ministry-lead`
- `apps/admin-volunteer`
- `apps/kids-church-volunteer`
- `packages/firebase`
- `packages/ui`
- `packages/types`
- `packages/validation`
- `packages/utils`

The names above define ownership boundaries. Application navigation, route layouts, feature components, and page state remain inside their application. No `apps/family` application is planned or scaffolded.

### 4.2 Shared package responsibilities

| Package | Responsibility | Must not contain |
|---|---|---|
| Firebase | Client initialization, converters, query helpers, transactions, auth hooks | Application navigation or visual pages |
| UI | Brand tokens and presentation primitives | Ministry Lead-, Admin Volunteer-, or Kids Church Volunteer-specific business workflows |
| Types | Domain entities, enums, read models | Firebase calls or React components |
| Validation | Shared Zod schemas and field normalization | Form layouts |
| Utils | Dates, identifiers, CSV, age calculation, formatting | Firebase state or app routing |

### 4.3 Deployment model

- Each application is a static Next.js export deployed to its own Firebase Hosting site or subdomain.
- Suggested MVP domains are `lead`, `register`, and `checkin` subdomains under the final product domain.
- All applications use the same Firebase project for the initial ministry deployment.
- No application depends on a runtime Next.js server.
- Environment configuration is application-specific even when values currently match.

---

## 5. Visual and interaction specification

### 5.1 Brand foundation

- Primary yellow: `#FFC43D`
- Supporting red: `#F55A4A`
- Supporting blue: `#2D6CDF`
- Supporting green: `#61C46B`
- Supporting purple: `#A66DD4`
- Primary navy: `#14213D`
- Cream canvas: `#F6F2EC`

### 5.2 Brand language

- The mark uses three rounded shapes containing a triangle, square, and circle.
- Typography is friendly and rounded, using Nunito Rounded or an approved metric-compatible alternative.
- Cream is the default application background; white is used for raised surfaces.
- Navy is the default text and high-contrast action color.
- Yellow identifies primary actions and selected navigation.
- Green is reserved for success, safe release, active status, and open sessions.
- Red is reserved for destructive actions, allergies, urgent safety warnings, and disabled states.
- Blue is used for informational and interactive secondary emphasis.
- Purple is used sparingly for reports, special assistance, or secondary categorization.

### 5.3 Restraint rules

- A page should normally have one dominant accent color.
- Do not put multiple brightly colored cards beside one another unless the content is explicitly a legend or brand overview.
- Operational data tables use neutral surfaces and semantic status chips.
- Illustrations belong in onboarding, empty states, family passes, and success moments—not dense administration pages.
- Shadows are soft and low contrast. Borders remain visible without creating an enterprise-dashboard appearance.
- Cards should communicate grouping, not wrap every individual line of content.

### 5.4 Application-specific expression

- **Ministry Lead:** restrained, information-dense when necessary, desktop-capable, neutral surfaces, selective color.
- **Admin Volunteer:** welcoming, form-focused, accessible, and optimized for assisted conversation with a family.
- **Kids Church Volunteer:** mobile-first kiosk, large typography, large controls, one primary workflow, minimal navigation.

### 5.5 Accessibility

- WCAG 2.2 AA color contrast for text and controls.
- Minimum touch target of 44×44 px; volunteer primary controls target 56 px or larger.
- Visible keyboard focus on all interactive elements.
- Scanner workflow must have a fully equivalent manual-search path.
- Status must never be conveyed by color alone.
- Alerts use text, icons, and semantic live regions.
- Motion respects `prefers-reduced-motion`.
- Success auto-reset must provide a visible countdown and a control to pause or continue immediately.

---

## 6. Identity, roles, and lifecycle

### 6.1 Authentication identity

Firebase Authentication supports:

- Email and password.
- Google sign-in.

Authentication creates an identity only. It does not grant ministry access.

### 6.2 Ministry membership states

| State | Meaning | Application behavior |
|---|---|---|
| Pending | Account exists but has no approved membership | Show Pending Approval; no ministry data |
| Active | Approved roles and active membership | Permit role-authorized application access |
| Suspended | Temporarily blocked | Show suspended message and sign-out |
| Expired | Membership term or required review date passed | Deny ministry data; show renewal guidance and sign-out |
| Revoked | Access removed | Show access removed and sign-out |

### 6.3 Roles and familiar ministry terms

KidsChurchLog MVP uses three roles:

| Role | Purpose |
|---|---|
| Ministry Lead | In-depth monitoring, ministry configuration, reports, attendance corrections, pass lifecycle, and delegation of user roles |
| Admin Volunteer | Family registration and maintenance: households, guardians, children, safety information, and Family Pass issue/reissue |
| Kids Church Volunteer | Sunday operations: service participation, check-in, check-out, and assigned-room attendance |

Roles are composable. A person may be both an Admin Volunteer and a Kids Church Volunteer. A Ministry Lead may also receive either volunteer role when they personally serve in that workflow; Ministry Lead does not silently imply operational access to the other applications.

There is no artificial limit on ministry-team subdivisions or room assignment labels. Future subdivisions may be added when the product gains a real workflow that needs distinct permissions, but MVP authorization remains these three understandable roles.

Users cannot change their own roles or membership status.

Families are household, guardian, and child domain records—not authenticated users or roles. Only authorized church team members create, read, or update those records through the three church applications.

### 6.4 Ministry Lead safeguards

Ministry Lead is broad because someone must monitor the system and delegate roles, but it is not unchecked:

- Ministry Lead role changes require a reason and immutable audit event.
- A Ministry Lead cannot grant or remove their own Ministry Lead role.
- Normal application flows cannot remove or suspend the final active Ministry Lead; the emergency recovery procedure can replace a departed final Lead.
- A ministry should maintain at least two active Ministry Leads and preferably three. The application shows a persistent critical warning while fewer than two are active.
- Hard deletion is unavailable through normal application UI.
- Pass replacement, attendance correction, household deactivation, export, and role changes require confirmation and audit metadata.
- Ministry Leads use individual church-managed Google accounts protected by Google 2-Step Verification. Shared accounts are prohibited.
- Optional application-enforced MFA uses TOTP after enabling Firebase Authentication with Identity Platform. SMS MFA is excluded because it requires billed SMS service and conflicts with the Spark-only boundary.
- Firebase project custody remains separate from the application role and is reserved for emergency technical recovery.

### 6.5 Session assignment labels

Assignment labels are operational descriptions rather than authorization roles. Examples include Lead, Assistant, Check-in, and Runner. Ministry Lead configures available labels. A Kids Church Volunteer’s room visibility is determined by active session assignments.

### 6.6 Access lifecycle

1. User authenticates for the first time.
2. The client creates or refreshes a minimal access request owned by that user.
3. The user sees Pending Approval.
4. A Ministry Lead reviews the request and assigns Admin Volunteer, Kids Church Volunteer, or both, with a membership expiry date.
5. Granting Ministry Lead requires a separate explicit action, reason, and warning; it is never the default approval choice.
6. The approved user refreshes or signs in again and receives only the applications and navigation permitted by their roles.
7. Membership access stops when suspended, revoked, or expired, even if an old application tab remains open.
8. Renewal requires another active Ministry Lead and writes an audit event; users cannot renew themselves.

### 6.7 First Ministry Lead

The first Ministry Lead is provisioned manually through Firebase Console during project setup and must provision a second Lead before production operations begin. Production rules must not contain a permanent “first user becomes Ministry Lead” path.

### 6.8 Membership terms and recurring access review

- Admin Volunteer and Kids Church Volunteer membership expires at the end of the configured ministry term or within 12 months, whichever comes first.
- Ministry Lead membership requires renewal by another active Ministry Lead every 90–180 days; the exact interval is ministry-configurable within that range.
- Expiry is enforced by Firestore rules using `request.time`, membership status, and `expiresAt`; it is not merely a UI reminder.
- The Ministry Lead application shows reviews due within 30 days, recently inactive users, expired users, and accounts with no recent assignments.
- Inactivity is a review signal, not proof that a person has left. Suspension or non-renewal remains an explicit accountable decision.
- Access review records who reviewed each membership, when, the outcome, the new expiry, and any reason.

### 6.9 Offboarding and succession

When a team member leaves, changes ministry, or no longer needs access, a Ministry Lead completes an offboarding checklist:

1. Suspend the membership immediately; revoke it after the ministry confirms the departure is permanent.
2. Remove future service and room assignments.
3. Review recent sensitive actions and unresolved work.
4. Transfer owned responsibilities and pending approvals to another named person.
5. Preserve attendance, audit, and attribution history; never delete the former member merely to remove access.

A planned outgoing Ministry Lead transfers responsibilities and confirms at least two other active Leads before their own role is removed by another Lead.

### 6.10 Emergency custodians and break-glass recovery

- At least two trusted technical custodians hold the minimum practical Firebase/Google Cloud project access needed for recovery. They are not automatically Ministry Leads and do not use Firebase Console for routine ministry operations.
- Custodians use separate, named, church-managed Google accounts with enforced 2-Step Verification. Shared credentials and personal recovery ownership are prohibited.
- If all Ministry Leads are unavailable, departed, or compromised, one custodian proposes recovery and a second authorized church leader or custodian approves it according to church policy.
- Recovery may suspend compromised memberships and manually provision replacement Ministry Leads through Firebase Console. This is the only exception to the ordinary final-Lead restriction.
- The recovery event, approvers, reason, changes, and time are documented in the church incident record and copied into the application audit log once safe access is restored.
- Custodian access is reviewed at least every six months and transferred before a custodian leaves the church or technical role.

---

## 7. Permissions matrix

| Resource/action | Ministry Lead | Admin Volunteer | Kids Church Volunteer | Pending |
|---|---:|---:|---:|---:|
| Ministry settings, groups, rooms, schedules | Manage | Read registration labels only | Read active operational subset | None |
| User requests and role delegation | Manage | Read own | Read own | Read own request |
| Households | Monitor/manage exceptions | Register and maintain | Operational search/read | None |
| Guardians and pickup authorization | Monitor/manage exceptions | Register and maintain | Safety-limited active-session read | None |
| Children and safety information | Monitor/manage exceptions | Register and maintain | Operational/safety active-session read | None |
| Family Pass issue/reprint | Monitor | Allowed after family verification | None | None |
| Lost/damaged pass replacement | Monitor/manage exceptions | Allowed with verification, reason, and audit | None | None |
| Administrative pass disable | Manage with reason | Escalate to Ministry Lead | None | None |
| Service-session configuration | Manage | None | Join/open as permitted | None |
| Room assignments | Manage | None | Assigned read | None |
| Check-in and check-out | Monitor/correct | None unless also Kids Church Volunteer | Active session and assignment | None |
| Current room attendance | Monitor | None | Assigned room | None |
| Historical attendance and reports | Manage | None | Current session summary only | None |
| CSV export | Allowed with reason | None | None | None |
| Audit activity | Read | None | None | None |

Admin Volunteers cannot access role delegation, service configuration, historical attendance, reports, audit records, or CSV export. Kids Church Volunteers cannot register families, browse historical family records, or view children outside an active operational context.

Holding multiple roles creates the union of their permissions, except that self-role changes, self-renewal, ordinary removal of the final Ministry Lead, and other explicit safeguards always remain prohibited. Emergency recovery follows Section 6.10 rather than normal application permissions.

Because reports and CSV export are client-side on Spark, any Ministry Lead who can read identifiable report data can technically copy it. UI-only export restrictions are not treated as a security boundary.

---

## 8. Cross-application navigation and deep links

### 8.1 Authentication routing

- Unauthenticated users are routed to the current application’s sign-in page.
- Authenticated pending users are routed to Pending Approval.
- Authenticated users without a required application role see “This account does not have access to this app” with links to appropriate available applications when known.
- Suspended, revoked, or expired users see a non-sensitive status page and sign-out action. Expired users are directed to contact a Ministry Lead for review rather than create another account.
- A return path is preserved through authentication only when it points to an authorized route.

### 8.2 Cross-application links

- A user may open each MVP application only when they hold its corresponding role. Ministry Lead does not imply Admin Volunteer or Kids Church Volunteer access.
- A QR scan in the Kids Church Volunteer app is interpreted as an opaque credential, not a browser deep link containing household details.
- No application assumes another application is installed.

### 8.3 Not-found behavior

- Unknown public routes show a branded 404 with a safe home action.
- Unknown protected resources show “Record not found or no longer available” without revealing whether an unauthorized record exists.

---

## 9. Ministry Lead application specification

The Ministry Lead application provides oversight, configuration, reporting, corrections, and role delegation. It does not contain the assisted-registration workflow or the check-in kiosk.

### 9.1 Ministry Lead navigation

- Overview
- Families
- Children
- Team Access
- Services
- Groups & Rooms
- Attendance
- Reports
- Audit
- Settings
- Account

Mobile Ministry Lead uses a compact header and explicit menu rather than copying either volunteer application.

### 9.2 ML-01: Sign in

**Purpose:** Authenticate a Ministry Lead.

**Content:** Brand mark, email/password, Google sign-in, password reset, ministry-focused copy.

**Flow:** An active, unexpired Ministry Lead proceeds to Overview. Other roles see wrong-application guidance; pending sees Pending Approval; expired access shows renewal guidance.

**States:** Authenticating, provider popup active, invalid credentials, disabled account, network unavailable, too many attempts, provider cancelled, unauthorized role.

### 9.3 ML-02: Pending, suspended, expired, revoked, or wrong-role access

**Purpose:** Explain why authentication did not grant Ministry Lead access.

**Actions:** Refresh status, sign out, open an authorized application when applicable, display ministry contact instructions.

**Privacy:** Never show ministry member lists or operational data.

### 9.4 ML-03: Ministry overview

**Purpose:** Present current ministry operations without becoming a generic analytics dashboard.

**Access:** Ministry Lead only.

**Content:** Today’s services, active sessions, attendance summaries, pending access requests, room status, safety flags requiring review, and recent audited changes.

**Primary actions:** Review access requests, configure service, inspect active attendance, or open reports. A clearly labeled link may open the separate Admin Volunteer application only when the signed-in person also holds that role.

**Empty state:** Guided setup checklist: create groups, create rooms, create schedule, approve the first team member, and invite an Admin Volunteer to register the first family. Do not embed registration controls in this application.

**Error state:** Each summary module fails independently and offers retry; the rest of the page remains usable.

### 9.5 ML-04: Family oversight

**Purpose:** Find and manage households.

**Content:** Search by household, guardian, phone suffix, child, or Family Key alias; filters for active state, pass status, group, and last attendance.

**Row summary:** Household name, primary guardian, child count, pass status, last visit, active state.

**Actions:** Open a family for monitoring or exceptional correction, view attendance context, and open pass lifecycle controls. Registration begins in the separate Admin Volunteer application.

**Empty state:** “No families registered yet.” Explain that registration is completed in the Admin Volunteer application; show an external application link only to users who also hold the Admin Volunteer role.

**No-results state:** Preserve filters and offer clear filters.

### 9.6 ML-05: Registration activity

**Purpose:** Monitor recent registrations, incomplete records, duplicate warnings, and Admin Volunteer activity without duplicating the registration form.

**Actions:** Open the resulting family record, review audit context, or flag an exception for correction.

### 9.7 ML-06: Family oversight detail

**Tabs:** Overview, Children, Guardians, Family Pass, Attendance, Activity.

**Overview:** Contacts, address, emergency contact, child summaries, safety alerts, pass state, last visit.

**Actions:** Ministry Lead may correct exceptional records, deactivate a household, replace/disable a pass, and open attendance/activity history. Ordinary intake changes remain in Admin Volunteer.

**Deactivation:** Requires reason and confirmation; does not delete historical attendance.

### 9.8 ML-07: Exceptional household correction

**Purpose:** Update household-level details.

**Conflict behavior:** Compare `updatedAt` before save. If another authorized user changed the record, show the latest values and require review before overwriting.

**Sensitive changes:** Primary contact, emergency contact, and active-state changes create audit records.

### 9.9 ML-08: Children oversight

**Purpose:** Search children across households.

**Filters:** Active, ministry group, age range, first-time status, birthday month, safety alert presence.

**Content:** Preferred/full name, household, age, group, active status, alert indicator, last attendance.

**Privacy:** Safety details are not displayed directly in the list; an alert indicator opens the authorized detail page.

### 9.10 ML-09: Child oversight detail

**Sections:** Identity, birthdate/age, group, allergies, medical notes, assistance notes, authorized guardians, active status, attendance summary.

**Actions:** Ministry Lead may review and resolve exceptional records and deactivate/reactivate a child. Routine registration editing belongs to Admin Volunteer.

**Group changes:** Effective immediately for future suggestions; historical attendance keeps its original group snapshot.

### 9.11 ML-10: Guardian oversight

**Purpose:** Manage adults associated with households and children.

**Fields:** Name, phone, email, relationship, household, authorized-pickup status, linked children, and internal oversight notes.

**Actions:** Ministry Lead may revoke established pickup access and resolve exceptional guardian relationships. Routine guardian entry belongs to Admin Volunteer.

**Safety:** Removing the final authorized pickup guardian requires an explicit blocking warning.

### 9.12 ML-11: Family Pass lifecycle

**Purpose:** Display, print, download, replace, disable, or mark a pass lost.

**Content:** Brand, household name outside the encoded payload, QR code, formatted Family Key, child count, usage instruction, pass status.

**Actions:** Ministry Lead may inspect, replace, or disable a pass with a reason. Routine issue, reprint, and verified lost/damaged-pass replacement belong to Admin Volunteer.

**Replacement:** Creates a new credential and immediately marks the old pass Replaced. Old credentials must fail lookup with a clear volunteer warning.

**Lost pass:** Disables the current credential before issuing a replacement.

### 9.13 ML-12: Team access and approval requests

**Tabs:** Pending, Active, Review Due, Expired, Suspended.

**Pending content:** Authenticated name/email, request time, provider, requested application if supplied.

**Access:** Ministry Lead only.

**Actions:** Assign Admin Volunteer, Kids Church Volunteer, or both; set the membership term; grant Ministry Lead through a separate warned action; renew another member; reject; suspend; revoke; or request clarification.

**Active content:** Name, email, roles, membership expiry, last access review, recent assignments, last-sign-in metadata if available, and active state. A critical banner appears until at least two Ministry Leads are active and unexpired.

**Team-member detail:** Roles, contact, membership term, access-review history, assignment history, current assignments, renewal, offboarding checklist, and suspension controls.

**Approval requirement:** Roles and ministry membership must be written atomically from the user’s perspective. The requesting user cannot choose their own roles. A Ministry Lead cannot change or renew their own Ministry Lead role or use the ordinary application to remove the final active Ministry Lead.

### 9.14 ML-13: Ministry groups

**Purpose:** Configure age or ministry groupings.

**Access:** Ministry Lead.

**Content:** Name, short label, optional age guidance, display order, active state, current child count.

**Actions:** Create, rename, reorder, disable, merge, split.

**Merge:** Requires target group and preview of affected active children. Historical attendance retains original snapshots.

**Split:** Creates a new group and presents a child reassignment workflow; no automatic age-only migration without review.

**Deletion:** Groups with references are disabled, not hard deleted.

### 9.15 ML-14: Rooms

**Purpose:** Configure physical ministry spaces independently of groups.

**Access:** Ministry Lead.

**Fields:** Name, building/area, optional capacity, accessibility notes, active state.

**Actions:** Create, edit, disable.

**Rule:** A room is never permanently bound to a group. Assignments occur per service session.

### 9.16 ML-15: Service schedules

**Purpose:** Configure recurring service choices.

**Access:** Ministry Lead.

**Fields:** Name, weekday, local start time, optional end time, active state, display order, default check-in opening offset.

**Actions:** Create, edit, duplicate, disable.

**Rule:** A schedule is a template. Opening a session creates a dated operational snapshot.

### 9.17 ML-16: Service setup and session detail

**Purpose:** Configure and monitor a dated service session.

**Access:** Ministry Lead.

**Content:** Date, schedule, status, opening volunteer, group-to-room assignments, room capacities, volunteer assignments, attendance counts.

**Actions:** Create/open, assign rooms, assign volunteers, close, reopen with confirmation, view attendance.

**Constraints:** One open session per schedule/date unless a Ministry Lead deliberately creates a labeled exception. A room may host multiple groups only with explicit confirmation.

### 9.18 ML-17: Attendance history

**Access:** Ministry Lead.

**Filters:** Date range, service, child, household, group, room, volunteer, method, checked-in/out status.

**Columns:** Child, household, service, group snapshot, room snapshot, check-in time/by/method, check-out time/by/method, status.

**Actions:** Open record, export filtered CSV, correct an operational mistake with reason.

**Correction:** Never silently overwrites history. Store correction reason, actor, and time in audit data.

### 9.19 ML-18: Reports

**Access:** Ministry Lead.

**MVP reports:** Attendance trend, service totals, group totals, room utilization, first-time visitors, returning families, incomplete check-outs.

**Behavior:** Client-side aggregation over a bounded date range. Large-range requests prompt the Ministry Lead to narrow the period.

**Empty state:** Explain which attendance data is needed for the selected report.

**Export:** CSV only in MVP; exported timestamps include ministry timezone and ISO value.

### 9.20 ML-19: Settings

**Access:** Ministry Lead.

**Sections:** Ministry profile, timezone, locale, attendance defaults, pass display format, assignment label options, data-retention guidance, application links.

**High-risk actions:** Ministry deactivation, destructive cleanup, and credential rotation are excluded from normal settings and require a future elevated process.

### 9.21 ML-20: Audit activity

**Access:** Ministry Lead, read-only.

**Purpose:** Review important administrative events.

**Events:** Role changes, membership status, pass issue/replace/disable, household deactivation, guardian pickup changes, child safety changes, attendance corrections, session close/reopen.

**Behavior:** Read-only, filterable, immutable to clients after creation.

---

## 10. Admin Volunteer application specification

The Admin Volunteer application supports assisted, human-centered family registration. It is designed for a volunteer sitting or standing with a guardian and must not assume that the family owns a device, has an email address, or can complete a digital form independently.

### 10.1 Admin Volunteer navigation

- Home
- Families
- Register Family
- Children
- Passes
- Account

No Ministry Lead monitoring, team-access, service-configuration, historical attendance, report, export, or audit navigation appears.

### 10.2 AV-01: Sign in

**Purpose:** Authenticate an Admin Volunteer.

**Flow:** An active, unexpired Admin Volunteer proceeds to Home. Ministry Lead-only and Kids Church Volunteer-only users are directed to their applications. Pending users see Pending Approval; expired users see renewal guidance.

**States:** Authenticating, invalid credentials, provider cancelled, offline, pending, suspended, expired, revoked, and wrong-role access.

### 10.3 AV-02: Home

**Purpose:** Begin or resume registration quickly.

**Content:** Register Family primary action, family search, incomplete local draft notice, recently registered families created by the current volunteer, and pass reprint shortcut.

**Privacy:** Recent items show minimum identifying information and disappear on sign-out.

### 10.4 AV-03: Families

**Purpose:** Find an existing family before creating a duplicate.

**Search:** Household, guardian, child, phone suffix, or exact Family Key.

**Result:** Household, primary guardian, child count, active state, and pass status. Historical attendance is not shown.

**Actions:** Open registration record, continue incomplete registration, or reprint active pass.

### 10.5 AV-04: Register family

**Purpose:** Facilitate complete registration through a conversational, accessible workflow.

**Steps:**

1. Search for an existing family and confirm no duplicate.
2. Household basics and preferred contact method.
3. Primary and emergency contacts.
4. Guardians and initial pickup authorization.
5. Children, birthdates, groups, allergies, medical information, and assistance needs.
6. Review the information with the guardian.
7. Record consent acknowledgment according to ministry policy.
8. Create the household and issue the initial Family Pass.

**Accessibility:** The volunteer reads and explains fields when needed. No family email, smartphone, account, or self-service action is required.

**Draft behavior:** Preserve a device-local draft during accidental navigation but clearly mark it unsaved. Sensitive drafts expire and are cleared after configured inactivity or sign-out.

**Completion:** Show print, download, and reprint options. A partial write must not produce an active pass for an incomplete household.

### 10.6 AV-05: Family registration record

**Tabs:** Overview, Guardians, Children, Family Pass.

**Actions:** Correct ordinary registration details, add guardian, add child, update safety information, reprint current pass.

**Limitations:** Cannot deactivate a household, administratively disable a pass, see historical attendance, or access internal monitoring notes. Exceptional record actions are escalated to Ministry Lead.

### 10.7 AV-06: Guardian editor

**Content:** Name, phone, email when available, relationship, linked children, initial pickup authorization, and emergency-contact status.

**Validation:** An active family must retain at least one authorized pickup guardian. Exceptional revocation is escalated to Ministry Lead.

### 10.8 AV-07: Child editor

**Content:** Identity, preferred name, birthdate, suggested configurable group, allergies, medical notes, assistance notes, and authorized guardians.

**Safety:** Alerts are reviewed verbally with the guardian before save. Changes create audit events without exposing them to unrelated volunteers.

### 10.9 AV-08: Family Pass

**Content:** Current pass status, QR, readable Family Key, household name outside the encoded payload, child count, and usage instruction.

**Actions:** Print card, print paper copy, download QR image, copy readable key, and reprint active pass.

**Replacement:** After verifying the family, an Admin Volunteer may replace a lost or damaged active pass. The action requires a reason, atomically invalidates the old credential, creates the new credential, and writes an audit event. A disabled pass cannot be reactivated; administrative disablement is escalated to Ministry Lead.

### 10.10 AV-09: Registration success

**Content:** Family created, children registered, pass issued, and clear handoff instructions.

**Actions:** Print pass, register another family, return Home.

### 10.11 AV-10: Account and help

**Content:** Authenticated identity, Admin Volunteer role, registration guidance, privacy reminder, application version, and sign-out.

---

## 11. Kids Church Volunteer application specification

### 11.1 Kids Church Volunteer navigation

The Kids Church Volunteer application prioritizes the active task. Bottom navigation appears only outside modal check-in steps:

- Check-in
- Attendance
- Rooms
- Account/More

During scanning, confirmation, success, and checkout, navigation is minimized to prevent accidental exits.

### 11.2 V-01: Sign in

**Content:** Compact brand, email/password, Google, help text.

**Flow:** Active, unexpired Kids Church Volunteers continue to service selection. Pending users see approval status. Expired users see renewal guidance. Ministry Lead-only and Admin Volunteer-only users are directed to their respective applications.

### 11.3 V-02: Pending, suspended, expired, or revoked

**Pending:** Explain that a Ministry Lead must approve the account; allow refresh and sign-out.

**Suspended:** Explain that ministry access is unavailable; do not reveal operational data.

**Expired:** Explain that the membership term ended and a Ministry Lead must review it; allow refresh and sign-out without suggesting a new account.

**Revoked:** Explain that access was removed and provide the ministry contact path; do not reveal operational data.

### 11.4 V-03: Select service

**Purpose:** Choose or join today’s service.

**Content:** Suggested service based on ministry timezone, active sessions, upcoming schedules, volunteer assignments.

**Behavior:** Time suggestion is never automatic confirmation. Joining an existing session is preferred over opening a duplicate.

**Empty state:** No scheduled service today; permitted users may choose another active schedule or contact a Ministry Lead.

### 11.5 V-04: Open service confirmation

**Content:** Date, schedule, volunteer name, station, assigned room/group, room mappings configured by Ministry Lead.

**Action:** Confirm and open session, or join if a concurrent session appeared.

**Conflict:** If another volunteer opens the same session first, abandon local creation and offer to join the existing session.

### 11.6 V-05: Ready station

**Purpose:** Default kiosk state.

**Content:** Service and Open status, “Ready to check in,” Scan Family QR, manual search, current child count, station/room context, check-out mode switch.

**Behavior:** Wake lock where supported, but never required. Reset sensitive household data after inactivity.

**Offline:** App shell remains visible. Check-in actions are disabled with a clear “Connection required for safe check-in” message in MVP.

### 11.7 V-06: QR scanner

**Purpose:** Read an opaque Family Key.

**Behavior:** Request camera only after a user action; default to rear camera; show scan target; stop camera immediately after a valid read; prevent repeated callbacks.

**Alternatives:** Switch camera, enter Family Key, return to search.

**Errors:** Permission denied, no camera, camera busy, insecure origin, unreadable code, invalid format, unknown token, inactive token.

### 11.8 V-07: Manual family search

**Search:** Household, guardian, child, or exact Family Key. Debounce text queries and require a meaningful minimum length.

**Result:** Household name, guardian name, child count, pass status indicator. Do not expose medical information in search results.

**No results:** Offer exact-key retry and ask whether the family needs assistance from the Registration Team.

### 11.9 V-08: Family confirmation

**Content:** Household, active pass status, guardian, children, age, configured group, suggested room, safety alerts, already-checked-in state.

**Interaction:** Select active children attending. Already checked-in children cannot be selected again. Inactive children appear only when needed with an explanatory status.

**Room suggestion:** Derived from current session group-room assignments. Missing assignments block confirmation for that child and direct the volunteer to a Ministry Lead.

**Safety:** Allergies and medical alerts are prominent; detailed notes are expandable to reduce visual overload.

### 11.10 V-09: Check-in commit

**Behavior:** One confirmation action runs a Firestore transaction for all selected children. The interface remains locked while committing.

**Partial conflict:** If another station checked in one selected child first, do not duplicate it. Show which children succeeded and which were already checked in, then preserve a coherent result.

**Retry:** A network failure keeps the selection and provides retry. Repeated taps must not create additional records.

### 11.11 V-10: Check-in success

**Content:** Success icon/animation, household, child count, children and assigned rooms.

**Behavior:** Return to Ready after a short countdown; allow immediate “Next family”; pause auto-reset when assistive technology or reduced motion requires it.

**Privacy:** Clear the previous family from the rendered page after reset.

### 11.12 V-11: Check-out lookup

**Entry:** Switch Ready station to Check-out, then scan the same pass or search manually.

**Content:** Only children currently checked in for the active session, check-in time, room, authorized guardians, safety alerts.

**Invalid cases:** No children currently checked in, pass replaced/lost, household inactive, child already checked out.

### 11.13 V-12: Release confirmation

**Interaction:** Select children being released, identify the presenting authorized guardian or select “Family Pass presented,” review alerts, optionally add a concise note, then confirm.

**Safety:** An unauthorized guardian cannot be selected. The volunteer must escalate rather than override. Corrections occur in Ministry Lead, not at the station.

### 11.14 V-13: Check-out success

**Content:** Released children, release time, confirmation message.

**Behavior:** Auto-reset identically to check-in success.

### 11.15 V-14: Current attendance

**Purpose:** View children in the current service.

**Filters:** Assigned room, group, status, search.

**Default scope:** Kids Church Volunteer’s assigned rooms. Ministry Lead monitors all rooms through its application.

**Actions:** Open child operational summary, start authorized check-out.

### 11.16 V-15: Room dashboard

**Content:** Assigned rooms, current count, configured capacity, group assignments, assigned volunteers, children list.

**Capacity:** Warning at configurable threshold; capacity is advisory in MVP and does not silently reroute children.

**Empty state:** “No children checked into this room yet.”

### 11.17 V-16: More/account

**Content:** Authenticated identity, roles, current assignments, station setting, camera help, PWA install help, sign-out, application version.

**No administrative settings belong here.**

---

## 12. Family interaction and data-handling policy

KidsChurchLog has no Family application, family login, or family self-service workflow. Families interact with the system through authorized church volunteers. This is a deliberate product and security boundary, not merely an MVP deferral.

### 12.1 Assisted-service model

- An Admin Volunteer registers a household, guardians, children, pickup authorization, and relevant safety information with the family present.
- An Admin Volunteer handles ordinary corrections and adds a new guardian or child after appropriate verification.
- A Ministry Lead handles exceptional corrections, sensitive authorization disputes, household deactivation, and pass invalidation.
- A Kids Church Volunteer uses the presented Family Pass only for active check-in and check-out duties.
- Families receive a printable QR pass and a manually readable Family Key. NFC may be issued later by the church using the same credential.
- A lost, damaged, or compromised pass is reported to an Admin Volunteer, who verifies the family and reissues it. The old credential is invalidated atomically; unusual or disputed cases are escalated to a Ministry Lead.

### 12.2 Security and accessibility rationale

- Family data remains inside church-controlled applications and is never exposed through a public household-linking surface.
- The product avoids account recovery, family identity linking, self-service authorization, and additional Firestore read paths.
- Families are not required to own a device, maintain an email address, understand an application, or have connectivity.
- Assisted intake lets a trained volunteer explain fields and identify incomplete, duplicate, or safety-sensitive information.
- Removing family self-service does not remove a family's ability to review or correct its information; the church provides that service through an Admin Volunteer.

### 12.3 Prohibited product paths

- Do not scaffold or deploy an `apps/family` application.
- Do not create Firebase Authentication accounts for families as part of registration.
- Do not allow public household search, account-to-household linking, or family-originated Firestore reads or writes.
- Do not send pass secrets or sensitive child data through unauthenticated links.
- Do not treat possession of a QR code, NFC card, phone number, or email address as authority to edit a family record.

---

## 13. Shared Firestore data model

### 13.1 Tenancy strategy

The root identity document is global. Ministry domain records live beneath a ministry document:

- `users/{uid}`
- `ministries/{ministryId}`
- `ministries/{ministryId}/...`

This prevents cross-ministry access and allows future multi-ministry support without restructuring domain records. The MVP UI operates in one ministry context.

### 13.2 General document rules

- All mutable domain documents contain `createdAt`, `createdBy`, `updatedAt`, and `updatedBy` where appropriate.
- Timestamps are Firestore server timestamps.
- Documents use stable generated IDs; names are never document IDs.
- Disabling is preferred over deleting referenced entities.
- Historical records store display snapshots required for reliable reporting after names or assignments change.
- Sensitive and frequently accessed operational data are separated when doing so materially improves rules or query safety.

### 13.3 Collection catalog

#### `users/{uid}`

Global identity summary.

Fields: display name, normalized email, photo URL, default ministry ID, last-seen metadata, schema version.

Permissions: user reads/updates limited personal display fields; ministry roles are never stored as user-editable global fields.

#### `ministries/{ministryId}`

Ministry profile.

Fields: name, timezone, locale, contact information, active state, brand settings, schema version.

#### `ministries/{ministryId}/members/{uid}`

Authoritative ministry access.

Fields: user ID, roles array containing Ministry Lead, Admin Volunteer, and/or Kids Church Volunteer values, status, display name snapshot, email snapshot, term start, expiry time, last reviewed by/at, review outcome, approved by/at, suspended by/at/reason, revoked by/at/reason, last active time.

Document ID equals Firebase UID.

An Active membership is authorized only while `expiresAt` is in the future. Renewal updates the review fields and expiry and creates an immutable audit event; it does not erase prior review history.

#### `ministries/{ministryId}/accessRequests/{uid}`

Pending authenticated users.

Fields: UID, email, display name, provider IDs, requested application, status, requested at, reviewed at/by.

The user may create/read their own request but cannot set approved roles.

#### `ministries/{ministryId}/households/{householdId}`

Fields: household name, normalized search terms, address, primary guardian ID, emergency contact summary, child IDs, guardian IDs, active state, pass status summary, last attendance time.

Medical details do not belong in this document.

#### `ministries/{ministryId}/guardians/{guardianId}`

Fields: household ID, full name, normalized name, phone, normalized phone, email, normalized email, relationship, linked child IDs, authorized pickup, active state.

#### `ministries/{ministryId}/children/{childId}`

Fields: household ID, first/last/preferred names, normalized search name, birthdate, ministry group ID, allergies, medical notes, assistance notes, authorized guardian IDs, active state, first-visit metadata.

Age is calculated from birthdate in the ministry timezone and is not authoritative stored data.

#### `ministries/{ministryId}/familyPasses/{tokenHash}`

Credential lookup document.

Fields: household ID, status, issued at/by, replaced at/by, replacement hash where appropriate, last-used metadata.

Document ID is a SHA-256 hash of the opaque Family Key. Staff may perform exact document reads after hashing a presented token; volunteers cannot list the collection.

#### `ministries/{ministryId}/familyPassSecrets/{householdId}`

Restricted pass presentation document.

Fields: current opaque token, formatted display key, token hash, issued time, status.

Readable only by Ministry Leads and Admin Volunteers during authorized pass issuance, reprint, or replacement. Kids Church Volunteers do not need the raw stored token; they receive it from the presented QR and hash it for exact lookup. Families have no direct Firestore access.

#### `ministries/{ministryId}/ministryGroups/{groupId}`

Fields: name, short label, optional minimum/maximum age guidance, display order, active state, merged-into ID where applicable.

#### `ministries/{ministryId}/rooms/{roomId}`

Fields: name, building/area, capacity, accessibility notes, display order, active state.

No permanent group ID exists on a room.

#### `ministries/{ministryId}/serviceSchedules/{scheduleId}`

Fields: name, weekday, local start/end time, check-in opening offset, display order, active state.

#### `ministries/{ministryId}/serviceSessions/{sessionId}`

Fields: local service date, schedule ID and name/time snapshots, status, opened at/by, closed at/by, station metadata, revision.

Status values: Draft, Open, Closed, Cancelled.

#### `ministries/{ministryId}/serviceSessions/{sessionId}/roomAssignments/{assignmentId}`

Fields: group ID/name snapshot, room ID/name snapshot, capacity snapshot, active state.

Group and room pairing is session-specific.

#### `ministries/{ministryId}/serviceSessions/{sessionId}/volunteerAssignments/{assignmentId}`

Fields: member UID, display name snapshot, room ID, group ID where applicable, assignment role label, active state.

#### `ministries/{ministryId}/attendance/{attendanceId}`

Document ID is deterministic from session ID and child ID.

Fields: child ID/name snapshot, household ID/name snapshot, session ID, schedule snapshot, group ID/name snapshot, room ID/name snapshot, status, check-in time/by/method, check-out time/by/method, released-to guardian ID/name or pass-presented indicator, checkout note, correction metadata.

Methods: QR, Manual, NFC reserved for future use.

#### `ministries/{ministryId}/auditLogs/{logId}`

Fields: event type, actor UID/name, target collection/ID, timestamp, safe before/after summary, reason, application source.

Clients may create only tightly validated events associated with an authorized write. Audit documents cannot be updated or deleted by clients.

#### `ministries/{ministryId}/settings/{documentName}`

Small configuration documents for attendance defaults, assignment label options, pass format version, and feature flags. Settings are separated by concern to avoid unrelated write contention.

The `accessGovernance` settings document contains the assigned Ministry Lead UID roster, minimum active-and-unexpired Lead target, volunteer maximum term, Ministry Lead review interval, access-review warning window, and last governance update metadata. Membership changes that grant or remove Ministry Lead must update this document in the same atomic write so Firestore rules can reject self-elevation and an ordinary transition to zero assigned Leads. The application derives the currently active-and-unexpired count from membership records because time-based expiry can make a roster entry inactive without a scheduled backend write.

### 13.4 Required indexes

Indexes must support:

- Attendance by session and check-in time.
- Attendance by household and status.
- Attendance by child and service date.
- Attendance by room, session, and status.
- Households by active state and normalized name.
- Children by group and active state.
- Access requests by status and requested time.
- Service sessions by local date, schedule, and status.

Index definitions are version-controlled. Product flows must not rely on ad hoc console-only indexes.

---

## 14. Transaction and consistency requirements

### 14.1 Family registration

- Household, guardians, children, pass lookup, and pass secret must become usable as one logical operation.
- Firestore batch limits are respected.
- The pass is not shown as active until all required documents succeed.
- Collision check occurs before accepting a generated pass token.

### 14.2 Family Pass replacement

- An Admin Volunteer first verifies the requesting person's relationship to the household using the ministry's approved verification policy.
- One transaction confirms the current pass is Active, marks it Replaced, creates the new pass lookup and secret, updates the household pass summary, and writes replacement audit metadata.
- The replacement reason and acting volunteer are required; raw pass tokens never appear in audit logs.
- Concurrent replacement attempts produce only one active credential. The losing client reloads and shows that another replacement already completed.
- A Disabled pass or disputed request requires Ministry Lead review and cannot be bypassed by issuing another pass from the ordinary workflow.

### 14.3 Duplicate-safe check-in

- Attendance ID deterministically combines session and child.
- A transaction verifies session Open, child active, household active, pass active when applicable, room assignment valid, and attendance absent.
- Transaction writes attendance with immutable snapshots.
- Concurrent stations produce one attendance record.

### 14.4 Check-out

- A transaction verifies attendance is currently Checked In and the session permits checkout.
- It writes check-out actor, timestamp, method, and release identity.
- Repeated checkout attempts return Already Checked Out rather than overwriting original release data.

### 14.5 Session close

- Closing a session does not automatically check children out.
- If children remain checked in, show a blocking summary and require explicit Ministry Lead confirmation according to ministry policy.
- Closed sessions reject new check-ins. Corrections use Ministry Lead flows.

### 14.6 Role approval

- Only an active Ministry Lead writes approved roles.
- Access-request status is updated only after membership creation succeeds.
- New memberships and role grants require a valid future expiry.
- A Ministry Lead cannot change or renew their own Ministry Lead role or use ordinary application flows to remove the final active Ministry Lead.
- A renewal transaction verifies that the actor is a different active, unexpired Ministry Lead, applies the configured maximum term, and writes an audit event.
- Granting or removing Ministry Lead atomically updates the membership, the `accessGovernance` assigned-Lead roster, and the audit event. Rules reject a resulting empty roster. A count below the configured minimum active-and-unexpired Leads is permitted only so ministry turnover and time-based expiry remain possible, and it triggers a critical warning.
- Emergency custodian recovery occurs outside normal client transactions and is documented according to Section 6.10.

---

## 15. Validation and normalization rules

### 15.1 General

- Trim leading/trailing whitespace and collapse accidental repeated internal spaces where appropriate.
- Preserve intentional punctuation and diacritics in display values.
- Normalize separate search fields to lowercase Unicode-compatible text.
- Reject control characters and markup in plain-text fields.
- All length limits are enforced in UI validation and Firestore rules where feasible.

### 15.2 Household

- Name: required, 2–80 characters.
- Address: optional by ministry policy, maximum 300 characters.
- At least one active guardian is required.
- Primary guardian must belong to the household.
- Emergency contact name and phone are required unless ministry policy explicitly marks them optional.

### 15.3 Guardian

- Full name: required, 2–100 characters.
- Phone: required for primary/emergency contacts; normalized to E.164 where possible; preserve original display value.
- Email: valid normalized email when provided; maximum 254 characters.
- Relationship: required, 2–50 characters or configured value.
- Authorized pickup: explicit boolean; never inferred from relationship.
- A guardian cannot be unlinked from a child if doing so leaves no authorized guardian without a Ministry Lead warning.

### 15.4 Child

- First and last name: required, 1–80 characters each.
- Preferred name: optional, maximum 80 characters.
- Birthdate: valid date, not in the future, and not implausibly old according to configurable children’s-ministry policy.
- Ministry group: required active group for active children.
- Allergies: structured list or concise text, maximum 1,000 characters combined.
- Medical notes and assistance notes: maximum 2,000 characters each.
- At least one authorized guardian is required for an active child.

### 15.5 Family Pass

- Generated with Web Crypto secure randomness.
- Uses an unambiguous uppercase alphabet excluding easily confused characters.
- Provides at least 80 bits of entropy; visual grouping may improve manual entry.
- Canonical format begins `KCL-`; separators and case are normalized before hashing.
- QR payload contains only the opaque token or a URL whose only credential component is the opaque token.
- Duplicate token hashes are regenerated, never overwritten.
- Status is Active, Lost, Replaced, or Disabled.
- Issue, reprint, and replacement require an authenticated Admin Volunteer or Ministry Lead; replacement additionally requires verified household relationship and a recorded reason.

### 15.6 Ministry group and room

- Names: required, 2–80 characters, unique among active entities after normalization.
- Capacity: optional positive integer with an upper sanity limit.
- Age guidance: optional; minimum cannot exceed maximum.
- Display order: non-negative integer.

### 15.7 Schedule and session

- Schedule name: required, 2–80 characters.
- Local time: valid 24-hour time stored separately from timezone.
- End time, if present, must be after start time for same-day MVP services.
- Session date is interpreted in ministry timezone.
- One normal session per schedule/date; exceptions require a unique label.
- Room assignments reference active room and group at creation.

### 15.8 Attendance

- Session, child, household, group, room, volunteer, and method are required at check-in.
- Child and household must match authoritative records.
- Check-out cannot precede check-in.
- Notes: optional, maximum 500 characters.
- Corrections require reason, 5–500 characters.

### 15.9 Membership

- Email comes from Firebase Auth and is not accepted as proof of access.
- Roles must come from the approved three-role MVP set; duplicates are normalized away.
- Status must be a valid lifecycle value, including Expired as the effective state after `expiresAt` passes.
- `expiresAt` is required, must be later than the approval or review time, and cannot exceed the configured maximum term for the assigned roles.
- A membership containing Ministry Lead uses the shorter Ministry Lead review interval.
- Users cannot approve, activate, renew, suspend, or change their own roles.

---

## 16. Loading, error, empty, and success states

### 16.1 Global application boot

**Loading:** Branded neutral shell while Firebase Auth resolves; maximum wait followed by actionable retry.

**Errors:** Firebase configuration missing, authentication unavailable, Firestore unavailable, unsupported browser storage, offline.

**Rule:** Never show an endless spinner. Every asynchronous gate must time out into an actionable state.

### 16.2 Data loading

- Use shape-accurate skeletons for initial lists and details.
- Preserve existing data during background refresh.
- Disable only the action dependent on a failed query, not the entire page.
- Show last-updated context for operational live views.

### 16.3 Mutations

- Primary action shows an in-place progress label.
- Prevent duplicate submission while a write is pending.
- On success, confirm the specific outcome.
- On retryable failure, preserve user input and selection.
- On permission failure, stop retrying and explain that access changed.
- On transaction conflict, refresh authoritative data and explain the conflict in domain language.

### 16.4 Empty-state taxonomy

- **First-use empty:** Explain value and offer setup action.
- **Filtered empty:** Preserve data context and offer clear filters.
- **Operational empty:** Reassure, for example “No children checked in yet.”
- **Permission empty:** Do not imply no data exists; state that the user cannot view it.
- **Offline empty:** Explain that data could not be loaded and show cached status if available.

### 16.5 Error taxonomy

- Authentication error.
- Authorization/role error.
- Not found or inactive record.
- Validation error.
- Network/offline error.
- Firestore transaction conflict.
- Quota or service unavailable.
- Camera/device error.
- Unexpected application error.

Technical error codes may be available in a copyable diagnostic detail, but primary messages use friendly ministry language and never expose sensitive record content.

---

## 17. Edge cases

### 17.1 Identity and access

- User signs in before Ministry Lead approval.
- User is approved while Pending page is open.
- Roles change while an application is open.
- User belongs to multiple ministries in the future.
- Final active Ministry Lead attempts to suspend themselves or remove their own Ministry Lead role.
- A Ministry Lead attempts to renew their own membership.
- A member's expiry passes while a protected application is open.
- Only one active Ministry Lead remains after an unexpected departure.
- All Ministry Leads are unavailable or their accounts are compromised.
- An emergency custodian leaves without transferring project custody.
- A departed user still has an installed PWA or previously cached data.
- Google and password identities share the same email.
- Auth account exists but user or membership document is missing.

### 17.2 Family records

- Duplicate households with similar names.
- Guardians shared across household records due to blended-family situations.
- Child has multiple authorized guardians with different households.
- Child becomes inactive while selected at a station.
- Missing birthdate prevents age calculation.
- Household has no active pass.
- Family presents a lost, replaced, disabled, malformed, or unknown pass.
- Two Admin Volunteers replace the same pass concurrently.
- A person requesting a record change cannot provide sufficient identity or relationship verification.

### 17.3 Services and rooms

- Volunteer opens the same service concurrently from two devices.
- No room assignment exists for a selected child’s group.
- Room is disabled after a future session was configured.
- Group is merged after a session snapshot was created.
- Room reaches or exceeds advisory capacity.
- Volunteer has no assignment or multiple assignments.
- Device clock differs from server time.
- Service crosses midnight; excluded from automatic handling in MVP and requires explicit session date policy.

### 17.4 Attendance

- Same child selected at two stations simultaneously.
- One of several children is already checked in.
- Network drops after transaction commit but before UI receives success.
- Volunteer retries after an ambiguous network result.
- Child moves rooms during service.
- Check-out attempted with a replaced pass.
- Different authorized guardian collects only some siblings.
- Session closes with children still checked in.
- Attendance correction after session close.
- Child or household later renamed or deactivated.

### 17.5 Device and PWA

- Camera permission permanently denied.
- No rear camera, multiple cameras, or camera already in use.
- App opened from an old installed PWA version.
- Service worker serves stale shell after deployment.
- Browser storage is cleared.
- Device goes offline during a protected operation.
- Tablet rotates during scanning.
- Screen reader active during timed success reset.

Each edge case must resolve to a safe, deterministic state. Ambiguous check-in and check-out results require authoritative Firestore re-read before allowing another write.

---

## 18. Security and privacy requirements

### 18.1 Firestore rules

- Default deny all documents.
- Every domain access verifies authenticated UID, Active membership status, `request.time < expiresAt`, required role, and ministry scope.
- Volunteer access is constrained by session status and assignment where feasible.
- Families have no authenticated Firestore access. Household, guardian, child, and pass-secret records are church-team resources only.
- Pass lookup permits exact document `get` by token hash but denies volunteer collection listing.
- Raw pass secrets are not readable by Kids Church Volunteers. Admin Volunteers receive only the access required to issue, reprint, and replace passes.
- Role, approval, and suspension fields are Ministry Lead-only.
- Membership renewal requires a different active, unexpired Ministry Lead; no user can extend their own access.
- Firebase Console custodians bypass application rules by necessity, so their IAM access is governed by the two-person emergency policy, church-controlled accounts, MFA, and recurring review in Section 6.10.
- Audit logs are immutable to clients after creation.
- Queries must be compatible with rules; the client cannot rely on rules to filter unauthorized results.

### 18.2 Sensitive data

- Medical, assistance, and guardian authorization data receive the narrowest practical reads.
- Do not store personal data in analytics events, logs, QR payloads, URLs, or error-reporting breadcrumbs.
- CSV exports are Ministry Lead-only, generated locally, and never uploaded by the product.
- Cached family and volunteer data are minimized and cleared on sign-out.

### 18.3 App Check

Firebase App Check is a recommended post-MVP hardening step compatible with Spark where supported. It supplements but never replaces Auth and Firestore rules.

### 18.4 Data deletion and retention

- Referenced people and configuration are deactivated rather than deleted by normal UI.
- Attendance retention policy is configurable/documented but automated deletion requires a future approved mechanism.
- A manual Ministry Lead export-and-delete process must be defined before production privacy requests are accepted.

---

## 19. Offline and PWA requirements

### 19.1 MVP

- Each application has its own manifest, icons, install metadata, and service worker.
- Cache application shell and immutable static assets.
- Network-first strategy for application navigation after deployment to reduce stale versions.
- Show an update-available prompt when a new shell is installed.
- Do not cache Firestore responses indiscriminately in a custom service worker.
- Firestore’s supported client cache may be enabled only after privacy behavior on shared devices is tested.

### 19.2 Operational policy

- MVP check-in and check-out require a confirmed connection because safety-sensitive conflict resolution depends on Firestore transactions.
- The UI may display cached room/session context offline but must clearly label it stale and disable commits.

### 19.3 Future offline attendance

Future support requires an operation queue, idempotency keys, local encryption considerations, conflict UI, device identity, and explicit reconciliation. The MVP must not imply that queued check-ins are complete.

---

## 20. Performance and quality requirements

- Initial application shell should become interactive quickly on an average ministry mobile connection.
- Scanner code is loaded only when entering scan mode.
- Lists use pagination or bounded queries rather than reading entire collections.
- Search uses normalized prefix fields and bounded results; full-text infrastructure is future work.
- Live listeners are scoped to the active session, room, or visible page and unsubscribed on exit.
- No page keeps listeners for hidden tabs.
- Ministry Lead report date ranges are bounded to protect Spark quotas.
- All production builds pass TypeScript checks, linting, and application-level tests.
- Firestore rules have emulator tests for allowed and denied paths.
- Transactions have concurrency and ambiguous-network tests.

---

## 21. Observability without a backend

### 21.1 Product analytics

MVP analytics are optional and privacy-minimized. Allowed events include application opened, scan started, scan result category, check-in duration bucket, and generic error category. Never include names, IDs, pass tokens, medical data, or household data.

### 21.2 Operational diagnostics

- Display application version and Firebase project alias in a non-sensitive diagnostics panel.
- Provide copyable generic error code and timestamp.
- Important administrative actions are recorded in Firestore audit logs.
- Spark quota dashboards remain an operational responsibility in Firebase Console.

---

## 22. Future expansion points

### 22.1 NFC

Introduce an input adapter that returns the same canonical Family Key used by QR and manual entry. Attendance method becomes NFC; no household or pass redesign is required.

### 22.2 Multi-ministry organizations

Allow a user to hold memberships in multiple ministry documents and select context. Existing ministry-scoped collections remain unchanged.

### 22.3 Blaze-enabled services

Future optional services may include secure invitation emails, scheduled retention, server-side reports, notifications, custom claims, and advanced audit guarantees. Client service interfaces should allow these to replace client-only operations without changing page contracts.

### 22.4 Advanced search

Add a dedicated search service when Firestore prefix search is insufficient. The domain retains normalized search fields for backward compatibility.

### 22.5 Offline synchronization

Add a formally designed operation log and reconciliation service; do not retrofit silent local writes into the MVP behavior.

### 22.6 Capacity and placement

Future room-routing recommendations may consider capacity, age, assistance needs, and sibling policy. MVP room assignments remain Ministry Lead-defined and transparent.

### 22.7 Labels and printers

Future check-in may print child and guardian labels. Attendance records already contain the required session, group, room, and household snapshots.

### 22.8 Additional reports

Retention cohorts, volunteer coverage, child-to-volunteer ratios, and safeguarding review may be added without changing attendance identity.

---

## 23. Release strategy

Development proceeds one application at a time.

### Phase 0: Shared foundation

- Repository workspace and quality tooling.
- Brand tokens and low-level UI primitives.
- Shared Firebase initialization, types, validation, and rule-test harness.
- No cross-application navigation package.

### Phase 1: Ministry Lead application

- Ministry Lead authentication and role delegation.
- Membership terms, access-review queue, renewal, offboarding, and active-Lead continuity warning.
- Configurable groups, rooms, and schedules.
- Pass replacement and exceptional family-record controls.
- Attendance history and basic reporting.

### Phase 2: Admin Volunteer application

- Admin Volunteer authentication.
- Assisted household, guardian, and child registration.
- Safety-information intake.
- Pass generation, printing, download, reprint, and verified replacement.

### Phase 3: Kids Church Volunteer application

- Kids Church Volunteer access lifecycle.
- Service selection/opening.
- QR/manual lookup.
- Check-in transaction, success reset, checkout, current attendance, rooms.

No Family application phase exists. The exact MVP build order still requires an implementation prompt. A phase must not pull application-specific pages from a later phase into the current application.

---

## 24. MVP acceptance criteria

The MVP is acceptable when:

1. All three applications deploy independently as static Firebase Hosting sites on Spark.
2. An unauthenticated, pending, suspended, expired, revoked, wrong-role, and active user receives the correct application state without endless loading.
3. A Ministry Lead can configure groups, rooms, schedules, and a dated session without hardcoded values.
4. An Admin Volunteer can register and maintain a complete family record, issue an opaque pass, and safely replace a verified lost or damaged pass without gaining Ministry Lead access.
5. A pending team member can request access and a Ministry Lead can assign one or more roles without a backend.
6. A Kids Church Volunteer can open/join a service, scan or search, confirm children and rooms, and commit attendance.
7. Concurrent check-in attempts create exactly one attendance record per child/session.
8. A Kids Church Volunteer can verify an authorized release and record check-out.
9. Live session and room views reflect committed Firestore attendance.
10. Attendance history can be filtered and exported locally to CSV.
11. A family without an account, email address, or personal device can receive and use a printed Family Pass through assisted registration.
12. Expired memberships are denied by Firestore rules even when an application tab or cached shell remains open.
13. A Ministry Lead cannot renew themselves, change their own Lead role, or use ordinary application flows to remove the final active Lead.
14. Firestore emulator tests prove cross-role, cross-ministry, expired-membership, self-renewal, and governance-roster access is denied.
15. Before production, at least two active Ministry Leads and two named emergency custodians exist, custodian accounts use 2-Step Verification, and the church has documented one recovery drill.
16. Core workflows meet accessibility, responsive layout, loading, empty, error, and offline-shell requirements.
17. No deployed feature requires Cloud Functions, Admin SDK, App Hosting, Cloud Run, or Blaze billing.

---

## 25. Product decisions fixed by this PRD

- One repository, three independent applications.
- Ministry-scoped Firestore domain model.
- Firebase Auth identity separated from ministry membership.
- Pending approval is the default access state.
- Ministry access uses three familiar, composable MVP roles.
- Ministry Lead provides oversight, configuration, reporting, corrections, and role delegation with audit safeguards.
- Access is term-limited, renewed by another Ministry Lead, and enforced by Firestore time checks.
- The ministry maintains multiple Ministry Leads and separate two-person emergency project custody using named church-managed accounts with 2-Step Verification.
- Google-account 2-Step Verification is the MVP Ministry Lead protection; optional Firebase application MFA uses TOTP, never SMS.
- Admin Volunteer is restricted to assisted family intake, record maintenance, and verified pass issue/reissue operations.
- Kids Church Volunteer is restricted to approved service and room operations.
- Families are church-maintained domain records, not authenticated users or roles.
- Groups and rooms are configurable and session assignments are separate.
- Attendance uses deterministic IDs and Firestore transactions.
- Historical attendance stores operational snapshots.
- The permanent Family Pass is opaque and contains no personal information.
- Raw pass presentation is restricted; volunteers use exact hashed lookup.
- Static Hosting and Spark are mandatory for MVP.
- No Family application, family authentication, or family-originated Firestore access is planned.
- Check-in and check-out commits require connectivity in MVP.
- Visual branding follows the supplied cheat sheet with restrained application-specific expression.

---

## 26. Open product-policy decisions before production

These decisions do not block repository scaffolding but must be resolved before production use:

- Exact ministry contact and escalation procedure for unauthorized pickup.
- Required versus optional household address and emergency contact fields.
- Who may open, close, or reopen a service session.
- Room capacity warning thresholds and escalation behavior.
- Data retention periods and privacy-request process.
- Exact volunteer membership term and Ministry Lead review interval within the approved limits.
- Named emergency custodians, second-approver policy, and the church incident-record location.
- Required identity/relationship verification for family-record changes and lost-pass replacement.
- Final Family Key visual length and grouping, subject to the minimum entropy requirement.
- Ministry policy for children without birthdates or without an age-appropriate group.
- Whether a volunteer may view unassigned rooms during an emergency.
- Final production domains for each application.

Until resolved, implementations must keep these choices configurable or isolated rather than embedding assumptions throughout the codebase.
