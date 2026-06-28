import { describe, expect, it } from "vitest";
import {
  buildOrderItemDisplayLabelEn,
  resolveCareOrderItemClinicalDisplay,
  sanitizeOrderItemNotesForDisplay,
} from "../orders/orderItemDisplayLabels.js";
import {
  buildOxygenTherapyManualLabel,
  buildOxygenTherapyOrderNotes,
  containsOxygenTherapyMetadata,
  defaultOxygenTherapyDraft,
  formatOxygenTherapyDisplay,
  OXYGEN_THERAPY_PROCEDURE_CODE,
  parseOxygenTherapyOrderNotes,
  stripOxygenTherapyMetadataFromNotes,
} from "./oxygenTherapyOrderParameters.js";
import { collectProcedureWorkQueueItems } from "./enterpriseProcedureWorkQueue.js";

describe("MEDUI.CARE_PROCEDURES.OXYGEN_DISPLAY_GOVERNANCE.1", () => {
  const statDraft = {
    ...defaultOxygenTherapyDraft(),
    device: "nasal_cannula" as const,
    flowSelection: "2" as const,
    frequencyMode: "stat" as const,
  };

  it("formatOxygenTherapyDisplay returns human-readable title and detail lines", () => {
    const display = formatOxygenTherapyDisplay(statDraft, "en");
    expect(display.title).toBe("Oxygen Therapy — Nasal cannula 2 L/min STAT");
    expect(display.detailLines[0]).toBe("Maintain SpO₂ ≥ 92%");
    expect(display.title).not.toContain("[O2_PARAMS");
    expect(display.detailLines.join(" ")).not.toContain("{");
  });

  it("stores metadata in notes but strips it from clinician display", () => {
    const notes = buildOxygenTherapyOrderNotes(statDraft, "en");
    expect(containsOxygenTherapyMetadata(notes)).toBe(true);
    expect(stripOxygenTherapyMetadataFromNotes(notes)).not.toContain("[O2_PARAMS");
    expect(stripOxygenTherapyMetadataFromNotes(notes)).toContain("Maintain SpO₂ ≥ 92%");
  });

  it("manualLabel snapshot uses formatted title only", () => {
    const label = buildOxygenTherapyManualLabel(statDraft, "en");
    expect(label).toBe("Oxygen Therapy — Nasal cannula 2 L/min STAT");
    expect(label).not.toContain("Oxygen therapy");
    expect(label).not.toContain("{");
  });

  it("open-order display prefers structured oxygen over generic catalog label", () => {
    const notes = buildOxygenTherapyOrderNotes(statDraft, "en");
    const label = buildOrderItemDisplayLabelEn(
      {
        catalogItemType: "CARE",
        enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE,
        manualLabel: buildOxygenTherapyManualLabel(statDraft, "en"),
        notes,
      },
      null,
      null,
      null
    );
    expect(label).toBe("Oxygen Therapy — Nasal cannula 2 L/min STAT");
    expect(label).not.toBe("Oxygen therapy");
  });

  it("resolveCareOrderItemClinicalDisplay exposes target as second line", () => {
    const notes = buildOxygenTherapyOrderNotes(statDraft, "en");
    const display = resolveCareOrderItemClinicalDisplay(
      {
        catalogItemType: "CARE",
        enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE,
        manualLabel: buildOxygenTherapyManualLabel(statDraft, "en"),
        notes,
      },
      "en"
    );
    expect(display?.title).toContain("Nasal cannula 2 L/min STAT");
    expect(display?.detailLines[0]).toBe("Maintain SpO₂ ≥ 92%");
  });

  it("sanitizeOrderItemNotesForDisplay never returns JSON metadata", () => {
    const notes = buildOxygenTherapyOrderNotes(statDraft, "en");
    const cleaned = sanitizeOrderItemNotesForDisplay({
      catalogItemType: "CARE",
      enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE,
      notes,
    });
    expect(cleaned).not.toMatch(/O2_PARAMS|\{|\}/);
    expect(cleaned).toContain("Maintain SpO₂ ≥ 92%");
  });

  it("preserves structured payload for application logic", () => {
    const notes = buildOxygenTherapyOrderNotes(statDraft, "en");
    const parsed = parseOxygenTherapyOrderNotes(notes);
    expect(parsed.params?.device).toBe("nasal_cannula");
    expect(parsed.params?.flowSelection).toBe("2");
    expect(parsed.params?.frequencyMode).toBe("stat");
  });

  it("work queue uses formatted oxygen title", () => {
    const notes = buildOxygenTherapyOrderNotes(statDraft, "en");
    const items = collectProcedureWorkQueueItems([
      {
        id: "o1",
        type: "CARE",
        encounterId: "e1",
        items: [
          {
            id: "oi1",
            enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE,
            manualLabel: buildOxygenTherapyManualLabel(statDraft, "en"),
            notes,
            status: "PENDING",
          },
        ],
      },
    ]);
    expect(items[0]?.displayLabelEn).toBe("Oxygen Therapy — Nasal cannula 2 L/min STAT");
  });
});
