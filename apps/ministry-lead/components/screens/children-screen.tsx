"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, EmptyState, StatusChip } from "@kcl/ui";
import { useMinistryCollection } from "@kcl/firebase";
import type { Child } from "@kcl/types";
import { formatDate } from "@kcl/utils";
import { DataTable, ScreenError, ScreenLoading } from "./shared";

export function ChildrenScreen() {
  const source = useMinistryCollection<Child>("children");
  const [query, setQuery] = useState("");
  const rows = source.data.filter((child) =>
    `${child.firstName} ${child.lastName} ${child.preferredName || ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  if (source.loading) return <ScreenLoading />;
  if (source.error) return <ScreenError code={source.error} />;

  return (
    <Card className="section">
      <div className="toolbar">
        <Search size={18} />
        <input
          className="search-input"
          placeholder="Search child"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {!source.data.length ? (
        <EmptyState
          title="No children registered yet"
          description="Children appear after assisted registration in the Admin Volunteer application."
        />
      ) : (
        <DataTable headers={["Child", "Birthdate", "Group", "Safety alert", "State"]}>
          {rows.map((child) => (
            <tr key={child.id}>
              <td><strong>{child.preferredName || child.firstName} {child.lastName}</strong></td>
              <td>{child.birthdate ? formatDate(child.birthdate) : "—"}</td>
              <td>{child.ministryGroupId || "Unassigned"}</td>
              <td>
                {child.allergies ? (
                  <StatusChip tone="danger">Allergy on record</StatusChip>
                ) : child.assistanceNotes ? (
                  <StatusChip tone="info">Assistance note</StatusChip>
                ) : (
                  "None"
                )}
              </td>
              <td>
                <StatusChip tone={child.active ? "success" : "danger"}>
                  {child.active ? "Active" : "Inactive"}
                </StatusChip>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}
