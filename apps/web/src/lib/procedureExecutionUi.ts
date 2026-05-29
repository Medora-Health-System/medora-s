import type { EnterpriseProcedureExecutionRoleCategory } from "@medora/shared";

export function procedureExecutionCategoryLabelKey(
  category: EnterpriseProcedureExecutionRoleCategory
): string {
  return `procedureExecutionLinkage.category.${category}`;
}

export function orderItemStatusLabelKey(status: string): string | null {
  const normalized = String(status ?? "").trim().toUpperCase();
  switch (normalized) {
    case "PENDING":
    case "PLACED":
    case "SIGNED":
      return "procedureExecutionLinkage.statusOrdered";
    case "ACKNOWLEDGED":
      return "procedureExecutionLinkage.statusAcknowledged";
    case "IN_PROGRESS":
      return "procedureExecutionLinkage.statusInProgress";
    case "COMPLETED":
    case "RESULTED":
    case "VERIFIED":
      return "procedureExecutionLinkage.statusCompleted";
    default:
      return null;
  }
}
