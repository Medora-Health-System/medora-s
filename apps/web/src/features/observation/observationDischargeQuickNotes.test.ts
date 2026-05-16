import { describe, expect, it } from "vitest";
import {
  appendQuickNoteToField,
  OBSERVATION_DISCHARGE_NURSING_QUICK_NOTES,
  OBSERVATION_DISCHARGE_PROVIDER_QUICK_NOTES,
  type ObservationDischargeQuickNoteDefinition,
} from "./observationDischargeQuickNotes";

function assertChipInsertKeys(n: ObservationDischargeQuickNoteDefinition) {
  expect(n.insertKey.startsWith("observationDischarge.quickNotes.")).toBe(true);
  expect(n.chipLabelKey.startsWith("observationDischarge.chips.")).toBe(true);
}

describe("appendQuickNoteToField", () => {
  it("returns snippet when current empty", () => {
    expect(appendQuickNoteToField("", "  Hello  ")).toBe("Hello");
  });

  it("appends with newline when current has text", () => {
    expect(appendQuickNoteToField("Line A", "Line B")).toBe("Line A\nLine B");
  });

  it("trims trailing whitespace on current before append", () => {
    expect(appendQuickNoteToField("A  \n", "B")).toBe("A\nB");
  });

  it("ignores empty snippet", () => {
    expect(appendQuickNoteToField("A", "   ")).toBe("A");
  });
});

describe("OBSERVATION_DISCHARGE_PROVIDER_QUICK_NOTES", () => {
  it("each provider quick note has insert + chip i18n key prefixes", () => {
    for (const n of OBSERVATION_DISCHARGE_PROVIDER_QUICK_NOTES) {
      assertChipInsertKeys(n);
    }
  });
});

describe("OBSERVATION_DISCHARGE_NURSING_QUICK_NOTES", () => {
  it("each nursing quick note has insert + chip i18n key prefixes", () => {
    for (const n of OBSERVATION_DISCHARGE_NURSING_QUICK_NOTES) {
      assertChipInsertKeys(n);
    }
  });
});
