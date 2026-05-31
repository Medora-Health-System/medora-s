import { describe, expect, it } from "vitest";
import {
  ED_CANONICAL_WAITING_ROOM_LABEL,
  ED_LEGACY_WAITING_ROOM_LABEL_FR,
  compareRoomLabels,
  isEdWaitingRoomLabel,
  normalizeEdRoomLabelForStorage,
  sortRowsByRoomLabel,
} from "@medora/shared";

describe("encounterRoomDisplay — waiting room localization inputs", () => {
  it("Waiting room and Salle d'attente normalize as waiting/unassigned", () => {
    expect(isEdWaitingRoomLabel("Waiting room")).toBe(true);
    expect(isEdWaitingRoomLabel(ED_LEGACY_WAITING_ROOM_LABEL_FR)).toBe(true);
    expect(isEdWaitingRoomLabel(ED_CANONICAL_WAITING_ROOM_LABEL)).toBe(true);
    expect(normalizeEdRoomLabelForStorage("Waiting room")).toBe(ED_CANONICAL_WAITING_ROOM_LABEL);
    expect(normalizeEdRoomLabelForStorage(ED_LEGACY_WAITING_ROOM_LABEL_FR)).toBe(
      ED_CANONICAL_WAITING_ROOM_LABEL
    );
  });

  it("room sort remains 1, 2, 4, 4A, 4B, 10, waiting last", () => {
    const sorted = sortRowsByRoomLabel([
      { roomLabel: "10" },
      { roomLabel: "4B" },
      { roomLabel: "Waiting room" },
      { roomLabel: "2" },
      { roomLabel: "4" },
      { roomLabel: "4A" },
      { roomLabel: ED_LEGACY_WAITING_ROOM_LABEL_FR },
      { roomLabel: "1" },
    ]).map((r) => r.roomLabel);
    expect(sorted.slice(0, 6)).toEqual(["1", "2", "4", "4A", "4B", "10"]);
    expect(new Set(sorted.slice(6))).toEqual(new Set(["Waiting room", ED_LEGACY_WAITING_ROOM_LABEL_FR]));
    expect(compareRoomLabels("4", "4A")).toBeLessThan(0);
    expect(compareRoomLabels("4A", "4B")).toBeLessThan(0);
    expect(compareRoomLabels("2", "10")).toBeLessThan(0);
  });
});

describe("encounterRoomDisplay — web formatter", () => {
  const t = (key: string) => (key === "encounterRoom.waitingRoom" ? "Waiting room" : key);

  it("English room dropdown label shows Waiting room for canonical value", async () => {
    const { formatEncounterRoomDisplay } = await import("@/lib/encounterRoomDisplay");
    expect(formatEncounterRoomDisplay(ED_CANONICAL_WAITING_ROOM_LABEL, t)).toBe("Waiting room");
    expect(formatEncounterRoomDisplay(ED_LEGACY_WAITING_ROOM_LABEL_FR, t)).toBe("Waiting room");
    expect(formatEncounterRoomDisplay("4", t)).toBe("4");
  });
});
