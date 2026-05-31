/** ED active workspace dashboard sections (local navigation). */
export type ErWorkspaceSection =
  | "triage"
  | "visitSummary"
  | "results"
  | "mar"
  | "orders"
  | "diagnostics"
  | "notes"
  | "nursing"
  | "providerMse"
  | "disposition";

const ER_WORKSPACE_SECTIONS = new Set<ErWorkspaceSection>([
  "triage",
  "visitSummary",
  "results",
  "mar",
  "orders",
  "diagnostics",
  "notes",
  "nursing",
  "providerMse",
  "disposition",
]);

/** Lowercase URL aliases — camelCase sections must not be lowercased blindly. */
const ER_WORKSPACE_SECTION_ALIASES: Record<string, ErWorkspaceSection> = {
  triage: "triage",
  visitsummary: "visitSummary",
  results: "results",
  mar: "mar",
  orders: "orders",
  diagnostics: "diagnostics",
  notes: "notes",
  nursing: "nursing",
  providermse: "providerMse",
  disposition: "disposition",
};

export function parseErWorkspaceSection(raw: string | null | undefined): ErWorkspaceSection | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (ER_WORKSPACE_SECTIONS.has(trimmed as ErWorkspaceSection)) {
    return trimmed as ErWorkspaceSection;
  }
  return ER_WORKSPACE_SECTION_ALIASES[trimmed.toLowerCase()] ?? null;
}
