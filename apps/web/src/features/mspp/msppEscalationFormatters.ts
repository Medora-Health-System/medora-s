import type { MsppAlertEscalationRow } from "@/lib/msppApi";

export function formatMsppEscalationGeo(row: MsppAlertEscalationRow): string {
  if (row.scope === "COMMUNE") {
    const c = row.communeName?.trim() || "—";
    const d = row.departmentName?.trim() || "";
    return d ? `${c} (${d})` : c;
  }
  return row.departmentName?.trim() || "—";
}
