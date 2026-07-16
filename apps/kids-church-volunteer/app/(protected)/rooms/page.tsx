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
  return <div className="operational-page"><div className="page-head room-page-head"><div><p className="eyebrow">Current service</p><h1>Rooms</h1><p>Today’s team controls room placement. Capacity is advisory and changes are recorded.</p></div><Button onClick={() => setEditing(true)}><Settings2 /> {rooms.length ? "Adjust room plan" : "Set up rooms"}</Button></div><div className="room-grid">{rooms.length ? rooms.map((room) => { const children = attendance.filter((item) => item.roomId === room.roomId && item.status === "CHECKED_IN"); const capacity = room.capacity || 0; const nearing = capacity > 0 && children.length >= Math.ceil(capacity * .85); return <Card className="room-card" key={room.id}><div className="room-head"><span className="room-icon"><DoorOpen /></span>{nearing && <StatusChip tone="warning">Near capacity</StatusChip>}</div><h2>{room.roomName}</h2><p>{room.groupName}</p><div className="room-count"><strong>{children.length}</strong><span>{capacity ? `of ${capacity} children` : "children checked in"}</span></div>{children.length ? <ul>{children.map((child) => <li key={child.id}>{child.childNameSnapshot}</li>)}</ul> : <p className="room-empty">No children checked into this room yet.</p>}</Card>; }) : <Card className="empty-card"><DoorOpen size={42} /><h2>Set up today’s rooms</h2><p>A Kids Church Volunteer chooses a room for every active group before check-in begins.</p><Button onClick={() => setEditing(true)}>Create room plan</Button></Card>}</div>{editing && <RoomMappingEditor onClose={() => setEditing(false)} />}</div>;
}
