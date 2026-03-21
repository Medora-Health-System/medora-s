/** Statuts pour lesquels la file labo / imagerie propose « Accuser réception ». */
export function worklistItemNeedsAcknowledge(status: string) {
  return status === "PLACED" || status === "PENDING" || status === "SIGNED";
}

export function worklistItemIsTerminal(status: string) {
  return status === "COMPLETED" || status === "RESULTED";
}
