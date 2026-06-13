export type HospitalTechnicianSection = "vitals" | "notes" | "summary";

const SECTION_SET = new Set<string>(["vitals", "notes", "summary"]);

export function parseHospitalTechnicianSection(
  raw: string | null | undefined
): HospitalTechnicianSection | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!value || !SECTION_SET.has(value)) return null;
  return value as HospitalTechnicianSection;
}
