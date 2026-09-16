import type { DigitalCareRosterPatient, DigitalCareWorkspaceMedication, DigitalCareWorkspaceResult } from "@/lib/digitalCareStaffWorkspaceApi";

export const DIGITAL_CARE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function digitalCareSafeLabel(value: string | null | undefined, fallback = "—"): string {
  const text = (value ?? "").trim();
  if (!text || DIGITAL_CARE_UUID.test(text)) return fallback;
  return text;
}

export function digitalCareInitials(name: string): string {
  const parts = digitalCareSafeLabel(name, "P")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0 || parts[0] === "—") return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function digitalCareFormatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function digitalCareFormatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export type DigitalCareRosterFilter = "ALL" | "RECENT" | "ACTIVE" | "OBSERVATION" | "DISCHARGED" | "UNREAD";

export function filterDigitalCareRoster(
  patients: DigitalCareRosterPatient[],
  filter: DigitalCareRosterFilter,
  now = Date.now(),
): DigitalCareRosterPatient[] {
  return patients.filter((patient) => {
    switch (filter) {
      case "RECENT":
        return Boolean(patient.arrivedAt && now - new Date(patient.arrivedAt).getTime() <= 72 * 60 * 60 * 1000);
      case "ACTIVE":
        return patient.visitStatus === "OPEN" && !patient.dischargedAt;
      case "OBSERVATION":
        return patient.visitType === "OBSERVATION";
      case "DISCHARGED":
        return Boolean(patient.dischargedAt) || patient.visitStatus === "CLOSED";
      case "UNREAD":
        return patient.unreadCount > 0;
      default:
        return true;
    }
  });
}

export function digitalCareResultKindFilter(result: DigitalCareWorkspaceResult, kind: "ALL" | "LAB" | "IMAGING" | "OTHER"): boolean {
  if (kind === "ALL") return true;
  if (kind === "LAB") return result.kind === "LAB_TEST";
  if (kind === "IMAGING") return result.kind === "IMAGING_STUDY";
  return result.kind !== "LAB_TEST" && result.kind !== "IMAGING_STUDY";
}

export function medicationsByBucket(items: DigitalCareWorkspaceMedication[], bucket: string): DigitalCareWorkspaceMedication[] {
  return items.filter((item) => item.bucket === bucket);
}

export function fillCountTemplate(template: string, shown: number, total: number): string {
  return template.replace("{shown}", String(shown)).replace("{total}", String(total));
}

export const DIGITAL_CARE_MAIN_TABS = [
  "results",
  "messages",
  "medications",
  "discharge",
  "visitSummary",
  "carePlan",
  "activity",
] as const;

export type DigitalCareMainTab = (typeof DIGITAL_CARE_MAIN_TABS)[number];

export function digitalCareVisibleTabs(configuration?: {
  digitalCare?: {
    resultRelease?: boolean;
    secureMessaging?: boolean;
    medicationSharing?: boolean;
    dischargeSharing?: boolean;
    carePlans?: boolean;
  };
} | null): DigitalCareMainTab[] {
  const flags = configuration?.digitalCare;
  return DIGITAL_CARE_MAIN_TABS.filter((tab) => {
    if (!flags) return true;
    if (tab === "results") return flags.resultRelease !== false;
    if (tab === "messages") return flags.secureMessaging !== false;
    if (tab === "medications") return flags.medicationSharing !== false;
    if (tab === "discharge") return flags.dischargeSharing !== false;
    if (tab === "carePlan") return flags.carePlans !== false;
    return true;
  });
}
