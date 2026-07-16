"use client";

import { useMemo } from "react";
import { Card, EmptyState, StatusChip } from "@kcl/ui";
import { useMinistryCollection } from "@kcl/firebase";
import type { Attendance, Household } from "@kcl/types";
import { Metric, ScreenLoading } from "./shared";

export function ReportsScreen() {
  const attendance = useMinistryCollection<Attendance>("attendance");
  const households = useMinistryCollection<Household>("households");
  const attendanceByGroup = useMemo(
    () => attendance.data.reduce<Record<string, number>>((totals, record) => {
      const groupName = record.groupNameSnapshot || "Unassigned";
      totals[groupName] = (totals[groupName] || 0) + 1;
      return totals;
    }, {}),
    [attendance.data]
  );

  if (attendance.loading || households.loading) return <ScreenLoading />;

  return (
    <>
      <div className="grid grid-3">
        <Metric label="Attendance loaded" value={attendance.data.length} foot="Bounded recent records" />
        <Metric
          label="Families represented"
          value={new Set(attendance.data.map((record) => record.householdNameSnapshot)).size}
          foot="Within loaded records"
        />
        <Metric
          label="Active households"
          value={households.data.filter((household) => household.active).length}
          foot="Registration records"
        />
      </div>
      <Card className="section">
        <div className="section-head"><h3>Attendance by group</h3></div>
        {Object.keys(attendanceByGroup).length ? (
          <div className="setup-list">
            {Object.entries(attendanceByGroup)
              .sort((left, right) => right[1] - left[1])
              .map(([name, count]) => (
                <div className="setup-item" key={name}>
                  <strong>{name}</strong>
                  <StatusChip tone="info">{count}</StatusChip>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing to report yet"
            description="Reports remain intentionally simple until attendance data exists."
          />
        )}
      </Card>
    </>
  );
}
