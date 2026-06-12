export const BED_OPERATIONAL_STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "DIRTY",
  "CLEANING",
  "RESERVED",
  "BLOCKED",
  "TRANSFER_PENDING",
  "DISCHARGE_PENDING",
] as const;

export type BedOperationalStatus = (typeof BED_OPERATIONAL_STATUSES)[number];

export const MANUAL_BED_OPERATIONAL_STATUSES = [
  "AVAILABLE",
  "DIRTY",
  "CLEANING",
  "RESERVED",
  "BLOCKED",
] as const;

export type ManualBedOperationalStatus = (typeof MANUAL_BED_OPERATIONAL_STATUSES)[number];

export const DERIVED_BED_OPERATIONAL_STATUSES = [
  "OCCUPIED",
  "TRANSFER_PENDING",
  "DISCHARGE_PENDING",
] as const;

export type DerivedBedOperationalStatus = (typeof DERIVED_BED_OPERATIONAL_STATUSES)[number];

export const BED_STATUS_BLOCKS_ASSIGNMENT_CODE = "BED_STATUS_BLOCKS_ASSIGNMENT" as const;
export const BED_STATUS_UPDATE_EVENT = "BED_STATUS_UPDATE" as const;
export const FACILITY_BED_ENTITY_TYPE = "FACILITY_BED" as const;

export type BedOperationalStatusVisualIntent =
  | "neutral"
  | "occupied"
  | "warning"
  | "danger"
  | "maintenance"
  | "pending";

export type BedOperationalStatusMetadata = {
  labelKey: string;
  clinicalPriority: number;
  visualIntent: BedOperationalStatusVisualIntent;
  assignableByDefault: boolean;
  requiresOverrideForAssignment: boolean;
  manuallyWritable: boolean;
};

const STATUS_METADATA: Record<BedOperationalStatus, BedOperationalStatusMetadata> = {
  AVAILABLE: {
    labelKey: "bedStatus.AVAILABLE",
    clinicalPriority: 80,
    visualIntent: "neutral",
    assignableByDefault: true,
    requiresOverrideForAssignment: false,
    manuallyWritable: true,
  },
  OCCUPIED: {
    labelKey: "bedStatus.OCCUPIED",
    clinicalPriority: 50,
    visualIntent: "occupied",
    assignableByDefault: false,
    requiresOverrideForAssignment: true,
    manuallyWritable: false,
  },
  DIRTY: {
    labelKey: "bedStatus.DIRTY",
    clinicalPriority: 40,
    visualIntent: "warning",
    assignableByDefault: false,
    requiresOverrideForAssignment: true,
    manuallyWritable: true,
  },
  CLEANING: {
    labelKey: "bedStatus.CLEANING",
    clinicalPriority: 35,
    visualIntent: "maintenance",
    assignableByDefault: false,
    requiresOverrideForAssignment: true,
    manuallyWritable: true,
  },
  RESERVED: {
    labelKey: "bedStatus.RESERVED",
    clinicalPriority: 30,
    visualIntent: "warning",
    assignableByDefault: false,
    requiresOverrideForAssignment: true,
    manuallyWritable: true,
  },
  BLOCKED: {
    labelKey: "bedStatus.BLOCKED",
    clinicalPriority: 10,
    visualIntent: "danger",
    assignableByDefault: false,
    requiresOverrideForAssignment: true,
    manuallyWritable: true,
  },
  TRANSFER_PENDING: {
    labelKey: "bedStatus.TRANSFER_PENDING",
    clinicalPriority: 45,
    visualIntent: "pending",
    assignableByDefault: false,
    requiresOverrideForAssignment: true,
    manuallyWritable: false,
  },
  DISCHARGE_PENDING: {
    labelKey: "bedStatus.DISCHARGE_PENDING",
    clinicalPriority: 48,
    visualIntent: "pending",
    assignableByDefault: false,
    requiresOverrideForAssignment: true,
    manuallyWritable: false,
  },
};

/** Lower number = higher precedence on the bed board. */
export const BED_OPERATIONAL_STATUS_PRECEDENCE: readonly BedOperationalStatus[] = [
  "BLOCKED",
  "RESERVED",
  "CLEANING",
  "DIRTY",
  "OCCUPIED",
  "DISCHARGE_PENDING",
  "TRANSFER_PENDING",
  "AVAILABLE",
];

const STATUS_LABELS: Record<BedOperationalStatus, { en: string; fr: string }> = {
  AVAILABLE: { en: "Available", fr: "Disponible" },
  OCCUPIED: { en: "Occupied", fr: "Occupée" },
  DIRTY: { en: "Needs cleaning", fr: "À nettoyer" },
  CLEANING: { en: "Cleaning", fr: "Nettoyage" },
  RESERVED: { en: "Reserved", fr: "Réservée" },
  BLOCKED: { en: "Blocked", fr: "Bloquée" },
  TRANSFER_PENDING: { en: "Transfer pending", fr: "Transfert en attente" },
  DISCHARGE_PENDING: { en: "Discharge pending", fr: "Sortie en attente" },
};

const ED_SIMPLIFIED_CHIP_LABELS: Record<
  BedOperationalStatus,
  { en: string; fr: string }
> = {
  AVAILABLE: { en: "Available", fr: "Disponible" },
  OCCUPIED: { en: "Occupied", fr: "Occupée" },
  DIRTY: { en: "Blocked", fr: "Bloquée" },
  CLEANING: { en: "Blocked", fr: "Bloquée" },
  RESERVED: { en: "Blocked", fr: "Bloquée" },
  BLOCKED: { en: "Blocked", fr: "Bloquée" },
  TRANSFER_PENDING: { en: "Occupied", fr: "Occupée" },
  DISCHARGE_PENDING: { en: "Occupied", fr: "Occupée" },
};

