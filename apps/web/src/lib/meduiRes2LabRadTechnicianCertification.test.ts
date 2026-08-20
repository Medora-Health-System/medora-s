/**
 * MEDUI.RES.2 — certification source/wiring tests for Lab + Rad technician dashboards.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  projectEnterpriseOrderOrigin,
  projectTechnicianWorkStatus,
  sortTechnicianWorklistRows,
} from "@medora/shared";
import {
  resolveEnterpriseOrderOriginFromOrder,
} from "./labRadTechnicianWorklistModel";

const root = join(import.meta.dirname, "..");

describe("MEDUI.RES.2 — technician dashboard wiring", () => {
  const labPage = readFileSync(join(root, "../app/app/lab-worklist/page.tsx"), "utf8");
  const radPage = readFileSync(join(root, "../app/app/rad-worklist/page.tsx"), "utf8");
  const dashboard = readFileSync(
    join(root, "components/worklists/LabRadTechnicianWorklistDashboard.tsx"),
    "utf8"
  );
  const model = readFileSync(join(root, "lib/labRadTechnicianWorklistModel.ts"), "utf8");
  const viewer = readFileSync(join(root, "components/clinical/ClinicalResultViewer.tsx"), "utf8");
  const en = readFileSync(join(root, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(root, "i18n/messages/fr.ts"), "utf8");

  it("Laboratory and Radiology pages default through shared dashboard to New Orders", () => {
    expect(labPage).toContain('kind="lab"');
    expect(radPage).toContain('kind="radiology"');
    expect(dashboard).toContain('useState<TechnicianWorkStatus>("NEW")');
  });

  it("Laboratory and Radiology use the same origin helper", () => {
    expect(model).toContain("projectEnterpriseOrderOrigin");
    expect(dashboard).toContain("enterpriseOrderOriginLabelKey");
    expect(dashboard).toContain("formatEnterpriseOrderOriginDisplay");
  });

  it("does not invent a second result engine in the dashboard", () => {
    expect(dashboard).not.toContain("ClinicLabResult");
    expect(dashboard).not.toContain("InpatientLabResult");
    expect(dashboard).not.toContain("DentalLabResult");
  });

  it("ClinicalResultViewer keeps Units column for structured lab rows", () => {
    expect(viewer).toContain("labTableUnits");
    expect(viewer).toContain("anyUnit");
  });

  it("EN/FR keys present for RES.2 chrome", () => {
    for (const src of [en, fr]) {
      expect(src).toContain("labRadTechnicianDashboard:");
      expect(src).toContain("enterpriseOrderOrigin:");
      expect(src).toContain("labTableUnits:");
    }
    expect(fr).toContain("Tableau de bord du laboratoire");
    expect(fr).toContain("Tableau de bord de radiologie");
    expect(fr).toContain("Nouvelles ordonnances");
    expect(fr).toContain("Commencer le traitement");
    expect(fr).toContain("Commencer l’examen");
    expect(fr).toContain("Emplacement inconnu");
  });
});

describe("MEDUI.RES.2 — origin + sort certification helpers", () => {
  it("projects ED / Inpatient / Clinic / Dental / Unknown without guessing", () => {
    expect(projectEnterpriseOrderOrigin({ type: "EMERGENCY" }).origin).toBe("ED");
    expect(projectEnterpriseOrderOrigin({ type: "INPATIENT" }).origin).toBe("INPATIENT");
    expect(projectEnterpriseOrderOrigin({ type: "OUTPATIENT" }).origin).toBe("CLINIC");
    expect(
      projectEnterpriseOrderOrigin({ type: "OUTPATIENT", serviceLine: "DENTAL" }).origin
    ).toBe("DENTAL");
    expect(projectEnterpriseOrderOrigin({ type: null }).origin).toBe("UNKNOWN");
  });

  it("client resolver prefers API enterpriseOrderOrigin annotation", () => {
    const fromApi = resolveEnterpriseOrderOriginFromOrder({
      enterpriseOrderOrigin: "DENTAL",
      enterpriseOrderLocationLabel: "Dental Clinic",
      encounter: { type: "EMERGENCY" },
    });
    expect(fromApi.origin).toBe("DENTAL");
    expect(fromApi.locationLabel).toBe("Dental Clinic");
  });

  it("cancelled is separated from completed in technician projection", () => {
    expect(projectTechnicianWorkStatus({ itemStatus: "CANCELLED" })).toBe("CANCELLED");
    expect(projectTechnicianWorkStatus({ itemStatus: "COMPLETED" })).toBe("COMPLETED");
  });

  it("active queue sorts newest after priority", () => {
    const sorted = sortTechnicianWorklistRows(
      [
        {
          workStatus: "NEW",
          priority: "ROUTINE",
          orderedAt: "2026-08-20T20:00:00.000Z",
          itemId: "routine-new",
        },
        {
          workStatus: "NEW",
          priority: "STAT",
          orderedAt: "2026-08-01T20:00:00.000Z",
          itemId: "stat-old",
        },
        {
          workStatus: "NEW",
          priority: "STAT",
          orderedAt: "2026-08-20T21:00:00.000Z",
          itemId: "stat-new",
        },
      ],
      "PRIORITY_NEWEST"
    );
    expect(sorted.map((r) => r.itemId)).toEqual(["stat-new", "stat-old", "routine-new"]);
  });
});
