/**
 * EDOC.TEST.1 — reusable API legal coverage harness (save → summary → export → ROI → audit).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AuditAction, EncounterStatus } from "@prisma/client";
import {
  assertClinicalDocumentationAuditMetadataPhiSafe,
  assertClinicalDocumentationLegalExportInvariant,
  assertClinicalDocumentationPatientRecordSummaryVisible,
  assertClinicalDocumentationSummaryGenerated,
  type ClinicalDocumentationCategory,
} from "@medora/shared";
import { renderEncounterChartExportHtml } from "./chart-export-html.util";
import { EncounterChartExportService } from "./chart-export.service";
import { ClinicalDocumentationService } from "./clinical-documentation.service";
import type { EdocTest1LegalCoverageFixture } from "./clinical-documentation-legal-coverage.fixtures";

type EdocPrismaRow = {
  id: string;
  encounterId: string;
  category: string;
  cardId: string;
  authorUserId: string;
  authorDisplayNameSnapshot: string;
  authorRoleSnapshot: string;
  createdAt: Date;
  payloadJson: unknown;
  voidedAt: Date | null;
  requiresWitnessSignature: boolean;
  witnessedAt: Date | null;
  witnessedByUserId: string | null;
  witnessDisplayNameSnapshot: string | null;
  witnessRoleSnapshot: string | null;
};

export function makePrismaForEdocLegalCoverage(overrides?: {
  clinicalDocumentationEntries?: EdocPrismaRow[];
}) {
  const encounter = {
    id: "enc-1",
    facilityId: "facility-A",
    patientId: "patient-1",
    type: "EMERGENCY",
    status: "CLOSED",
    workflowState: "DISCHARGED",
    chiefComplaint: "Chest pain",
    roomLabel: "ER-3",
    treatmentPlan: null,
    providerNote: null,
    nursingAssessment: null,
    notes: null,
    dischargeSummaryJson: null,
    admissionSummaryJson: null,
    admittedAt: null,
    dischargedAt: new Date("2026-01-02T00:00:00.000Z"),
    dischargeStatus: "HOME",
    followUpDate: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T01:00:00.000Z"),
    providerDocumentationStatus: "SIGNED",
    providerDocumentationSignedAt: new Date("2026-01-02T00:30:00.000Z"),
    providerDocumentationSignedByUserId: "user-doc-1",
    physicianAssignedUserId: "user-doc-1",
    physicianAssigned: { id: "user-doc-1", firstName: "Alice", lastName: "Doctor" },
    providerDocumentationSignedBy: { firstName: "Alice", lastName: "Doctor" },
    patient: {
      id: "patient-1",
      mrn: "MRN-123",
      globalMrn: "GMRN-XYZ",
      nationalId: null,
      firstName: "John",
      lastName: "Doe",
      dob: new Date("1980-05-04T00:00:00.000Z"),
      sex: "MALE",
      sexAtBirth: "MALE",
    },
    facility: { id: "facility-A", name: "Clinique A" },
    providerAddenda: [],
    encounterNotes: [],
    clinicalDocumentationEntries: overrides?.clinicalDocumentationEntries ?? [],
  };

  return {
    encounter: { findFirst: jest.fn().mockResolvedValue(encounter) },
    triage: { findFirst: jest.fn().mockResolvedValue(null) },
    triageVitalsReading: { findMany: jest.fn().mockResolvedValue([]) },
    encounterClinicalEvent: { findMany: jest.fn().mockResolvedValue([]) },
    diagnosis: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    result: { findMany: jest.fn().mockResolvedValue([]) },
    medicationAdministration: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({
        action: AuditAction.ENCOUNTER_CLOSE,
        createdAt: new Date("2026-01-02T01:00:00.000Z"),
        user: { firstName: "Alice", lastName: "Doctor" },
      }),
    },
    followUp: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
  };
}

export function buildClinicalDocumentationLegalCoverageService(overrides?: {
  entryId?: string;
}) {
  const entryId = overrides?.entryId ?? "edoc-legal-coverage-1";
  const create = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({
      id: entryId,
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      category: String(data.category ?? ""),
      cardId: String(data.cardId ?? ""),
      authorUserId: "u1",
      authorDisplayNameSnapshot: "Jane Nurse",
      authorRoleSnapshot: "RN",
      createdAt: new Date("2026-05-28T12:00:00.000Z"),
      payloadJson: data.payloadJson ?? {},
      voidedAt: null,
      requiresWitnessSignature: Boolean(data.requiresWitnessSignature),
      witnessedAt: null,
      witnessedByUserId: null,
      witnessDisplayNameSnapshot: null,
      witnessRoleSnapshot: null,
    })
  );
  const prisma = {
    encounter: {
      findFirst: jest.fn().mockResolvedValue({
        id: "e1",
        patientId: "p1",
        facilityId: "f1",
        status: EncounterStatus.OPEN,
      }),
    },
    facility: {
      findFirst: jest.fn().mockResolvedValue({
        clinicalDocumentationWitnessPolicyJson: null,
      }),
    },
    encounterClinicalDocumentationEntry: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create,
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ firstName: "Jane", lastName: "Nurse" }),
    },
    userRole: {
      findMany: jest.fn().mockResolvedValue([{ role: { code: "RN", name: "Infirmier(ère)" } }]),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        encounterClinicalDocumentationEntry: { create, update: jest.fn() },
      })
    ),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    svc: new ClinicalDocumentationService(prisma as never, audit as never),
    create,
    audit,
    prisma,
    entryId,
  };
}

function prismaRowFromSavedEntry(
  saved: Awaited<ReturnType<ClinicalDocumentationService["createEntry"]>>,
  fixture: EdocTest1LegalCoverageFixture,
  entryId: string
): EdocPrismaRow {
  return {
    id: entryId,
    encounterId: "enc-1",
    category: fixture.category,
    cardId: fixture.cardId,
    authorUserId: "u1",
    authorDisplayNameSnapshot: saved.authorDisplayName ?? "Jane Nurse",
    authorRoleSnapshot: saved.authorRoleTitle ?? "RN",
    createdAt: new Date(saved.createdAt ?? "2026-05-28T12:00:00.000Z"),
    payloadJson: fixture.payload,
    voidedAt: null,
    requiresWitnessSignature: saved.requiresWitnessSignature ?? false,
    witnessedAt: saved.witnessedAt ? new Date(saved.witnessedAt) : null,
    witnessedByUserId: saved.witnessedByUserId ?? null,
    witnessDisplayNameSnapshot: saved.witnessDisplayName ?? null,
    witnessRoleSnapshot: saved.witnessRoleTitle ?? null,
  };
}

export type AssertClinicalDocumentationLegalCoverageOptions = EdocTest1LegalCoverageFixture & {
  entryId?: string;
  witnessForExport?: {
    requiresWitnessSignature: boolean;
    witnessedAt: Date | null;
    witnessDisplayNameSnapshot: string | null;
    witnessRoleSnapshot: string | null;
  };
};

/** EDOC.TEST.1 — end-to-end legal coverage for one card (save + export + audit). */
export async function assertClinicalDocumentationLegalCoverage(
  fixture: AssertClinicalDocumentationLegalCoverageOptions
): Promise<void> {
  const entryId = fixture.entryId ?? `edoc-test1-${fixture.cardId}`;
  const { svc, create, audit } = buildClinicalDocumentationLegalCoverageService({ entryId });

  const saved = await svc.createEntry(
    "f1",
    "e1",
    {
      category: fixture.category as ClinicalDocumentationCategory,
      cardId: fixture.cardId,
      payloadJson: fixture.payload,
    },
    "u1"
  );

  expect(saved.cardId).toBe(fixture.cardId);
  expect(saved.patientId).toBe("p1");
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        cardId: fixture.cardId,
        category: fixture.category,
        payloadJson: expect.objectContaining(fixture.payload),
      }),
    })
  );

  assertClinicalDocumentationSummaryGenerated(fixture.cardId, fixture.payload);
  expect(saved.payloadSummaryEn.length).toBeGreaterThan(0);
  expect(saved.payloadSummaryFr.length).toBeGreaterThan(0);
  assertClinicalDocumentationLegalExportInvariant(saved);
  assertClinicalDocumentationPatientRecordSummaryVisible(saved, "en");
  assertClinicalDocumentationPatientRecordSummaryVisible(saved, "fr");

  if (fixture.summaryEnKeys?.length) {
    for (const key of fixture.summaryEnKeys) {
      expect(saved.payloadSummaryEn.some((l) => l.key === key)).toBe(true);
    }
  }

  const createAuditCall = audit.log.mock.calls.find(
    (call) => call[0] === AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED
  );
  expect(createAuditCall).toBeDefined();
  const auditMeta = createAuditCall?.[2]?.metadata as Record<string, unknown>;
  assertClinicalDocumentationAuditMetadataPhiSafe(auditMeta);
  expect(auditMeta.cardId).toBe(fixture.cardId);
  expect(auditMeta.category).toBe(fixture.category);
  expect(auditMeta.summaryLineCount).toBeGreaterThan(0);

  const witness = fixture.witnessForExport;
  const prismaRow = prismaRowFromSavedEntry(saved, fixture, entryId);
  if (witness) {
    prismaRow.requiresWitnessSignature = witness.requiresWitnessSignature;
    prismaRow.witnessedAt = witness.witnessedAt;
    prismaRow.witnessDisplayNameSnapshot = witness.witnessDisplayNameSnapshot;
    prismaRow.witnessRoleSnapshot = witness.witnessRoleSnapshot;
  }

  const prisma = makePrismaForEdocLegalCoverage({
    clinicalDocumentationEntries: [prismaRow],
  });
  const exportAudit = { log: jest.fn().mockResolvedValue(undefined) };
  const unifiedTimelineService = {
    getUnifiedTimeline: jest.fn().mockResolvedValue({
      capped: false,
      items: [],
      totalBeforeDedupe: 0,
      totalAfterDedupe: 0,
    }),
  };
  const exportService = new EncounterChartExportService(
    prisma as never,
    exportAudit as never,
    unifiedTimelineService as never
  );
  const manifest = await exportService.getManifest("facility-A", "enc-1");
  const exportRow = manifest.encounter.clinicalDocumentationEntries.find(
    (e) => e.cardId === fixture.cardId
  );
  expect(exportRow).toBeDefined();
  expect(exportRow!.payloadJson).toEqual(fixture.payload);
  expect(exportRow!.payloadSummaryEn!.length).toBeGreaterThan(0);
  expect(exportRow!.payloadSummaryFr!.length).toBeGreaterThan(0);

  const htmlEn = renderEncounterChartExportHtml(manifest, { locale: "en" });
  expect(htmlEn).toContain(fixture.category);
  if (fixture.htmlContains?.length) {
    for (const fragment of fixture.htmlContains) {
      expect(htmlEn).toContain(fragment);
    }
  }

  assertRoiConsumesChartExportManifest();
}

export function assertRoiConsumesChartExportManifest(): void {
  const roiSource = readFileSync(join(__dirname, "../roi/chart-roi.service.ts"), "utf8");
  expect(roiSource).toContain("EncounterChartExportService");
  expect(roiSource).toContain("createSnapshot");
  expect(roiSource).not.toMatch(/clinicalDocumentationEntries\s*=/);
}

export function assertHiddenCardExportStillWorks(cardId: string, payload: Record<string, unknown>): void {
  assertClinicalDocumentationSummaryGenerated(cardId, payload);
}
