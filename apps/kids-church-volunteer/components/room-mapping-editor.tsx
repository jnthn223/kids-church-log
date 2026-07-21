"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRightLeft, X } from "lucide-react";
import { Button, Card } from "@kcl/ui";
import {
  moveCheckedInChildrenToMappedRooms,
  saveSessionRoomMappings,
  useAuthAccess,
  useMinistryCollection,
  type SessionRoomMappingInput
} from "@kcl/firebase";
import type { MinistryGroup, Room } from "@kcl/types";
import { useVolunteerOperations } from "./volunteer-context";

export function RoomMappingEditor({ onClose }: { onClose(): void }) {
  const { member } = useAuthAccess();
  const { sessionContext, attendance, refreshSession } = useVolunteerOperations();
  const groups = useMinistryCollection<MinistryGroup>("ministryGroups");
  const rooms = useMinistryCollection<Room>("rooms");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [moveCurrent, setMoveCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeGroups = useMemo(
    () => groups.data.filter((group) => group.active).sort((a, b) => a.displayOrder - b.displayOrder),
    [groups.data]
  );
  const activeRooms = useMemo(
    () => rooms.data.filter((room) => room.active).sort((a, b) => a.displayOrder - b.displayOrder),
    [rooms.data]
  );
  const hasExisting = Boolean(sessionContext?.roomAssignments.length);
  const affectedCurrent = attendance.filter((record) => {
    if (record.status !== "CHECKED_IN") return false;
    const selectedRoom = choices[record.groupId];
    return selectedRoom && selectedRoom !== record.roomId;
  });

  useEffect(() => {
    if (!sessionContext) return;
    setChoices(Object.fromEntries(
      sessionContext.roomAssignments.map((assignment) => [assignment.groupId, assignment.roomId])
    ));
    setSelectedGroupIds(sessionContext.roomAssignments.length
      ? sessionContext.roomAssignments.map((assignment) => assignment.groupId)
      : activeGroups.map((group) => group.id));
    setReason(sessionContext.roomAssignments.length ? "" : "Initial room setup for this service");
  }, [sessionContext, activeGroups]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!member || !sessionContext) return;
    if (!selectedGroupIds.length) {
      setError("Choose at least one group for this service.");
      return;
    }
    if (selectedGroupIds.some((groupId) => !choices[groupId])) {
      setError("Choose a room for every selected ministry group.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Give a short operational reason of at least 5 characters.");
      return;
    }
    const mappings: SessionRoomMappingInput[] = activeGroups.filter((group) => selectedGroupIds.includes(group.id)).map((group) => {
      const room = activeRooms.find((item) => item.id === choices[group.id]);
      if (!room) throw new Error("ROOM_REQUIRED");
      return {
        groupId: group.id,
        groupName: group.name,
        roomId: room.id,
        roomName: room.name,
        capacity: room.capacity
      };
    });
    setBusy(true); setError("");
    try {
      await saveSessionRoomMappings(
        member,
        sessionContext.session.id,
        sessionContext.session.revision || 0,
        mappings,
        reason,
        "KIDS_CHURCH_VOLUNTEER",
        attendance
      );
      if (moveCurrent && affectedCurrent.length) {
        await moveCheckedInChildrenToMappedRooms(
          member,
          sessionContext.session.id,
          affectedCurrent,
          mappings,
          reason,
          "KIDS_CHURCH_VOLUNTEER"
        );
      }
      await refreshSession();
      onClose();
    } catch (value) {
      const code = value instanceof Error ? value.message : "";
      setError(code === "ROOM_MAPPING_CONFLICT"
        ? "Another station changed the room plan first. Close this editor, review the latest mapping, then try again."
        : code === "PLACEMENT_HAS_CHECKED_IN_CHILDREN"
        ? "A group with checked-in children cannot be removed. Move or check out those children first."
        : "The room mapping could not be saved. Nothing changed; review and retry.");
    } finally { setBusy(false); }
  }

  if (!sessionContext) return null;
  return <div className="mapping-backdrop" role="dialog" aria-modal="true" aria-labelledby="mapping-title"><Card className="mapping-dialog"><div className="mapping-head"><div><p className="eyebrow">Live service setup</p><h1 id="mapping-title">Group room mapping</h1><p>Choose which groups are operating and where each one meets today. Changes are visible to every station.</p></div><Button variant="ghost" aria-label="Close room mapping" disabled={busy} onClick={onClose}><X /></Button></div>{error && <div className="form-error" role="alert">{error}</div>}{groups.loading || rooms.loading ? <div className="loading"><div className="spinner" />Loading groups and rooms…</div> : !activeGroups.length || !activeRooms.length ? <div className="form-error">Active ministry groups and rooms must exist before mapping.</div> : <form onSubmit={(event) => void save(event)}><div className="mapping-list">{activeGroups.map((group) => { const enabled = selectedGroupIds.includes(group.id); const hasCheckedIn = attendance.some((record) => record.status === "CHECKED_IN" && record.groupId === group.id); return <div key={group.id} className={`mapping-row ${enabled ? "selected" : ""}`}><label className="mapping-group-toggle"><input type="checkbox" checked={enabled} disabled={hasCheckedIn} onChange={(event) => setSelectedGroupIds((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))} /><span><strong>{group.name}</strong><small>{hasCheckedIn ? "In use by checked-in children" : group.minAge !== undefined || group.maxAge !== undefined ? `Age guidance: ${group.minAge ?? 0}–${group.maxAge ?? "up"}` : "Ministry group"}</small></span></label><ArrowRightLeft /><select aria-label={`Room for ${group.name}`} disabled={!enabled} required={enabled} value={choices[group.id] || ""} onChange={(event) => setChoices((current) => ({ ...current, [group.id]: event.target.value }))}><option value="">Choose room</option>{activeRooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.capacity ? ` · capacity ${room.capacity}` : ""}</option>)}</select></div>; })}</div>{affectedCurrent.length > 0 && <div className="move-current"><AlertTriangle /><div><strong>{affectedCurrent.length} checked-in {affectedCurrent.length === 1 ? "child is" : "children are"} affected</strong><p>A mapping change controls new check-ins. Confirm below only if those children are also physically moving now.</p><label><input type="checkbox" checked={moveCurrent} onChange={(event) => setMoveCurrent(event.target.checked)} /> Update their live attendance room too</label></div></div>}<div className="field"><label htmlFor="mapping-reason">Reason for {hasExisting ? "change" : "setup"}</label><textarea id="mapping-reason" required minLength={5} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Room 2 unavailable because the air conditioner is down" /></div><div className="mapping-actions"><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy}>{busy ? "Saving room plan…" : "Save room plan"}</Button></div></form>}</Card></div>;
}