const STATUS_VISUAL: Record<
  BedOperationalStatus,
  { chipTone: string; badgeSoft: string }
> = {
  AVAILABLE: { chipTone: "neutral", badgeSoft: "neutral" },
  OCCUPIED: { chipTone: "info", badgeSoft: "info" },
  DIRTY: { chipTone: "warning", badgeSoft: "warning" },
  CLEANING: { chipTone: "maintenance", badgeSoft: "info" },
  RESERVED: { chipTone: "warning", badgeSoft: "warning" },
  BLOCKED: { chipTone: "danger", badgeSoft: "danger" },
  TRANSFER_PENDING: { chipTone: "pending", badgeSoft: "warning" },
  DISCHARGE_PENDING: { chipTone: "pending", badgeSoft: "warning" },
};

export function normalizeBedOperationalStatus(
  input: unknown
): BedOperationalStatus | null {
  if (typeof input !== "string") return null;
  const token = input.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if ((BED_OPERATIONAL_STATUSES as readonly string[]).includes(token)) {
    return token as BedOperationalStatus;
  }
  return null;
}

export function isManualBedOperationalStatusWritable(
  status: BedOperationalStatus
): status is ManualBedOperationalStatus {
  return STATUS_METADATA[status].manuallyWritable;
}

export function rejectDerivedBedOperationalStatusWrite(
  status: BedOperationalStatus
): boolean {
  return !isManualBedOperationalStatusWritable(status);
}

export function getBedOperationalStatusMetadata(
  status: BedOperationalStatus
): BedOperationalStatusMetadata {
  return STATUS_METADATA[status];
}

export function isBedAssignableWithoutOverride(status: BedOperationalStatus): boolean {
  return STATUS_METADATA[status].assignableByDefault;
}

export function requiresBedAssignmentOverride(status: BedOperationalStatus): boolean {
  return STATUS_METADATA[status].requiresOverrideForAssignment;
}

export function formatBedOperationalStatusLabel(
  status: BedOperationalStatus,
  locale: "en" | "fr"
): string {
  return STATUS_LABELS[status][locale];
}

export function formatEdSimplifiedBedStatusLabel(
  status: BedOperationalStatus,
  locale: "en" | "fr"
): string {
  return ED_SIMPLIFIED_CHIP_LABELS[status][locale];
}

export function getBedOperationalStatusVisual(status: BedOperationalStatus): {
  intent: BedOperationalStatusVisualIntent;
  chipTone: string;
  badgeSoft: string;
} {
  const meta = STATUS_METADATA[status];
  const visual = STATUS_VISUAL[status];
  return {
    intent: meta.visualIntent,
    chipTone: visual.chipTone,
    badgeSoft: visual.badgeSoft,
  };
}

export type BedOperationalOverlayInput = {
  status?: BedOperationalStatus | null;
  cleared?: boolean;
  reasonCode?: string | null;
  reasonText?: string | null;
  updatedAt?: string | null;
};

export type BedOccupantInput = {
  encounterId?: string | null;
  workflowState?: string | null;
  disposition?: string | null;
  transferPending?: boolean;
};

export type ResolvedBedOperationalStatus = {
  status: BedOperationalStatus;
  statusSource: "derived" | "operational";
};

function isOperationalOverlayActive(
  overlay: BedOperationalOverlayInput | null | undefined
): overlay is BedOperationalOverlayInput {
  if (!overlay) return false;
  if (overlay.cleared === true) return false;
  const status = normalizeBedOperationalStatus(overlay.status);
  return (
    status != null &&
    status !== "AVAILABLE" &&
    isManualBedOperationalStatusWritable(status)
  );
}

function deriveOccupantStatus(occupant: BedOccupantInput | null | undefined): BedOperationalStatus | null {
  if (!occupant?.encounterId) return null;
  const workflow = (occupant.workflowState ?? "").trim().toUpperCase();
  if (workflow === "DISCHARGE_READY") return "DISCHARGE_PENDING";
  const disposition = (occupant.disposition ?? "").trim().toLowerCase();
  if (
    occupant.transferPending === true ||
    disposition.includes("transfer") ||
    disposition.includes("transfert")
  ) {
    return "TRANSFER_PENDING";
  }
  return "OCCUPIED";
}

/** Resolve effective bed status from operational overlay + open encounter occupant. */
export function resolveBedOperationalStatus(input: {
  operationalOverlay?: BedOperationalOverlayInput | null;
  occupant?: BedOccupantInput | null;
}): ResolvedBedOperationalStatus {
  const overlayStatus = normalizeBedOperationalStatus(input.operationalOverlay?.status);
  if (
    isOperationalOverlayActive(input.operationalOverlay) &&
    overlayStatus &&
    overlayStatus !== "AVAILABLE"
  ) {
    return { status: overlayStatus, statusSource: "operational" };
  }

  const derived = deriveOccupantStatus(input.occupant);
  if (derived) {
    return { status: derived, statusSource: "derived" };
  }

  return { status: "AVAILABLE", statusSource: "derived" };
}

export function compareBedOperationalStatusPrecedence(
  a: BedOperationalStatus,
  b: BedOperationalStatus
): number {
  return BED_OPERATIONAL_STATUS_PRECEDENCE.indexOf(a) - BED_OPERATIONAL_STATUS_PRECEDENCE.indexOf(b);
}

export function isEdSimplifiedBlockedBedStatus(status: BedOperationalStatus): boolean {
  return ["BLOCKED", "DIRTY", "CLEANING", "RESERVED"].includes(status);
}
