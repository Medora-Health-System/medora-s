import {
  encounterCareUnitDisplayNameFr,
  extractRoomInputFromStorage,
  formatGovernedRoomDisplay,
  resolveEncounterCareUnit,
  type EncounterCareUnitCode,
} from "@medora/shared";

export type EncounterRoomContext = {
  roomLabel?: string | null;
  type?: string | null;
  admissionSummaryJson?: unknown;
  unitCode?: EncounterCareUnitCode | null;
};

/** Governed room label for dashboards, MAR, and headers (K.10B.10). */
export function formatEncounterGovernedRoomDisplay(
  encounter: EncounterRoomContext,
  t: (key: string) => string
): string {
  return formatGovernedRoomDisplay({
    roomLabel: encounter.roomLabel,
    encounterType: encounter.type,
    admissionSummaryJson: encounter.admissionSummaryJson,
    unitCode: encounter.unitCode ?? undefined,
    emptyLabel: t("roomAssignment.noRoomAssigned"),
    waitingRoomLabel: t("encounterRoom.waitingRoom"),
  }).display;
}

export function resolveEncounterRoomUnit(encounter: EncounterRoomContext): EncounterCareUnitCode | null {
  return resolveEncounterCareUnit({
    encounterType: encounter.type,
    admissionSummaryJson: encounter.admissionSummaryJson,
    unitCode: encounter.unitCode ?? undefined,
  });
}

export function encounterRoomUnitLabel(
  unit: EncounterCareUnitCode | null,
  t: (key: string) => string
): string {
  if (!unit) return t("roomAssignment.unknownUnit");
  const key = `roomAssignment.units.${unit}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return encounterCareUnitDisplayNameFr(unit);
}

export function extractEncounterRoomInput(
  encounter: EncounterRoomContext
): string {
  const unit = resolveEncounterRoomUnit(encounter);
  return extractRoomInputFromStorage(encounter.roomLabel, unit);
}

export function canAssignEncounterRoom(roles: readonly string[]): boolean {
  return roles.some((role) => role === "RN" || role === "ADMIN" || role === "PROVIDER");
}
