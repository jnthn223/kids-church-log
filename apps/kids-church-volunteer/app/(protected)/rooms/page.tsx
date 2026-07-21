"use client";
import { DoorOpen, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, StatusChip } from "@kcl/ui";
import { useVolunteerOperations } from "@/components/volunteer-context";
import { RoomMappingEditor } from "@/components/room-mapping-editor";

export default function RoomsPage() {
  const { sessionContext, attendance } = useVolunteerOperations();
  const [editing, setEditing] = useState(false);
  if (!sessionContext) return <div className="operational-page"><Card className="empty-card"><DoorOpen size={42} /><h2>Choose a service first</h2><p>Room assignments appear after you join an open service.</p></Card></div>;
  const rooms = sessionContext.roomAssignments;
  const closed = sessionContext.session.status === "CLOSED";
  return <div className="operational-page"><div className="page-head room-page-head"><div><p className="eyebrow">{closed ? "Closed service" : "Current service"}</p><h1>Rooms</h1><p>{closed ? "Final room placements and attendance for this closed service." : "Today’s team controls group and room placements. Capacity is advisory and changes are recorded."}</p></div>{!closed && <Button onClick={() => setEditing(true)}><Settings2 /> {rooms.length ? "Adjust room plan" : "Set up rooms"}</Button>}</div><div className="room-grid">{rooms.length ? rooms.map((room) => { const children = attendance.filter((item) => item.roomId === room.roomId && item.groupId === room.groupId && (closed || item.status === "CHECKED_IN")); const capacity = room.capacity || 0; const nearing = !closed && capacity > 0 && children.length >= Math.ceil(capacity * .85); return <Card className="room-card" key={room.id}><div className="room-head"><span className="room-icon"><DoorOpen /></span>{closed ? <StatusChip tone="neutral">Final</StatusChip> : nearing && <StatusChip tone="warning">Near capacity</StatusChip>}</div><h2>{room.roomName}</h2><p>{room.groupName}</p><div className="room-count"><strong>{children.length}</strong><span>{closed ? "children served" : capacity ? `of ${capacity} children` : "children checked in"}</span></div>{children.length ? <ul>{children.map((child) => <li key={child.id}>{child.childNameSnapshot}{child.placementOverridden ? " · different placement" : ""}</li>)}</ul> : <p className="room-empty">No children attended this placement.</p>}</Card>; }) : <Card className="empty-card"><DoorOpen size={42} /><h2>{closed ? "No room plan recorded" : "Set up today’s rooms"}</h2><p>{closed ? "This service closed without active room assignments." : "A Kids Church Volunteer chooses the operating groups and rooms before check-in begins."}</p>{!closed && <Button onClick={() => setEditing(true)}>Create room plan</Button>}</Card>}</div>{editing && !closed && <RoomMappingEditor onClose={() => setEditing(false)} />}</div>;
}
