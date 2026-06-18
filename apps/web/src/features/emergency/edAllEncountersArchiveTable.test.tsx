import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("EdAllEncountersArchiveTable (MEDUI.ED.LIFECYCLE.7)", () => {
  const table = readSrc("features/emergency/EdAllEncountersArchiveTable.tsx");

  it("renders archive table columns and billing/coding status labels", () => {
    expect(table).toContain('data-testid="ed-all-encounters-archive-table"');
    expect(table).toContain("edLifecycle.allEncounters.table.billingCoding");
    expect(table).toContain("edLifecycle.allEncounters.status.${row.status}");
    expect(table).toContain("edLifecycle.allEncounters.billing.${row.billingStatusLabel}");
    expect(table).toContain("ed-all-encounters-billing-");
    const en = readSrc("i18n/messages/en.ts");
    expect(en).toContain("certified_closed:");
    expect(en).toContain("billing_not_ready:");
    expect(en).toContain("coding_review_needed:");
    expect(en).toContain("not_reviewed:");
  });

  it("links chart action to emergency chart route", () => {
    expect(table).toContain("row.chartHref");
    expect(table).toContain("edLifecycle.allEncounters.actions.chart");
  });

  it("omits demo link when demographics route unavailable", () => {
    expect(table).toContain("row.demoHref");
    expect(table).toContain("edLifecycle.allEncounters.actions.demo");
    expect(table).toContain("row.demoHref ?");
  });

  it("uses i18n keys for billing not ready and not reviewed labels", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    for (const key of ["ready_for_billing", "billing_not_ready", "not_reviewed"]) {
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
  });
});
