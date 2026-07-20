import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ChartCertificationB1Service } from "./chart-certification-b1.service";

describe("ChartCertificationB1Service", () => {
  it("isEnabled defaults false", () => {
    const prev = process.env.ENTERPRISE_CHART_CERTIFICATION_STAGE_B1;
    delete process.env.ENTERPRISE_CHART_CERTIFICATION_STAGE_B1;
    delete process.env.NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B1;
    const svc = new ChartCertificationB1Service({} as never, {} as never);
    expect(svc.isEnabled()).toBe(false);
    if (prev !== undefined) process.env.ENTERPRISE_CHART_CERTIFICATION_STAGE_B1 = prev;
  });

  it("controller route is registered in source", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "encounters.controller.ts"), "utf8");
    expect(src).toContain("encounters/:id/chart-certification");
    expect(src).toContain("getChartCertification");
    expect(src).toContain("chartCertificationB1Service");
    expect(src).toContain("Facility scope violation");
  });

  it("denies certification when encounter is outside facility scope", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const encountersService = {
      getDispositionSafetyReadiness: jest.fn(),
    };
    const svc = new ChartCertificationB1Service(prisma as never, encountersService as never);
    await expect(svc.getChartCertification("fac-a", "enc-other-facility")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "enc-other-facility", facilityId: "fac-a" },
      })
    );
    expect(encountersService.getDispositionSafetyReadiness).not.toHaveBeenCalled();
  });

  it("marks stale encounterVersion as ERROR without READY evaluated readiness", async () => {
    const prisma = {
      encounter: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: "enc-1", version: 5 })
          .mockResolvedValue({
            id: "enc-1",
            facilityId: "fac-a",
            version: 5,
            status: "OPEN",
            workflowState: "IN_TREATMENT",
            type: "EMERGENCY",
            createdAt: new Date("2026-07-01T10:00:00.000Z"),
            dischargedAt: null,
            dischargeStatus: null,
            disposition: null,
            chiefComplaint: "Pain",
            providerDocumentationStatus: "SIGNED",
            providerDocumentationSignedAt: new Date("2026-07-01T11:00:00.000Z"),
            providerDocumentationSignedByUserId: "p1",
            providerNote: "note",
            treatmentPlan: "plan",
            physicianAssignedUserId: "p1",
            nurseAssignedUserId: "n1",
            roomLabel: "1",
            billingFinalizationStatus: "READY_FOR_REVIEW",
            billingReadinessSnapshotJson: { isReady: true },
            dischargeSummaryJson: { dischargeMode: "Domicile", instructions: "x", followUp: "y" },
            admissionSummaryJson: null,
            nursingAssessment: {
              nursingEvalV1: { sections: { assessment: { text: "OK" } } },
              erDispositionExecutionV1: {
                dischargeSortieCompletedAt: "2026-07-01T12:00:00.000Z",
                dischargeSortieCompletedByDisplayName: "RN",
              },
            },
            patient: {
              dob: new Date("1990-01-01"),
              sexAtBirth: "F",
              mrn: "1",
              phone: "1",
              firstName: "A",
              lastName: "B",
            },
            triage: {
              id: "t1",
              triageCompleteAt: new Date("2026-07-01T10:10:00.000Z"),
              esi: 3,
              chiefComplaint: "Pain",
              vitalsJson: { hr: 80 },
              strokeScreen: { done: true },
              sepsisScreen: { done: true },
              updatedAt: new Date("2026-07-01T10:10:00.000Z"),
            },
            _count: { diagnoses: 1, clinicalDocumentationEntries: 0, encounterNotes: 0 },
          }),
      },
      triageVitalsReading: {
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const encountersService = {
      getDispositionSafetyReadiness: jest.fn().mockResolvedValue({
        canClose: true,
        blockers: [],
      }),
    };
    const svc = new ChartCertificationB1Service(prisma as never, encountersService as never);
    const result = await svc.getChartCertification("fac-a", "enc-1", { encounterVersion: 4 });
    expect(result.coverageStatus).toBe("ERROR");
    expect(result.evaluationErrors.some((e) => e.code === "STALE_ENCOUNTER_VERSION")).toBe(true);
    expect(result.evaluatedReadiness.providerReady).toBeNull();
    expect(result.evaluatedReadiness.nursingReady).toBeNull();
    expect(result.authoritativeReadiness.clinicalClosureReady).toBeNull();
    expect(JSON.stringify(result)).not.toContain("note body");
    expect((result as { providerNote?: unknown }).providerNote).toBeUndefined();
  });

  it("does not trust a mismatched facilityId on the loaded encounter", async () => {
    const prisma = {
      encounter: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: "enc-1", version: 1 })
          .mockResolvedValueOnce({
            id: "enc-1",
            facilityId: "fac-b",
            version: 1,
            status: "OPEN",
            workflowState: "IN_TREATMENT",
            type: "EMERGENCY",
            createdAt: new Date(),
            dischargedAt: null,
            dischargeStatus: null,
            disposition: null,
            chiefComplaint: "Pain",
            providerDocumentationStatus: "SIGNED",
            providerDocumentationSignedAt: new Date(),
            providerDocumentationSignedByUserId: "p1",
            providerNote: null,
            treatmentPlan: null,
            physicianAssignedUserId: null,
            nurseAssignedUserId: null,
            roomLabel: null,
            billingFinalizationStatus: null,
            billingReadinessSnapshotJson: null,
            dischargeSummaryJson: null,
            admissionSummaryJson: null,
            nursingAssessment: null,
            patient: null,
            triage: null,
            _count: { diagnoses: 0, clinicalDocumentationEntries: 0, encounterNotes: 0 },
          }),
      },
      triageVitalsReading: { count: jest.fn().mockResolvedValue(0) },
    };
    const svc = new ChartCertificationB1Service(prisma as never, {
      getDispositionSafetyReadiness: jest.fn(),
    } as never);
    await expect(svc.getChartCertification("fac-a", "enc-1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
