import { describe, expect, it } from "vitest";
import {
  buildPrnDatabaseSourceCountReport,
  detectFirstPrnFutureDuplicationPoint,
  PRN_TRACE_FIXTURES,
  tracePrnPipelineStage,
  tracePrnReactRenderKeys,
  verifyNextEligible,
} from "./marPrnTimelineDataFlowAudit.js";

describe("PRN data-flow trace audit (MEDUI.MAR.PRN_DATA_FLOW_TRACE_AUDIT.1)", () => {
  describe("Phase 1 — database source counts", () => {
    it("reports deterministic fixture counts for acetaminophen and ondansetron", () => {
      const report = buildPrnDatabaseSourceCountReport();
      expect(report).toHaveLength(2);

      const acet = report.find((r) => r.orderItemId === PRN_TRACE_FIXTURES.acetaminophen.orderItemId)!;
      expect(acet).toMatchObject({
        medicationName: "Acetaminophen PO 500 mg",
        administrationCount: 1,
        doseInstanceCount: 3,
        orderEventCount: 0,
        lastAdministeredAt: "2026-06-12T10:29:00.000Z",
        expectedNextEligibleAt: "2026-06-12T16:29:00.000Z",
      });

      const ond = report.find((r) => r.orderItemId === PRN_TRACE_FIXTURES.ondansetron.orderItemId)!;
      expect(ond).toMatchObject({
        medicationName: "Ondansetron IVP 4 mg/2 mL",
        administrationCount: 1,
        doseInstanceCount: 2,
        lastAdministeredAt: "2026-06-12T11:32:00.000Z",
        expectedNextEligibleAt: "2026-06-12T17:32:00.000Z",
      });

      expect(verifyNextEligible(PRN_TRACE_FIXTURES.acetaminophen)).toBe(
        PRN_TRACE_FIXTURES.acetaminophen.expectedNextEligibleAt
      );
      expect(verifyNextEligible(PRN_TRACE_FIXTURES.ondansetron)).toBe(
        PRN_TRACE_FIXTURES.ondansetron.expectedNextEligibleAt
      );
    });
  });

  describe("Phase 2–4 — production path (legacy dose loop renders PRN)", () => {
    it("acetaminophen: first duplication at dose loop — prn-next + orphan DUE dose instances", () => {
      const stage = tracePrnPipelineStage({
        fixture: PRN_TRACE_FIXTURES.acetaminophen,
        skipPrnDoseInstances: false,
      });

      expect(stage.historical).toHaveLength(1);
      expect(stage.historical[0]?.prnProjectionKey).toBe(
        "prn-admin:oi-acetaminophen-prn:mar-acet-1029"
      );
      expect(stage.historical[0]?.columnLabel).toBe("10A");

      expect(stage.availability).toHaveLength(1);
      expect(stage.availability[0]?.prnProjectionKey).toBe(
        "prn-next:oi-acetaminophen-prn:2026-06-12T16:29:00.000Z"
      );
      expect(stage.availability[0]?.columnLabel).toBe("04P");

      expect(stage.doseInstances.length).toBeGreaterThanOrEqual(2);
      const doseColumns = stage.doseInstances.map((c) => c.columnLabel);
      expect(doseColumns).toContain("04P");
      expect(doseColumns).toContain("05P");

      expect(stage.counts.beforeMerge.futureAvailabilityCount).toBe(1);
      expect(stage.counts.beforeMerge.doseInstanceDueCount).toBeGreaterThanOrEqual(2);
      expect(stage.counts.beforeMerge.total).toBeGreaterThanOrEqual(4);
    });

    it("ondansetron: orphan DUE dose instances appear in 05P with same last-given metadata", () => {
      const stage = tracePrnPipelineStage({
        fixture: PRN_TRACE_FIXTURES.ondansetron,
        skipPrnDoseInstances: false,
      });

      expect(stage.historical[0]?.columnLabel).toBe("11A");
      expect(stage.availability[0]?.columnLabel).toBe("05P");
      expect(stage.doseInstances.some((c) => c.columnLabel === "05P")).toBe(true);
      expect(
        stage.doseInstances.every((c) =>
          c.secondaryText?.includes("Last given 11:32 · Next eligible 17:32")
        )
      ).toBe(true);
    });

    it("availability projection creates exactly one prn-next per order item", () => {
      for (const fixture of [PRN_TRACE_FIXTURES.acetaminophen, PRN_TRACE_FIXTURES.ondansetron]) {
        const stage = tracePrnPipelineStage({ fixture, skipPrnDoseInstances: false });
        expect(stage.availability).toHaveLength(1);
        expect(stage.availability[0]?.prnProjectionKey?.startsWith("prn-next:")).toBe(true);
      }
    });
  });

  describe("Phase 5–6 — merge and dedupe", () => {
    it("merge does not add cells (concat-only stage)", () => {
      const stage = tracePrnPipelineStage({
        fixture: PRN_TRACE_FIXTURES.acetaminophen,
        skipPrnDoseInstances: false,
      });
      expect(stage.counts.afterMerge.total).toBe(stage.counts.beforeMerge.total);
    });

    it("dedupe collapses orphan DUE dose instances when prn-next exists (per cell)", () => {
      const stage = tracePrnPipelineStage({
        fixture: PRN_TRACE_FIXTURES.acetaminophen,
        skipPrnDoseInstances: false,
      });
      expect(stage.counts.afterDedupe.futureAvailabilityCount).toBeLessThanOrEqual(1);
      expect(stage.counts.afterDedupe.historicalCount).toBe(1);
    });
  });

  describe("Phase 7–8 — API response and React render", () => {
    it("production path: API carries duplicate future cards before dose skip", () => {
      const stage = tracePrnPipelineStage({
        fixture: PRN_TRACE_FIXTURES.acetaminophen,
        skipPrnDoseInstances: false,
      });
      const futureCards = stage.beforeDedupeFlat.filter(
        (c) => c.doseStatus === "DUE" && c.isPrnBand
      );
      expect(futureCards.length).toBeGreaterThan(1);

      const reactKeys = tracePrnReactRenderKeys(stage.beforeDedupeFlat);
      expect(reactKeys.length).toBe(stage.beforeDedupeFlat.length);
      expect(new Set(reactKeys.map((k) => k.reactKey)).size).toBe(reactKeys.length);
    });

    it("current path (skip PRN dose instances): exactly 1 completed + 1 future per order item", () => {
      for (const fixture of [PRN_TRACE_FIXTURES.acetaminophen, PRN_TRACE_FIXTURES.ondansetron]) {
        const stage = tracePrnPipelineStage({ fixture, skipPrnDoseInstances: true });
        expect(stage.doseInstances).toHaveLength(0);
        expect(stage.counts.afterDedupe.historicalCount).toBe(1);
        expect(stage.counts.afterDedupe.futureAvailabilityCount).toBe(1);
        expect(stage.counts.afterDedupe.total).toBe(2);
      }
    });

    it("React does not fan-out — one button per API cell", () => {
      const stage = tracePrnPipelineStage({
        fixture: PRN_TRACE_FIXTURES.acetaminophen,
        skipPrnDoseInstances: false,
      });
      const rendered = tracePrnReactRenderKeys(stage.beforeDedupeFlat);
      expect(rendered.length).toBe(stage.beforeDedupeFlat.length);
    });
  });

  describe("Phase 9 — first duplication point", () => {
    it("identifies dose loop as first duplication stage under production behavior", () => {
      const report = detectFirstPrnFutureDuplicationPoint({ skipPrnDoseInstances: false });
      expect(report.firstDuplicationStage).toBe("dose loop");
      expect(report.duplicatedOrderItemId).toBe(PRN_TRACE_FIXTURES.acetaminophen.orderItemId);
      expect(report.duplicateCount).toBeGreaterThan(1);
      expect(report.evidence.some((e) => e.includes("prn-next"))).toBe(true);
      expect(report.evidence.some((e) => e.includes("orphan DUE dose"))).toBe(true);
      expect(report.recommendedFixLocation).toContain("mar-shift-timeline.service.ts");
    });

    it("no duplication when PRN dose instances are skipped (current contract)", () => {
      const report = detectFirstPrnFutureDuplicationPoint({ skipPrnDoseInstances: true });
      expect(report.firstDuplicationStage).toBe("none");
      expect(report.duplicateCount).toBe(0);
    });
  });
});
