"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, EmptyState, StatusChip } from "@kcl/ui";
import { useMinistryCollection } from "@kcl/firebase";
import type { Household } from "@kcl/types";
import { DataTable, ScreenError, ScreenLoading } from "./shared";

export function FamiliesScreen() {
  const source = useMinistryCollection<Household>("households");
  const [query, setQuery] = useState("");
  const rows = source.data.filter((household) =>
    (household.householdName || "").toLowerCase().includes(query.toLowerCase())
  );

  if (source.loading) return <ScreenLoading />;
  if (source.error) return <ScreenError code={source.error} />;

  return (
    <Card className="section">
      <div className="toolbar">
        <Search size={18} />
        <input
          className="search-input"
          placeholder="Search household"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {!source.data.length ? (
        <EmptyState
          title="No families registered yet"
          description="Family registration belongs in the separate Admin Volunteer application."
        />
      ) : (
        <DataTable headers={["Household", "Primary guardian", "Children", "Pass", "State"]}>
          {rows.map((household) => (
            <tr key={household.id}>
              <td><strong>{household.householdName}</strong></td>
              <td>{household.primaryGuardianName || "—"}</td>
              <td>{household.childIds?.length || 0}</td>
              <td>
                <StatusChip tone={household.passStatus === "ACTIVE" ? "success" : "warning"}>
                  {household.passStatus || "Not issued"}
                </StatusChip>
              </td>
              <td>
                <StatusChip tone={household.active ? "success" : "danger"}>
                  {household.active ? "Active" : "Inactive"}
                </StatusChip>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}
