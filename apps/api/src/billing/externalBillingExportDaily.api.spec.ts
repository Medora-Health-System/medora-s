import { BadRequestException } from "@nestjs/common";
import { EncounterStatus } from "@prisma/client";
import { ExternalBillingExportService } from "./external-billing-export.service";

describe("externalBillingExportDaily API (MEDUI.BILLING.EXTERNAL_EXPORT.1)", () => {
  function buildService(encounterIds: string[] = ["e1"]) {
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue({ id: "f1", name: "Clinic" }) },
      encounter: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue(encounterIds.map((id) => ({ id }))),
      },
      patient: {},
      diagnosis: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      orderItem: { findMany: jest.fn().mockResolvedValue([]) },
      billingEvent: { findMany: jest.fn().mockResolvedValue([]) },
      medicationDispense: { findMany: jest.fn().mockResolvedValue([]) },
      medicationAdministration: { findMany: jest.fn().mockResolvedValue([]) },
      encounterClinicalEvent: { findMany: jest.fn().mockResolvedValue([]) },
      orderEvent: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findUnique: jest.fn().mockResolvedValue({ firstName: "A", lastName: "B", email: "a@b.com" }) },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const billingService = {
      getEncounterBillingExportRows: jest.fn().mockResolvedValue([]),
    };
    const svc = new ExternalBillingExportService(prisma as never, audit as never, billingService as never);
    (svc as any).buildEncounterPackage = jest.fn(async (_f: string, encounterId: string) => ({
      json: {
        exportMeta: { schemaVersion: "medora_external_billing_v1" },
        patient: { patientId: "p1", mrn: "MRN-1" },
        encounter: { encounterId, encounterNumber: "ENC-1", status: EncounterStatus.CLOSED },
        diagnoses: [{ diagnosisId: "d1" }],
        lineItems: [
          {
            lineId: "line-1",
            medoraCode: "LAB_CBC",
            billingStatus: "candidate_only",
            performedBy: { title: null },
            clinicalPayload: { note: "x" },
          },
        ],
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
          line_id: "line-1",
          source_type: "ORDER_ITEM",
          category: "LAB",
          medora_code: "LAB_CBC",
          display_name: "CBC",
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

  it("daily JSON export works and includes certification", async () => {
    const { svc } = buildService();
    const out = await svc.exportDailyJson({
      facilityId: "f1",
      date: "2026-06-02",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(out.exportType).toBe("daily");
    expect(out.certification).toBeDefined();
    expect((out.certification as { status: string }).status).toBe("READY_WITH_WARNINGS");
    expect(Array.isArray(out.encounters)).toBe(true);
    expect(Array.isArray(out.lines)).toBe(true);
  });

  it("daily CSV export works", async () => {
    const { svc } = buildService();
    const { csv, filename } = await svc.exportDailyCsv({
      facilityId: "f1",
      date: "2026-06-02",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(csv).toContain("export_batch_id");
    expect(csv).toContain("clinical_payload_json");
    expect(filename).toContain("2026-06-02");
  });

  it("rejects invalid date", async () => {
    const { svc } = buildService();
    await expect(
      svc.exportDailyJson({
        facilityId: "f1",
        date: "bad-date",
        userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("closed encounters included via listClosedEncountersForRange", async () => {
    const { svc, prisma } = buildService(["e1", "e2"]);
    await svc.exportDailyJson({
      facilityId: "f1",
      date: "2026-06-02",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: EncounterStatus.CLOSED }),
      })
    );
  });

  it("internal billing Not Ready does not block external export certification", async () => {
    const { svc } = buildService();
    const out = await svc.exportDailyJson({
      facilityId: "f1",
      date: "2026-06-02",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect((out.certification as { status: string }).status).not.toBe("NOT_READY");
  });

  it("controller exposes certified daily and weekly routes", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const controller = fs.readFileSync(path.join(__dirname, "billing.controller.ts"), "utf8");
    expect(controller).toContain('@Get("billing/external-export/daily.json")');
    expect(controller).toContain('@Get("billing/external-export/daily.csv")');
    expect(controller).toContain('@Get("billing/external-export/weekly.json")');
    expect(controller).toContain('@Get("billing/external-export/weekly.csv")');
  });
});
