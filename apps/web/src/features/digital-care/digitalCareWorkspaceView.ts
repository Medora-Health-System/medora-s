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

/** Encounter state is authoritative over the visual visit type. A CLOSED encounter is
 * discharged even when an older record did not persist dischargedAt. Conversely an
 * observation encounter is only active observation while it is still OPEN. */
export function digitalCareIsDischarged(patient: Pick<DigitalCareRosterPatient, "visitStatus" | "dischargedAt">): boolean {
  return Boolean(patient.dischargedAt) || patient.visitStatus === "CLOSED";
}

export function digitalCareIsActive(patient: Pick<DigitalCareRosterPatient, "visitStatus" | "dischargedAt">): boolean {
  return patient.visitStatus === "OPEN" && !digitalCareIsDischarged(patient);
}

export function digitalCareVisitStatusPresentation(patient: Pick<DigitalCareRosterPatient, "visitType" | "visitStatus" | "dischargedAt">): {
  discharged: boolean;
  observation: boolean;
  tone: "green" | "amber" | "blue" | "slate";
  marker: string;
  statusKey: "digitalCare.status.discharged" | "digitalCare.status.activeVisit";
} {
  const discharged = digitalCareIsDischarged(patient);
  const observation = patient.visitType === "OBSERVATION";
  return {
    discharged,
    observation,
    tone: discharged ? "slate" : observation ? "amber" : patient.visitType === "ED" ? "green" : "blue",
    marker: discharged ? "#94a3b8" : observation ? "#f59e0b" : patient.visitType === "ED" ? "#16a34a" : "#0ea5e9",
    statusKey: discharged ? "digitalCare.status.discharged" : "digitalCare.status.activeVisit",
  };
}

export function countDigitalCareRoster(
  patients: DigitalCareRosterPatient[],
  now = Date.now(),
): Record<DigitalCareRosterFilter, number> {
  return {
    ALL: patients.length,
    RECENT: filterDigitalCareRoster(patients, "RECENT", now).length,
    ACTIVE: filterDigitalCareRoster(patients, "ACTIVE", now).length,
    OBSERVATION: filterDigitalCareRoster(patients, "OBSERVATION", now).length,
    DISCHARGED: filterDigitalCareRoster(patients, "DISCHARGED", now).length,
    UNREAD: filterDigitalCareRoster(patients, "UNREAD", now).length,
  };
}

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
        return digitalCareIsActive(patient);
      case "OBSERVATION":
        return patient.visitType === "OBSERVATION" && digitalCareIsActive(patient);
      case "DISCHARGED":
        return digitalCareIsDischarged(patient);
      case "UNREAD":
        return patient.unreadCount > 0;
      default:
        return true;
    }
  });
}

export type PatientAppAccessKind = "NOT_ACTIVATED" | "PENDING" | "EXPIRED" | "ACTIVE" | "REVOKED";

export type PatientAppAccessSnapshot = {
  accessStatus?: string | null;
  accountStatus?: string | null;
  verifiedAt?: string | null;
  revokedAt?: string | null;
  latestActivation?: { state?: string | null } | null;
};

/** Canonical PatientPortalAccountStatus. Portal auth only accepts ACTIVE. */
const USABLE_PORTAL_ACCOUNT_STATUS = "ACTIVE";

export function mapPatientAppAccessStatus(access: PatientAppAccessSnapshot | null | undefined): PatientAppAccessKind {
  if (!access) return "NOT_ACTIVATED";
  const link = String(access.accessStatus ?? "NOT_LINKED");
  const revoked = Boolean(access.revokedAt) || link === "REVOKED";
  if (revoked) return "REVOKED";
  if (link === "VERIFIED") {
    return access.accountStatus === USABLE_PORTAL_ACCOUNT_STATUS ? "ACTIVE" : "NOT_ACTIVATED";
  }
  const state = String(access.latestActivation?.state ?? "NONE");
  if (state === "EXPIRED") return "EXPIRED";
  if (state === "PENDING") return "PENDING";
  if (state === "REVOKED") return "REVOKED";
  return "NOT_ACTIVATED";
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

export function mapDigitalCareUserError(
  error: unknown,
): "portalInactive" | "patientNotFound" | "messagingUnavailable" | "notAuthorized" | "activationExpired" | "activationUsed" | "portalUnavailable" | "network" | "generic" | "passthrough" {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const status =
    error && typeof error === "object" && "status" in error ? Number((error as { status?: unknown }).status) : 0;
  if (/portal is not active|portail patient n.est pas actif|portal del paciente no está activo|lien portail actif|vínculo de portal activo/i.test(message)) {
    return "portalInactive";
  }
  if (/messaging storage is unavailable|messagerie sécurisée est indisponible|mensajería segura no está disponible/i.test(message)) {
    return "messagingUnavailable";
  }
  if (status === 404 || /patient not found|patient introuvable|paciente no encontrado/i.test(message)) {
    return "patientNotFound";
  }
  if (status === 401 || status === 403 || /not authorized|access denied|forbidden|n.est pas autoris|no autorizad/i.test(message)) {
    return "notAuthorized";
  }
  if (/activation code invalid or expired|activation expired|activation expir/i.test(message)) {
    return "activationExpired";
  }
  if (/already used|déjà utilisé|ya (fue )?usad/i.test(message)) {
    return "activationUsed";
  }
  if (/portal unavailable|portail indisponible|portal no está disponible/i.test(message)) {
    return "portalUnavailable";
  }
  if (status === 0 || /failed to fetch|network|networkerror|econnrefused/i.test(message)) {
    return "network";
  }
  if (status >= 500 || /internal server error|erreur interne du serveur/i.test(message)) return "generic";
  return message.trim() ? "passthrough" : "generic";
}

/** Access/activation failures must not reuse the workspace "Patient not found" banner. */
export function digitalCarePortalAccessMessageKey(error: unknown): string {
  const kind = mapDigitalCareUserError(error);
  if (kind === "notAuthorized") return "digitalCare.error.notAuthorized";
  if (kind === "network") return "digitalCare.error.network";
  if (kind === "portalUnavailable") return "digitalCare.error.portalUnavailable";
  return "digitalCare.appAccess.loadError";
}

export function digitalCarePortalAccessActions(input: {
  canActivate: boolean;
  canRevoke: boolean;
  access: PatientAppAccessSnapshot | null | undefined;
  lookupFailed: boolean;
}): {
  kind: PatientAppAccessKind;
  showStatus: boolean;
  showActivate: boolean;
  showRegenerate: boolean;
  showRevoke: boolean;
} {
  if (input.lookupFailed || !input.access) {
    return {
      kind: "NOT_ACTIVATED",
      showStatus: false,
      showActivate: false,
      showRegenerate: false,
      showRevoke: false,
    };
  }
  const kind = mapPatientAppAccessStatus(input.access);
  const operable = input.canActivate;
  return {
    kind,
    showStatus: true,
    showActivate: operable && kind !== "ACTIVE" && kind !== "PENDING" && kind !== "EXPIRED",
    showRegenerate: operable && (kind === "PENDING" || kind === "EXPIRED"),
    showRevoke: input.canRevoke && (kind === "ACTIVE" || kind === "PENDING"),
  };
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
