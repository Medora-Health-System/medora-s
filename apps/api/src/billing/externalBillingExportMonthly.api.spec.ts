import { BadRequestException } from "@nestjs/common";
import { EncounterStatus } from "@prisma/client";
import { MAX_EXTERNAL_BILLING_MONTHLY_ENCOUNTER_COUNT, parseUtcMonthRange } from "@medora/shared";
import { ExternalBillingExportService } from "./external-billing-export.service";

describe("externalBillingExportMonthly API (MEDUI.BILLING.EXTERNAL_EXPORT.2)", () => {
  function buildService(encounterCount = 2) {
    const encounterIds = Array.from({ length: encounterCount }, (_, i) => `e${i + 1}`);
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue({ id: "f1", name: "Clinic" }) },
      encounter: {
        findMany: jest.fn().mockResolvedValue(encounterIds.map((id) => ({ id }))),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ firstName: "A", lastName: "B", email: "a@b.com" }) },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const billingService = { getEncounterBillingExportRows: jest.fn().mockResolvedValue([]) };
    const svc = new ExternalBillingExportService(prisma as never, audit as never, billingService as never);
    (svc as any).buildEncounterPackage = jest.fn(async (_f: string, encounterId: string) => ({
      json: {
        patient: { patientId: "p1", mrn: "MRN-1" },
        encounter: { encounterId, status: EncounterStatus.CLOSED },
        diagnoses: [{ diagnosisId: "d1" }],
        lineItems: [{ lineId: "l1", medoraCode: "CODE", billingStatus: "candidate_only", clinicalPayload: {} }],
        billingReadiness: { readyForExternalBilling: false },
      },
      csvRows: [
        {
          facility_id: "f1",
          facility_name: "Clinic",
          patient_id: "p1",
          mrn: "MRN-1",
          patient_name: "Patient",
          dob: "",
          sex: "",
          encounter_id: encounterId,
          encounter_number: "ENC-1",
          encounter_type: "OUTPATIENT",
          encounter_status: "CLOSED",
          arrival_at: "",
          closed_at: "",
          primary_provider_name: "",
          primary_provider_title: "",
          primary_diagnosis_code: "",
          primary_diagnosis_description: "",
          line_id: "l1",
          source_type: "ORDER_ITEM",
          category: "LAB",
          medora_code: "CODE",
          display_name: "Test",
          status: "COMPLETED",
          performed_at: "",
          performed_by_name: "",
          performed_by_title: "",
          billing_status: "candidate_only",
          billing_code_default: "",
          coding_instruction: "",
          clinical_summary: "",
          clinical_payload_json: "{}",
        },
      ],
      patient: { patientId: "p1" },
    }));
    return { svc, prisma, audit };
  }

  it("monthly JSON export works and includes certification", async () => {
    const { svc } = buildService();
    const out = await svc.exportMonthlyJson({
      facilityId: "f1",
      month: "2026-06",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(out.exportType).toBe("monthly");
    expect(out.month).toBe("2026-06");
    expect(out.periodStart).toBe("2026-06-01");
    expect(out.periodEnd).toBe("2026-06-30");
    expect(out.certification).toBeDefined();
    expect((out.certification as { status: string }).status).toBe("READY_WITH_WARNINGS");
  });

  it("monthly CSV export works", async () => {
    const { svc } = buildService();
    const { csv, filename } = await svc.exportMonthlyCsv({
      facilityId: "f1",
      month: "2026-06",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(csv).toContain("export_batch_id");
    expect(filename).toContain("monthly-2026-06");
  });

  it("monthly certification endpoint method works", async () => {
    const { svc } = buildService();
    const summary = await svc.getMonthlyExportCertification("f1", "2026-06");
    expect(summary.status).toBe("READY_WITH_WARNINGS");
    expect(summary.encounterCount).toBe(2);
  });

  it("rejects invalid month", async () => {
    const { svc } = buildService();
    await expect(
      svc.exportMonthlyJson({
        facilityId: "f1",
        month: "2026-13",
        userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("month range covers full UTC calendar month", () => {
    const range = parseUtcMonthRange("2026-06");
    expect(range.periodStart).toBe("2026-06-01");
    expect(range.periodEnd).toBe("2026-06-30");
    expect(range.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-06-30T23:59:59.999Z");
  });

  it("facility scoped encounter query", async () => {
    const { svc, prisma } = buildService();
    await svc.exportMonthlyJson({
      facilityId: "f1",
      month: "2026-06",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId: "f1", status: EncounterStatus.CLOSED }),
      })
    );
  });

  it("rejects monthly export over max encounter count", async () => {
    const { svc } = buildService(MAX_EXTERNAL_BILLING_MONTHLY_ENCOUNTER_COUNT + 1);
    await expect(
      svc.exportMonthlyJson({
        facilityId: "f1",
        month: "2026-06",
        userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("internal billing Not Ready does not block monthly export", async () => {
    const { svc } = buildService();
    const out = await svc.exportMonthlyJson({
      facilityId: "f1",
      month: "2026-06",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect((out.certification as { status: string }).status).not.toBe("NOT_READY");
  });

  it("controller exposes monthly routes", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const controller = fs.readFileSync(path.join(__dirname, "billing.controller.ts"), "utf8");
    expect(controller).toContain('@Get("billing/external-export/monthly.json")');
    expect(controller).toContain('@Get("billing/external-export/monthly.csv")');
    expect(controller).toContain('@Get("billing/external-export/monthly/certification")');
  });
});
