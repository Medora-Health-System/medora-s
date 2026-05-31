import {
  ED_CANONICAL_WAITING_ROOM_LABEL,
  ED_LEGACY_WAITING_ROOM_LABEL_FR,
  isEdWaitingRoomLabel,
} from "@medora/shared";

/** Default room value for new encounter forms (canonical storage). */
export const DEFAULT_ENCOUNTER_ROOM_LABEL = ED_CANONICAL_WAITING_ROOM_LABEL;

export const ENCOUNTER_ROOM_OPTIONS: string[] = [
  ED_CANONICAL_WAITING_ROOM_LABEL,
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
];

/** Localized label for room `<select>` options and trackboard display. */
export function formatEncounterRoomDisplay(
  roomLabel: string | null | undefined,
  t: (key: string) => string,
  dash = "—"
): string {
  const trimmed = (roomLabel ?? "").trim();
  if (!trimmed) return dash;
  if (isEdWaitingRoomLabel(trimmed)) return t("encounterRoom.waitingRoom");
  return trimmed;
}

/** Option values for room selects — includes current value when suffixed (e.g. 4A). */
export function buildEncounterRoomSelectOptions(currentRoom?: string | null): string[] {
  const cur = (currentRoom ?? "").trim();
  if (cur && !ENCOUNTER_ROOM_OPTIONS.includes(cur)) {
    return [cur, ...ENCOUNTER_ROOM_OPTIONS];
  }
  return ENCOUNTER_ROOM_OPTIONS;
}

export { ED_CANONICAL_WAITING_ROOM_LABEL, ED_LEGACY_WAITING_ROOM_LABEL_FR };
