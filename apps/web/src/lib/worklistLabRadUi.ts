/** Statuts pour lesquels la file labo / imagerie propose « Accuser réception ». */
export function worklistItemNeedsAcknowledge(status: string | null | undefined): boolean {
  const st = String(status ?? "").trim().toUpperCase();
  return st === "PLACED" || st === "PENDING" || st === "SIGNED";
}

export function worklistItemAllowsStart(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "ACKNOWLEDGED";
}

export function worklistItemAllowsComplete(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "IN_PROGRESS";
}

export function worklistItemIsTerminal(status: string | null | undefined): boolean {
  const st = String(status ?? "").trim().toUpperCase();
  return st === "COMPLETED" || st === "RESULTED" || st === "VERIFIED";
}

export function worklistItemShowsWorkflowActions(status: string | null | undefined): boolean {
  const st = String(status ?? "").trim().toUpperCase();
  if (worklistItemIsTerminal(st)) return false;
  if (st === "CANCELLED" || st === "DRAFT") return false;
  return (
    worklistItemNeedsAcknowledge(st) ||
    worklistItemAllowsStart(st) ||
    worklistItemAllowsComplete(st)
  );
}
