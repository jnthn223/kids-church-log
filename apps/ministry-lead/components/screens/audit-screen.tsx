"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Download, Search } from "lucide-react";
import { Button, Card, EmptyState } from "@kcl/ui";
import { queryLimit, queryOrderBy, useMinistryCollection } from "@kcl/firebase";
import type { AuditLog } from "@kcl/types";
import { downloadCsv, formatDateTime } from "@kcl/utils";
import { DataTable, ScreenError, ScreenLoading } from "./shared";

type AuditSortKey = "timestamp" | "eventType" | "actorName" | "targetCollection";

function auditTimestamp(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis(): number }).toMillis();
  }
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().getTime();
  }
  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function AuditScreen() {
  const source = useMinistryCollection<AuditLog>("auditLogs", [
    queryOrderBy("timestamp", "desc"),
    queryLimit(250)
  ]);
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [actorFilter, setActorFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<AuditSortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const eventTypes = useMemo(
    () => [...new Set(source.data.map((item) => item.eventType).filter(Boolean))].sort(),
    [source.data]
  );
  const actors = useMemo(
    () => [...new Set(source.data.map((item) => item.actorName).filter(Boolean))].sort(),
    [source.data]
  );
  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return source.data
      .filter((item) => {
        const matchesEvent = eventFilter === "ALL" || item.eventType === eventFilter;
        const matchesActor = actorFilter === "ALL" || item.actorName === actorFilter;
        const searchable = [
          item.eventType,
          item.actorName,
          item.targetCollection,
          item.targetId,
          item.reason || "",
          item.applicationSource
        ].join(" ").toLowerCase();
        return matchesEvent && matchesActor && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => {
        const leftValue = sortKey === "timestamp"
          ? auditTimestamp(left.timestamp)
          : String(left[sortKey] || "").toLowerCase();
        const rightValue = sortKey === "timestamp"
          ? auditTimestamp(right.timestamp)
          : String(right[sortKey] || "").toLowerCase();
        const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [source.data, query, eventFilter, actorFilter, sortKey, sortDirection]);

  function exportRows() {
    downloadCsv(
      `kidschurchlog-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((item) => ({
        when: formatDateTime(item.timestamp),
        event: item.eventType,
        actor: item.actorName,
        application: item.applicationSource,
        target_collection: item.targetCollection,
        target_id: item.targetId,
        reason: item.reason || ""
      }))
    );
  }

  if (source.loading) return <ScreenLoading />;
  if (source.error) return <Card className="section"><ScreenError code={source.error} /></Card>;
  if (!source.data.length) {
    return (
      <Card className="section">
        <EmptyState
          title="No audited changes yet"
          description="Sensitive actions will create immutable accountability events."
        />
      </Card>
    );
  }

  const directionLabel = sortKey === "timestamp"
    ? sortDirection === "desc" ? "Newest first" : "Oldest first"
    : sortDirection === "asc" ? "A–Z" : "Z–A";

  return (
    <Card className="section">
      <div className="audit-filter-row">
        <div className="audit-search">
          <Search size={18} aria-hidden="true" />
          <input
            className="search-input"
            type="search"
            aria-label="Search audit activity"
            placeholder="Search action, actor, target, or reason"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className="toolbar-select"
          aria-label="Filter by action"
          value={eventFilter}
          onChange={(event) => setEventFilter(event.target.value)}
        >
          <option value="ALL">All actions</option>
          {eventTypes.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
          ))}
        </select>
        <select
          className="toolbar-select"
          aria-label="Filter by actor"
          value={actorFilter}
          onChange={(event) => setActorFilter(event.target.value)}
        >
          <option value="ALL">All actors</option>
          {actors.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <div className="audit-utility-row">
        <p className="result-count" role="status">
          Showing <strong>{rows.length}</strong> of {source.data.length} loaded audit events
        </p>
        <div className="audit-actions">
          <select
            className="toolbar-select audit-sort"
            aria-label="Sort audit activity"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as AuditSortKey)}
          >
            <option value="timestamp">Date</option>
            <option value="eventType">Action</option>
            <option value="actorName">Actor</option>
            <option value="targetCollection">Target</option>
          </select>
          <Button
            className="audit-direction"
            variant="ghost"
            type="button"
            onClick={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")}
          >
            <ArrowDownUp size={16} /> {directionLabel}
          </Button>
          <Button variant="secondary" type="button" disabled={!rows.length} onClick={exportRows}>
            <Download size={16} /> Export CSV
          </Button>
        </div>
      </div>
      {rows.length ? (
        <DataTable headers={["When", "Action", "Actor", "Target", "Reason"]}>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>{formatDateTime(item.timestamp)}</td>
              <td>
                <strong>{item.eventType.replaceAll("_", " ")}</strong><br />
                <small className="muted">{item.applicationSource.replaceAll("_", " ")}</small>
              </td>
              <td>{item.actorName}</td>
              <td>{item.targetCollection} / {item.targetId}</td>
              <td>{item.reason || "—"}</td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          title="No matching audit events"
          description="Clear or change the search and filters to see other activity."
        />
      )}
    </Card>
  );
}
