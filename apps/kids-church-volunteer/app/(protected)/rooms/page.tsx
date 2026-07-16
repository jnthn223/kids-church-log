"use client";
import { DoorOpen } from "lucide-react";
import { Card, StatusChip } from "@kcl/ui";
import { useAuthAccess } from "@kcl/firebase";
import { useVolunteerOperations } from "@/components/volunteer-context";

export default function RoomsPage() {
  const { member } = useAuthAccess();
  const { sessionContext, attendance } = useVolunteerOperations();
  if (!sessionContext) return <div className="operational-page"><Card className="empty-card"><DoorOpen size={42} /><h2>Choose a service first</h2><p>Room assignments appear after you join an open service.</p></Card></div>;
  const assignedRoomIds = new Set(sessionContext.volunteerAssignments.filter((item) => item.memberUid === member?.userId && item.roomId).map((item) => item.roomId));
  const rooms = sessionContext.roomAssignments.filter((item) => !assignedRoomIds.size || assignedRoomIds.has(item.roomId));
  return <div className="operational-page"><div className="page-head"><div><p className="eyebrow">Current service</p><h1>Rooms</h1><p>Capacity warnings are advisory. Ask the lead before moving a child.</p></div></div><div className="room-grid">{rooms.length ? rooms.map((room) => { const children = attendance.filter((item) => item.roomId === room.roomId && item.status === "CHECKED_IN"); const capacity = room.capacity || 0; const nearing = capacity > 0 && children.length >= Math.ceil(capacity * .85); return <Card className="room-card" key={room.id}><div className="room-head"><span className="room-icon"><DoorOpen /></span>{nearing && <StatusChip tone="warning">Near capacity</StatusChip>}</div><h2>{room.roomName}</h2><p>{room.groupName}</p><div className="room-count"><strong>{children.length}</strong><span>{capacity ? `of ${capacity} children` : "children checked in"}</span></div>{children.length ? <ul>{children.map((child) => <li key={child.id}>{child.childNameSnapshot}</li>)}</ul> : <p className="room-empty">No children checked into this room yet.</p>}</Card>; }) : <Card className="empty-card"><DoorOpen size={42} /><h2>No room assignments</h2><p>Ask the Ministry Lead to configure group-to-room assignments before check-in.</p></Card>}</div></div>;
}
