import { describe, expect, it } from "vitest";
import {
  CHART_CERTIFICATION_ROOT_CODES,
  chartCertificationDedupeKey,
  mergeChartCertificationDeficiencyFlags,
} from "./chartCertificationDedupe.js";

describe("chartCertificationDedupe", () => {
  it("collapses provider unsigned aliases to one root key", () => {
    expect(chartCertificationDedupeKey({ id: "provider:unsigned" })).toBe(
      CHART_CERTIFICATION_ROOT_CODES.PROVIDER_NOTE_UNSIGNED
    );
    expect(
      chartCertificationDedupeKey({ id: "disposition:PROVIDER_DOCUMENTATION_UNSIGNED" })
    ).toBe(CHART_CERTIFICATION_ROOT_CODES.PROVIDER_NOTE_UNSIGNED);
  });

  it("collapses open-order aliases", () => {
    expect(chartCertificationDedupeKey({ id: "orders:open" })).toBe(
      CHART_CERTIFICATION_ROOT_CODES.ACTIVE_ORDERS_UNRESOLVED
    );
  });

  it("keeps open order and unreviewed result as distinct keys", () => {
    expect(chartCertificationDedupeKey({ id: "orders:open" })).not.toBe(
      chartCertificationDedupeKey({ id: "results:critical-unacked" })
    );
  });

  it("keeps billing and clinical documentation as distinct keys", () => {
    expect(chartCertificationDedupeKey({ id: "billing:not-ready" })).not.toBe(
      chartCertificationDedupeKey({ id: "provider:unsigned" })
    );
  });

  it("entity-scoped keys remain distinct for two unsigned documents", () => {
    expect(
      chartCertificationDedupeKey({
        id: "provider:unsigned",
        sourceEntityId: "note-a",
      })
    ).not.toBe(
      chartCertificationDedupeKey({
        id: "provider:unsigned",
        sourceEntityId: "note-b",
      })
    );
  });

  it("merge prefers established authority and preserves advisory suggestions", () => {
    const merged = mergeChartCertificationDeficiencyFlags(
      {
        blockingClosure: false,
        blockingBilling: false,
        severity: "WARNING",
        sourceAuthority: "STAGE_A_ADVISORY",
        suggestsClosureReview: true,
      },
      {
        blockingClosure: true,
        blockingBilling: true,
        severity: "BLOCKER",
        sourceAuthority: "ESTABLISHED_WORKFLOW",
        suggestsClosureReview: true,
        suggestsBillingReview: true,
      }
    );
    expect(merged.sourceAuthority).toBe("ESTABLISHED_WORKFLOW");
    expect(merged.blockingClosure).toBe(true);
    expect(merged.suggestsClosureReview).toBe(true);
  });
});
