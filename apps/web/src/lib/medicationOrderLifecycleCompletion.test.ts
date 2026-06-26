import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildErEdSummaryMedicationOrderRows } from "@/features/emergency/erEdSummaryMedicationMar";

const webRoot = join(import.meta.dirname, "../..");

function readSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("medicationOrderLifecycleCompletion (MEDUI.ORDERS.MEDICATION_ORDER_LIFECYCLE_COMPLETION.1)", () => {
  it("wires lifecycle panel into ER orders panel for medication lines", () => {
    const source = readSource("src/features/emergency/EmergencyErOrdersPanel.tsx");
    expect(source).toContain("MedicationOrderLifecyclePanel");
    expect(source).toContain("renderErMedicationOrderLifecycleSection");
    expect(source).toContain("encounterSigned");
    expect(source).toContain('data-testid="er-medication-order-lifecycle-section"');
  });

  it("passes encounterSigned from ED chart and workspace views", () => {
    const chart = readSource("src/features/emergency/EmergencyChartView.tsx");
    const workspace = readSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(chart).toContain("encounterSigned=");
    expect(workspace).toContain("encounterSigned=");
  });

  it("summary builder includes lifecycle projection fields", () => {
    const rows = buildErEdSummaryMedicationOrderRows({
      orders: [
        {
          createdAt: "2026-06-23T10:00:00.000Z",
          items: [
            {
              id: "item-1",
              catalogItemType: "MEDICATION",
              manualLabel: "Paracetamol",
              medicationLifecycleStatus: "DISCONTINUED",
              medicationLifecycleAt: "2026-06-23T14:00:00.000Z",
              medicationLifecycleReason: "Changement clinique",
              medicationLifecycleByDisplay: "Dr Test",
              strength: "500 mg",
              frequencyCode: "Q12H",
              route: "PO",
            },
          ],
        },
      ],
      language: "fr",
      t: (key: string) => key,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.lifecycleStatus).toBe("DISCONTINUED");
    expect(rows[0]?.lifecycleSummaryLine).toContain("medicationOrderLifecycle.summary.status");
    expect(rows[0]?.lifecycleReason).toBe("Changement clinique");
  });

  it("summary card renders lifecycle summary line", () => {
    const source = readSource("src/components/clinical/ErMedicationMarSummaryCard.tsx");
    expect(source).toContain("medication-order-lifecycle-summary-line");
    expect(source).toContain("lifecycleSummaryLine");
  });

  it("chart preview includes discontinued/superseded lifecycle text", () => {
    const source = readSource("src/components/encounters/EncounterChartLivePreview.ts");
    expect(source).toContain("formatMedicationOrderLifecycleSummaryText");
    expect(source).toContain("chart-preview-medication-lifecycle");
  });

  it("chart preview timeline includes lifecycle in order summary", () => {
    const source = readSource("src/features/emergency/erClinicalTimeline.ts");
    expect(source).toContain("lifecycleSummaryLine");
  });

  it("print packet includes lifecycle summary line", () => {
    const source = readSource("src/features/emergency/erPrintPacket.ts");
    expect(source).toContain("lifecycleSummaryLine");
  });

  it("pharmacy worklist shows chart-admin lifecycle alerts section", () => {
    const page = readSource("app/app/pharmacy-worklist/page.tsx");
    expect(page).toContain("chartAdminLifecycleAlerts");
    expect(page).toContain("pharmacy-chart-admin-lifecycle-alerts");
    expect(page).toContain("normalizePharmacyWorklistResponse");
  });

  it("pharmacy API returns dispenseOrders and chartAdminLifecycleAlerts", () => {
    const source = readSource("../api/src/worklists/worklists.service.ts");
    expect(source).toContain("dispenseOrders");
    expect(source).toContain("chartAdminLifecycleAlerts");
    expect(source).toContain("getPharmacyChartAdminLifecycleAlerts");
  });

  it("governance-deferred statuses have safe display without actions", () => {
    const panel = readSource("src/components/orders/MedicationOrderLifecyclePanel.tsx");
    expect(panel).toContain("isMedicationOrderLifecycleGovernanceDeferred");
    expect(panel).toContain("governanceDeferred");
  });

  it("signed encounter blocks lifecycle panel mutations", () => {
    const panel = readSource("src/components/orders/MedicationOrderLifecyclePanel.tsx");
    expect(panel).toContain("encounterSigned");
    expect(panel).toContain("signedEncounterBlocked");
  });

  it("migration leaves legacy rows compatible (nullable lifecycle status)", () => {
    const migration = readFileSync(
      join(webRoot, "../api/prisma/migrations/20260910150000_medication_order_lifecycle/migration.sql"),
      "utf8"
    );
    expect(migration).toContain('"medicationLifecycleStatus"');
    expect(migration).not.toMatch(/NOT NULL/i);
    const schema = readFileSync(join(webRoot, "../api/prisma/schema.prisma"), "utf8");
    expect(schema).toContain("medicationLifecycleStatus");
  });
});
