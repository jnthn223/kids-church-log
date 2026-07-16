"use client";

import { useState, type FormEvent } from "react";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { Button, Card, EmptyState, StatusChip } from "@kcl/ui";
import {
  createMinistryDocument,
  updateMinistryDocument,
  useAuthAccess,
  useMinistryCollection
} from "@kcl/firebase";
import type { MinistryGroup, Room } from "@kcl/types";
import { ScreenLoading } from "./shared";

type EntityKind = "group" | "room";
type Entity = MinistryGroup | Room;

export function GroupsRoomsScreen() {
  const groups = useMinistryCollection<MinistryGroup>("ministryGroups");
  const rooms = useMinistryCollection<Room>("rooms");

  return (
    <>
      <Card className="section concept-guide">
        <div>
          <StatusChip tone="info">Ministry groups</StatusChip>
          <h3>Who the children serve with</h3>
          <p>
            Use the names your church already knows, such as <strong>Small Kids</strong> and
            <strong> Big Kids</strong>. Optional age ranges are guidance, not hardcoded limits.
          </p>
        </div>
        <div>
          <StatusChip tone="neutral">Rooms</StatusChip>
          <h3>Where they meet</h3>
          <p>
            Use familiar physical-space names such as <strong>Purple Room</strong> and
            <strong> Green Room</strong>. A group can use a different room for each service.
          </p>
        </div>
      </Card>
      <div className="grid grid-2">
        <EntityPanel title="Ministry groups" kind="group" rows={groups.data} loading={groups.loading} />
        <EntityPanel title="Rooms" kind="room" rows={rooms.data} loading={rooms.loading} />
      </div>
    </>
  );
}

