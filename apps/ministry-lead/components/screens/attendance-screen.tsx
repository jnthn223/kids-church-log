"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { Button, Card, EmptyState, StatusChip } from "@kcl/ui";
import { useMinistryCollection } from "@kcl/firebase";
import type { Attendance } from "@kcl/types";
import { downloadCsv } from "@kcl/utils";
import { DataTable, ScreenLoading } from "./shared";

export function AttendanceScreen() {
  const source = useMinistryCollection<Attendance>("attendance");
  const [query, setQuery] = useState("");
  const rows = source.data.filter((attendance) =>
    `${attendance.childNameSnapshot} ${attendance.householdNameSnapshot}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  function exportAttendance() {
    downloadCsv(
      "kidschurchlog-attendance.csv",
      rows.map((attendance) => ({
        child: attendance.childNameSnapshot,
        family: attendance.householdNameSnapshot,
        date: attendance.localServiceDate,
        group: attendance.groupNameSnapshot,
        room: attendance.roomNameSnapshot,
        differentPlacement: attendance.placementOverridden ? "Yes" : "No",
        placementReason: attendance.placementOverrideReason || "",
        status: attendance.status
      }))
    );
  }

  if (source.loading) return <ScreenLoading />;

  return (
    <Card className="section">
      <div className="toolbar">
        <Search size={18} />
        <input
          className="search-input"
          placeholder="Search child or family"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button variant="secondary" disabled={!rows.length} onClick={exportAttendance}>
          <Download size={16} /> Export CSV
        </Button>
      </div>
      {!rows.length ? (
        <EmptyState
          title="No attendance records"
          description="Committed check-ins will appear here after the Kids Church Volunteer app launches."
        />
      ) : (
        <DataTable headers={["Child", "Family", "Date", "Group", "Room", "Placement", "Status"]}>
          {rows.map((attendance) => (
            <tr key={attendance.id}>
              <td><strong>{attendance.childNameSnapshot}</strong></td>
              <td>{attendance.householdNameSnapshot}</td>
              <td>{attendance.localServiceDate || "—"}</td>
              <td>{attendance.groupNameSnapshot}</td>
              <td>{attendance.roomNameSnapshot}</td>
              <td>{attendance.placementOverridden ? attendance.placementOverrideReason || "Different from registration" : "Registered group"}</td>
              <td>
                <StatusChip tone={attendance.status === "CHECKED_IN" ? "warning" : "success"}>
                  {attendance.status.replace("_", " ")}
                </StatusChip>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}
