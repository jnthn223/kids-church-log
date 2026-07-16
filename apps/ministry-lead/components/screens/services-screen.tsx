"use client";

import { useState, type FormEvent } from "react";
import { Archive, ArchiveRestore, CalendarPlus, Pencil } from "lucide-react";
import { Button, Card, EmptyState, StatusChip } from "@kcl/ui";
import {
  createMinistryDocument,
  updateMinistryDocument,
  useAuthAccess,
  useMinistryCollection
} from "@kcl/firebase";
import type { ServiceSchedule, ServiceSession } from "@kcl/types";
import { DataTable, Metric, ScreenError, ScreenLoading } from "./shared";
import { ServiceSessionOpener } from "./service-session-opener";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ServicesScreen() {
  const { member } = useAuthAccess();
  const schedules = useMinistryCollection<ServiceSchedule>("serviceSchedules");
  const sessions = useMinistryCollection<ServiceSession>("serviceSessions");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceSchedule | null>(null);
  const [confirming, setConfirming] = useState<ServiceSchedule | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateError, setDeactivateError] = useState("");

  function openEditor(schedule: ServiceSchedule | null) {
    setEditing(schedule);
    setError("");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member) return;

    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get("name") || "").trim(),
      weekday: Number(form.get("weekday")),
      startTime: String(form.get("startTime")),
      endTime: String(form.get("endTime") || ""),
      checkInOpeningOffset: Number(form.get("offset") || 30),
      displayOrder: editing?.displayOrder ?? schedules.data.length,
      active: editing?.active ?? true
    };

    if (values.name.length < 2) {
      setError("Name must have at least 2 characters.");
      return;
    }
    if (values.endTime && values.endTime <= values.startTime) {
      setError("End time must be after start time.");
      return;
    }

    try {
      if (editing) {
        await updateMinistryDocument(
          member,
          "serviceSchedules",
          editing.id,
          values,
          "Service schedule details updated"
        );
      } else {
        await createMinistryDocument(member, "serviceSchedules", values);
      }
      closeEditor();
      setError("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The schedule could not be saved.");
    }
  }

  function openDeactivation(schedule: ServiceSchedule) {
    setConfirming(schedule);
    setDeactivateReason("");
    setDeactivateError("");
  }

  async function reactivate(schedule: ServiceSchedule) {
    if (!member) return;
    setBusyId(schedule.id);
    try {
      await updateMinistryDocument(
        member,
        "serviceSchedules",
        schedule.id,
        { active: true },
        "Service schedule reactivated"
      );
    } catch (reactivationError) {
      setError(
        reactivationError instanceof Error
          ? reactivationError.message
          : "Could not reactivate this schedule."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deactivate(event: FormEvent) {
    event.preventDefault();
    if (!member || !confirming) return;
    if (deactivateReason.trim().length < 5) {
      setDeactivateError("Give a short reason of at least 5 characters.");
      return;
    }

    setBusyId(confirming.id);
    setDeactivateError("");
    try {
      await updateMinistryDocument(
        member,
        "serviceSchedules",
        confirming.id,
        { active: false },
        `Schedule deactivated: ${deactivateReason.trim()}`
      );
      setConfirming(null);
      setDeactivateReason("");
    } catch (deactivationError) {
      setDeactivateError(
        deactivationError instanceof Error
          ? deactivationError.message
          : "Could not deactivate this schedule."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="grid grid-3">
        <Metric
          label="Active schedules"
          value={schedules.data.filter((schedule) => schedule.active).length}
          foot="Recurring service templates"
        />
        <Metric
          label="Open sessions"
          value={sessions.data.filter((session) => session.status === "OPEN").length}
          foot="Currently active"
        />
        <Metric
          label="Upcoming drafts"
          value={sessions.data.filter((session) => session.status === "DRAFT").length}
          foot="Need room assignments"
        />
      </div>

      <ServiceSessionOpener />

      <Card className="section">
        <div className="section-head">
          <div>
            <h3>Service schedules</h3>
            <small className="muted">
              Templates for recurring services. Deactivation never removes historical sessions or attendance.
            </small>
          </div>
          <Button onClick={() => openEditor(null)}><CalendarPlus size={16} /> New schedule</Button>
        </div>

        {schedules.loading ? (
          <ScreenLoading />
        ) : schedules.error ? (
          <ScreenError code={schedules.error} />
        ) : schedules.data.length ? (
          <DataTable headers={["Name", "Day", "Time", "Check-in opens", "State", "Actions"]}>
            {[...schedules.data]
              .sort((left, right) => left.displayOrder - right.displayOrder)
              .map((schedule) => (
                <tr key={schedule.id}>
                  <td><strong>{schedule.name}</strong></td>
                  <td>{weekdays[schedule.weekday]}</td>
                  <td>{schedule.startTime}{schedule.endTime ? `–${schedule.endTime}` : ""}</td>
                  <td>{schedule.checkInOpeningOffset} min before</td>
                  <td>
                    <StatusChip tone={schedule.active ? "success" : "neutral"}>
                      {schedule.active ? "Active" : "Inactive"}
                    </StatusChip>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Button variant="ghost" onClick={() => openEditor(schedule)}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button
                        variant={schedule.active ? "danger" : "ghost"}
                        disabled={busyId === schedule.id}
                        onClick={() => schedule.active
                          ? openDeactivation(schedule)
                          : void reactivate(schedule)}
                      >
                        {schedule.active ? <Archive size={14} /> : <ArchiveRestore size={14} />}
                        {busyId === schedule.id
                          ? "Saving…"
                          : schedule.active
                            ? "Deactivate"
                            : "Reactivate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </DataTable>
        ) : (
          <EmptyState
            title="No service schedules"
            description="Create the ministry’s recurring service times before opening dated sessions."
          />
        )}
      </Card>

      {editorOpen && (
        <ScheduleEditor schedule={editing} error={error} close={closeEditor} save={save} />
      )}
      {confirming && (
        <DeactivateScheduleModal
          schedule={confirming}
          reason={deactivateReason}
          error={deactivateError}
          busy={busyId === confirming.id}
          setReason={setDeactivateReason}
          close={() => setConfirming(null)}
          deactivate={deactivate}
        />
      )}
    </>
  );
}

function ScheduleEditor({
  schedule,
  error,
  close,
  save
}: {
  schedule: ServiceSchedule | null;
  error: string;
  close: () => void;
  save: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="modal-backdrop">
      <form key={schedule?.id || "new"} className="modal" onSubmit={save}>
        <h2>{schedule ? "Edit service schedule" : "New service schedule"}</h2>
        <p>Times are interpreted in the ministry timezone. Editing this template does not rewrite historical sessions.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label>Name</label>
          <input name="name" required minLength={2} defaultValue={schedule?.name || ""} />
        </div>
        <div className="split">
          <div className="field">
            <label>Day</label>
            <select name="weekday" defaultValue={schedule?.weekday ?? 0}>
              {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Check-in opens (minutes before)</label>
            <input
              name="offset"
              type="number"
              min="0"
              max="240"
              defaultValue={schedule?.checkInOpeningOffset ?? 30}
            />
          </div>
        </div>
        <div className="split">
          <div className="field">
            <label>Start</label>
            <input name="startTime" type="time" required defaultValue={schedule?.startTime || ""} />
          </div>
          <div className="field">
            <label>End</label>
            <input name="endTime" type="time" defaultValue={schedule?.endTime || ""} />
          </div>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          <Button>{schedule ? "Save changes" : "Create schedule"}</Button>
        </div>
      </form>
    </div>
  );
}

function DeactivateScheduleModal({
  schedule,
  reason,
  error,
  busy,
  setReason,
  close,
  deactivate
}: {
  schedule: ServiceSchedule;
  reason: string;
  error: string;
  busy: boolean;
  setReason: (value: string) => void;
  close: () => void;
  deactivate: (event: FormEvent) => Promise<void>;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal danger-modal"
        onSubmit={deactivate}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="deactivate-title"
      >
        <div className="danger-icon" aria-hidden="true"><Archive size={24} /></div>
        <h2 id="deactivate-title">Deactivate {schedule.name}?</h2>
        <p>
          This schedule will disappear from future service choices. Existing dated sessions, room
          assignments, and attendance records will stay exactly as they are.
        </p>
        <div className="impact-note">
          <strong>This is reversible.</strong>
          <span>You can reactivate the schedule later from this page.</span>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="deactivate-reason">Reason for deactivation</label>
          <textarea
            id="deactivate-reason"
            required
            minLength={5}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. This service time is no longer offered"
          />
          <small className="muted">Recorded in the audit log.</small>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>Keep schedule</Button>
          <Button type="submit" variant="danger" disabled={busy}>
            <Archive size={16} />{busy ? "Deactivating…" : "Deactivate schedule"}
          </Button>
        </div>
      </form>
    </div>
  );
}