function EntityPanel({
  title,
  kind,
  rows,
  loading
}: {
  title: string;
  kind: EntityKind;
  rows: Entity[];
  loading: boolean;
}) {
  const { member } = useAuthAccess();
  const [editor, setEditor] = useState<Entity | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<Entity | null>(null);
  const [error, setError] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [busyId, setBusyId] = useState("");

  const path = kind === "group" ? "ministryGroups" : "rooms";
  const entityLabel = kind === "group" ? "Ministry group" : "Room";

  function openEditor(row: Entity | null) {
    setEditor(row);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (name.length < 2) {
      setError("Name must have at least 2 characters.");
      return;
    }

    const commonValues = {
      name,
      displayOrder: Number(form.get("displayOrder") || 0),
      active: editor?.active ?? true
    };
    const values = kind === "group"
      ? { ...commonValues, shortLabel: String(form.get("shortLabel") || "").trim() }
      : {
          ...commonValues,
          buildingArea: String(form.get("buildingArea") || "").trim(),
          capacity: Number(form.get("capacity") || 0) || null
        };

    try {
      if (editor) {
        await updateMinistryDocument(
          member,
          path,
          editor.id,
          values,
          `${entityLabel} details updated`
        );
      } else {
        await createMinistryDocument(member, path, values);
      }
      setEditor(undefined);
      setError("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `The ${kind} could not be saved.`);
    }
  }

  function openRemoval(row: Entity) {
    setConfirming(row);
    setDeleteReason("");
    setDeleteError("");
  }

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member || !confirming) return;
    if (deleteReason.trim().length < 5) {
      setDeleteError("Give a reason of at least 5 characters.");
      return;
    }

    setBusyId(confirming.id);
    setDeleteError("");
    try {
      await updateMinistryDocument(
        member,
        path,
        confirming.id,
        { active: false },
        `${entityLabel} removed: ${deleteReason.trim()}`
      );
      setConfirming(null);
      setDeleteReason("");
    } catch (removalError) {
      setDeleteError(
        removalError instanceof Error ? removalError.message : `The ${kind} could not be removed.`
      );
    } finally {
      setBusyId("");
    }
  }

  async function restore(row: Entity) {
    if (!member) return;
    setBusyId(row.id);
    try {
      await updateMinistryDocument(
        member,
        path,
        row.id,
        { active: true },
        `${entityLabel} restored`
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <Card className="section">
      <div className="section-head">
        <h3>{title}</h3>
        <Button onClick={() => openEditor(null)}><Plus size={16} /> Add</Button>
      </div>

      {loading ? (
        <ScreenLoading />
      ) : rows.length ? (
        <div className="setup-list">
          {[...rows].sort((left, right) => left.displayOrder - right.displayOrder).map((row) => (
            <div className="setup-item entity-item" key={row.id}>
              <span>
                <strong>{row.name}</strong>
                <small className="muted"> · {entitySummary(kind, row)}</small>
              </span>
              <div className="entity-actions">
                <StatusChip tone={row.active ? "success" : "neutral"}>
                  {row.active ? "Active" : "Inactive"}
                </StatusChip>
                <Button variant="ghost" onClick={() => openEditor(row)}>
                  <Pencil size={14} /> Edit
                </Button>
                {row.active ? (
                  <Button variant="danger" onClick={() => openRemoval(row)}>
                    <Archive size={14} /> Delete
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={busyId === row.id}
                    onClick={() => void restore(row)}
                  >
                    <ArchiveRestore size={14} />
                    {busyId === row.id ? "Restoring…" : "Restore"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          description="Configuration is stored as ministry data, never hardcoded."
        />
      )}

      {editor !== undefined && (
        <EntityEditor
          kind={kind}
          editor={editor}
          rowCount={rows.length}
          error={error}
          close={() => setEditor(undefined)}
          save={save}
        />
      )}
      {confirming && (
        <DeleteEntityModal
          kind={kind}
          entity={confirming}
          reason={deleteReason}
          error={deleteError}
          busy={busyId === confirming.id}
          setReason={setDeleteReason}
          close={() => setConfirming(null)}
          remove={remove}
        />
      )}
    </Card>
  );
}

function entitySummary(kind: EntityKind, row: Entity) {
  if (kind === "group") return (row as MinistryGroup).shortLabel || "No short label";
  const capacity = (row as Room).capacity;
  return capacity ? `Capacity ${capacity}` : "No capacity";
}

function EntityEditor({
  kind,
  editor,
  rowCount,
  error,
  close,
  save
}: {
  kind: EntityKind;
  editor: Entity | null;
  rowCount: number;
  error: string;
  close: () => void;
  save: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const group = kind === "group" ? (editor as MinistryGroup | null) : null;
  const room = kind === "room" ? (editor as Room | null) : null;

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={save}>
        <h2>{editor ? "Edit" : "Add"} {kind}</h2>
        <p>
          {editor
            ? "Update this configurable ministry value. Historical records keep their references."
            : `Create a configurable ${kind} for this ministry.`}
        </p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label>Name</label>
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={editor?.name || ""}
            placeholder={kind === "group" ? "e.g. Small Kids or Big Kids" : "e.g. Purple Room or Green Room"}
          />
        </div>
        {kind === "group" ? (
          <div className="field">
            <label>Short label <span className="muted">(optional)</span></label>
            <input
              name="shortLabel"
              maxLength={20}
              defaultValue={group?.shortLabel || ""}
              placeholder="e.g. Small or Big"
            />
            <small className="muted">
              Leave blank when the full group name is already short and familiar.
            </small>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Building or area</label>
              <input
                name="buildingArea"
                maxLength={100}
                defaultValue={room?.buildingArea || ""}
                placeholder="e.g. Kids Church wing"
              />
            </div>
            <div className="field">
              <label>Capacity (optional)</label>
              <input
                name="capacity"
                type="number"
                min="1"
                max="1000"
                defaultValue={room?.capacity || ""}
              />
            </div>
          </>
        )}
        <div className="field">
          <label>Display order</label>
          <input
            name="displayOrder"
            type="number"
            min="0"
            max="9999"
            defaultValue={editor?.displayOrder ?? rowCount}
          />
        </div>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          <Button>{editor ? "Save changes" : "Create"}</Button>
        </div>
      </form>
    </div>
  );
}

function DeleteEntityModal({
  kind,
  entity,
  reason,
  error,
  busy,
  setReason,
  close,
  remove
}: {
  kind: EntityKind;
  entity: Entity;
  reason: string;
  error: string;
  busy: boolean;
  setReason: (value: string) => void;
  close: () => void;
  remove: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal danger-modal"
        onSubmit={remove}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="entity-delete-title"
      >
        <div className="danger-icon" aria-hidden="true"><Archive size={24} /></div>
        <h2 id="entity-delete-title">Delete {entity.name}?</h2>
        <p>
          The {kind} will no longer be available for new assignments. Historical services and
          attendance will keep their existing references.
        </p>
        <div className="impact-note">
          <strong>This is a soft delete.</strong>
          <span>You can restore it later from this page.</span>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="entity-delete-reason">Reason for deletion</label>
          <textarea
            id="entity-delete-reason"
            required
            minLength={5}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={kind === "group" ? "e.g. This age grouping is no longer used" : "e.g. This room is no longer available"}
          />
          <small className="muted">Recorded in the audit log.</small>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>Keep {kind}</Button>
          <Button type="submit" variant="danger" disabled={busy}>
            <Archive size={16} />{busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </form>
    </div>
  );
}
