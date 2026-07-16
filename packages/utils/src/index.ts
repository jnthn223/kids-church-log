export function formatDate(value: unknown, fallback = "—") {
  if (!value) return fallback;
  const candidate = typeof value === "object" && value && "toDate" in value ? (value as { toDate(): Date }).toDate() : new Date(value as string | number | Date);
  return Number.isNaN(candidate.getTime()) ? fallback : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(candidate);
}

export function formatDateTime(value: unknown, fallback = "—") {
  if (!value) return fallback;
  const candidate = typeof value === "object" && value && "toDate" in value ? (value as { toDate(): Date }).toDate() : new Date(value as string | number | Date);
  return Number.isNaN(candidate.getTime()) ? fallback : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(candidate);
}

export function isExpired(value: unknown) {
  if (!value) return true;
  const date = typeof value === "object" && value && "toDate" in value ? (value as { toDate(): Date }).toDate() : new Date(value as string | number | Date);
  return date.getTime() <= Date.now();
}

export function daysFromNow(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date; }
export function calculateAge(birthdate: string, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day || candidate > today) return null;
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}
export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(quote).join(","), ...rows.map((row) => headers.map((key) => quote(row[key])).join(","))].join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}
