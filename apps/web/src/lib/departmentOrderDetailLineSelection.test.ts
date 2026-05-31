import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isDepartmentOrderLineExpanded,
  resolveSelectedLineId,
} from "./departmentOrderDetailLineSelection";

const items = [{ id: "cbc-id" }, { id: "cmp-id" }];

describe("resolveSelectedLineId", () => {
  it("defaults to the first line when no highlight or prior selection exists", () => {
    expect(resolveSelectedLineId(items, "", null)).toBe("cbc-id");
    expect(resolveSelectedLineId([{ id: "only-id" }], "", null)).toBe("only-id");
  });

  it("prefers a valid ?ligne= highlight over the current selection", () => {
    expect(resolveSelectedLineId(items, "cmp-id", "cbc-id")).toBe("cmp-id");
  });

  it("keeps the current selection when highlight is absent or invalid", () => {
    expect(resolveSelectedLineId(items, "", "cmp-id")).toBe("cmp-id");
    expect(resolveSelectedLineId(items, "missing-id", "cmp-id")).toBe("cmp-id");
  });

  it("falls back to the first line when the current selection is no longer visible", () => {
    expect(resolveSelectedLineId(items, "", "removed-id")).toBe("cbc-id");
  });
});

describe("isDepartmentOrderLineExpanded", () => {
  it("expands only the selected line", () => {
    expect(isDepartmentOrderLineExpanded("cbc-id", "cbc-id")).toBe(true);
    expect(isDepartmentOrderLineExpanded("cmp-id", "cbc-id")).toBe(false);
  });
});

describe("DepartmentOrderDetail — line expansion wiring", () => {
  const detailSource = readFileSync(
    join(import.meta.dirname, "../components/worklists/DepartmentOrderDetail.tsx"),
    "utf8"
  );

  it("tracks selected line state and resolves a default expanded line", () => {
    expect(detailSource).toContain("selectedLineId");
    expect(detailSource).toContain("effectiveSelectedLineId");
    expect(detailSource).toContain("resolveSelectedLineId");
    expect(detailSource).toContain("setSelectedLineId");
  });

  it("passes expanded/onSelect props to LineCard for workflow panel gating", () => {
    expect(detailSource).toContain("expanded={");
    expect(detailSource).toContain("onSelectLine=");
  });

  it("keeps LAB.ED.1 acknowledge workflow inside the expanded body", () => {
    expect(detailSource).toContain("orderDetail.ackReceive");
    expect(detailSource).toContain("orderDetail.stepRequired");
    expect(detailSource).toContain("resolveWorklistItemWorkflowAction");
  });

  it("renders workflow warning and CTAs only when the line is expanded", () => {
    expect(detailSource).toMatch(/expanded\s*\?\s*\(/);
    expect(detailSource).toContain("workflow-result-hint-");
  });

  it("shows acknowledge/start/complete CTAs from shared workflow helpers", () => {
    expect(detailSource).toContain("showAckButton");
    expect(detailSource).toContain("showStartButton");
    expect(detailSource).toContain("showCompleteButton");
    expect(detailSource).toContain("nextWorkflowAction");
  });

  it("keeps result entry inside the expanded workflow panel", () => {
    expect(detailSource).toContain("canResult && !parentOrderCancelled");
    expect(detailSource).toContain("orderDetail.submitAddResultLab");
  });

  it("uses shared workflow resolver and API helper for detail actions", () => {
    expect(detailSource).toContain("resolveWorklistItemWorkflowAction");
    expect(detailSource).toContain("postWorklistItemWorkflowAction");
    expect(detailSource).toContain("runWorkflowAction");
  });
});
