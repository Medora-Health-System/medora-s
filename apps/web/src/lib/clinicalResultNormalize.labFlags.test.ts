import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseLabObservationLines } from "./clinicalResultNormalize";
import {
  worklistItemAllowsComplete,
  worklistItemAllowsStart,
  worklistItemNeedsAcknowledge,
  resolveWorklistItemWorkflowAction,
} from "./worklistLabRadUi";

describe("parseLabObservationLines — LAB.ED.1 flag accuracy", () => {
  it("does not flag in-range CBC/CMP pasted lines", () => {
    const raw = [
      "Sodium: 140 mmol/L (135 – 145 mmol/L)",
      "Potassium: 4.2 mmol/L (3.5 - 5.0 mmol/L)",
      "Chloride: 102 (98–106)",
      "Glucose: 90 mg/dL (70–99)",
      "WBC: 6,500 /µL (4,000 – 11,000 /µL)",
      "Platelets: 250,000 (150,000–450,000)",
    ].join("\n");

    const { rows } = parseLabObservationLines(raw);
    expect(rows.every((r) => !r.flag)).toBe(true);
  });

  it("flags low and high values from reference ranges", () => {
    const low = parseLabObservationLines("Sodium: 130 (135 – 145)").rows[0];
    const high = parseLabObservationLines("Sodium: 150 (135 – 145)").rows[0];
    expect(low?.flag).toBe("L");
    expect(high?.flag).toBe("H");
  });

  it("does not invent flags when reference is missing", () => {
    const row = parseLabObservationLines("Sodium: 140").rows[0];
    expect(row?.flag).toBeFalsy();
  });

  it("recovers smashed CMP blobs into analyte rows with ranges and units", () => {
    const smashed =
      "Glucose9270–100mg/dL—BUN146–20mg/dL—Creatinine0.90.6–1.2mg/dL—Sodium140135–145mEq/L";
    const { rows } = parseLabObservationLines(smashed);
    expect(rows.map((r) => r.label)).toEqual(["Glucose", "BUN", "Creatinine", "Sodium"]);
    expect(rows[0]).toMatchObject({ value: "92", ref: "70–100", units: "mg/dL" });
    expect(rows[1]).toMatchObject({ value: "14", ref: "6–20", units: "mg/dL" });
    expect(rows[3]).toMatchObject({ value: "140", ref: "135–145", units: "mEq/L" });
  });

  it("keeps explicit C flag over range-based HIGH/LOW", () => {
    const row = parseLabObservationLines("Potassium: 2.2 mmol/L C (3.5–5.0)").rows[0];
    expect(row?.flag).toBe("C");
    expect(row?.units).toBe("mmol/L");
  });
});

describe("worklistLabRadUi — acknowledge workflow visibility", () => {
  it("shows acknowledge for PLACED/PENDING/SIGNED only", () => {
    expect(worklistItemNeedsAcknowledge("PLACED")).toBe(true);
    expect(worklistItemNeedsAcknowledge("PENDING")).toBe(true);
    expect(worklistItemNeedsAcknowledge("SIGNED")).toBe(true);
    expect(worklistItemNeedsAcknowledge("ACKNOWLEDGED")).toBe(false);
    expect(worklistItemNeedsAcknowledge("IN_PROGRESS")).toBe(false);
    expect(worklistItemNeedsAcknowledge("COMPLETED")).toBe(false);
  });

  it("shows start after acknowledgement and complete when in progress", () => {
    expect(worklistItemAllowsStart("ACKNOWLEDGED")).toBe(true);
    expect(worklistItemAllowsStart("PLACED")).toBe(false);
    expect(worklistItemAllowsComplete("IN_PROGRESS")).toBe(true);
    expect(worklistItemAllowsComplete("ACKNOWLEDGED")).toBe(false);
  });

  it("resolves next workflow action consistently", () => {
    expect(resolveWorklistItemWorkflowAction("PLACED")).toBe("acknowledge");
    expect(resolveWorklistItemWorkflowAction("ACKNOWLEDGED")).toBe("start");
    expect(resolveWorklistItemWorkflowAction("IN_PROGRESS")).toBe("complete");
    expect(resolveWorklistItemWorkflowAction("COMPLETED")).toBeNull();
  });
});

describe("DepartmentOrderDetail — LAB.ED.1 acknowledge wiring", () => {
  const detailSource = readFileSync(
    join(import.meta.dirname, "../components/worklists/DepartmentOrderDetail.tsx"),
    "utf8"
  );

  it("calls existing POST /orders/items/:id/acknowledge via shared workflow API", () => {
    expect(detailSource).toContain("postWorklistItemWorkflowAction");
    expect(detailSource).toContain('runWorkflowAction(itemId, "acknowledge")');
    expect(detailSource).toContain("resolveWorklistItemWorkflowAction");
  });

  it("shows acknowledge CTA in workflow hint when receipt is required", () => {
    expect(detailSource).toContain("orderDetail.ackReceive");
    expect(detailSource).toContain("orderDetail.workflowAfterPlace");
  });
});

describe("lab worklist — stable default sort", () => {
  const labPageSource = readFileSync(
    join(import.meta.dirname, "../../app/app/lab-worklist/page.tsx"),
    "utf8"
  );

  it("defaults to OLDEST_FIRST for stable active queue ordering", () => {
    expect(labPageSource).toContain('useState<LabRadWorklistSortMode>("OLDEST_FIRST")');
  });
});
