/**
 * Phase 5G hardening — strict PHI-safety contract for ROI audit metadata.
 *
 * Walks every ROI state transition with **all sensitive free-text fields populated**
 * (purpose, denialReason, cancelledReason, recipientName, recipientOrganization)
 * and asserts that audit metadata for every emitted action contains:
 *   - only the expected ids/enums (`roiRequestId`, `facilityId`, `patientId`, optional
 *     `encounterId`, `snapshotId`, `requestType`, `status`, optional `deliveryMethod`)
 *   - never any free-text or identity field that could leak PHI
 *
 * Also verifies that `entityId` / top-level audit input fields stick to ids — never names.
 */

import {
  AuditAction,
  ChartRoiDeliveryMethod,
  ChartRoiRequestStatus,
  ChartRoiRequestType,
} from "@prisma/client";
import { ChartRoiService } from "./chart-roi.service";

type AnyMock = jest.Mock;

const SENSITIVE_TEXT_VALUES = {
  purpose: "Pierre Untel asked for full medical chart MRN-99 dob 1990-01-01",
  recipientName: "Maître Avocat Jean Dupont",
  recipientOrganization: "Cabinet Avocat & Associés",
  denialReason: "Refus — diagnosis disclosed to unauthorised third party",
  cancelledReason: "Patient withdrew authorisation, MRN-99",
  authorizationReference: "AUTH-MRN-99-2026",
};

const FORBIDDEN_TOKENS = [
  "Pierre",
  "Untel",
  "MRN-99",
  "1990-01-01",
  "Avocat Jean Dupont",
  "Cabinet Avocat",
  "diagnosis",
  "Patient withdrew",
  "AUTH-MRN-99-2026",
  "Refus",
  "third party",
];

const ALLOWED_METADATA_KEYS = new Set([
  "roiRequestId",
  "facilityId",
  "patientId",
  "encounterId",
  "snapshotId",
  "requestType",
  "status",
  "deliveryMethod",
  "format",
  "manifestLinked",
]);

function baseRow(over: Record<string, unknown> = {}) {
  return {
    id: "roi-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    encounterId: "enc-1",
    requestedByUserId: "u-req",
    approvedByUserId: null as string | null,
    fulfilledByUserId: null as string | null,
    encounterChartExportId: null as string | null,
    requestType: ChartRoiRequestType.LEGAL,
    status: ChartRoiRequestStatus.DRAFT as ChartRoiRequestStatus,
    recipientName: SENSITIVE_TEXT_VALUES.recipientName,
    recipientOrganization: SENSITIVE_TEXT_VALUES.recipientOrganization,
    deliveryMethod: ChartRoiDeliveryMethod.COURIER as ChartRoiDeliveryMethod | null,
    purpose: SENSITIVE_TEXT_VALUES.purpose,
    authorizationReference: SENSITIVE_TEXT_VALUES.authorizationReference,
    denialReason: null as string | null,
    cancelledReason: null as string | null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    approvedAt: null as Date | null,
    fulfilledAt: null as Date | null,
    cancelledAt: null as Date | null,
    deniedAt: null as Date | null,
    ...over,
  };
}

function makeServiceWithRow(row: ReturnType<typeof baseRow>) {
  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue({ id: row.patientId }) },
    encounter: { findFirst: jest.fn().mockResolvedValue({ id: row.encounterId }) },
    chartRoiRequest: {
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...row, ...data })
      ),
      findFirst: jest.fn().mockResolvedValue(row),
      findMany: jest.fn().mockResolvedValue([row]),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...row, ...data })
      ),
    },
    encounterChartExport: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: "snap-1", encounterId: row.encounterId }),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const chartExport = {
    createSnapshot: jest.fn().mockResolvedValue({ id: "snap-created" }),
    getSnapshot: jest
      .fn()
      .mockResolvedValue({ manifest: { ok: true }, row: { id: "snap-1" }, html: "<x/>" }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new ChartRoiService(prisma as any, audit as any, chartExport as any);
  return { service, prisma, audit, chartExport };
}

function assertEveryAuditCallIsPhiSafe(audit: { log: AnyMock }) {
  expect(audit.log).toHaveBeenCalled();
  for (const call of audit.log.mock.calls) {
    const [action, entityType, input] = call as [
      AuditAction,
      string,
      { metadata?: Record<string, unknown>; entityId?: string }
    ];
    expect(typeof action).toBe("string");
    expect(entityType).toMatch(/^(CHART_ROI_REQUEST|ROI_MONITORING_SUMMARY)$/);

    const metadata = (input?.metadata ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(metadata)) {
      expect(ALLOWED_METADATA_KEYS.has(key)).toBe(true);
    }

    const json = JSON.stringify({ entityId: input?.entityId, metadata });
    for (const forbidden of FORBIDDEN_TOKENS) {
      expect(json).not.toContain(forbidden);
    }
  }
}

describe("ChartRoiService — audit metadata is PHI-safe across the full state machine", () => {
  it("ROI_REQUEST_CREATE never copies purpose / recipient / authorisation text", async () => {
    const row = baseRow();
    const { service, audit } = makeServiceWithRow(row);
    await service.create(
      "fac-1",
      {
        patientId: "pat-1",
        encounterId: "enc-1",
        requestType: ChartRoiRequestType.LEGAL,
        purpose: SENSITIVE_TEXT_VALUES.purpose,
        recipientName: SENSITIVE_TEXT_VALUES.recipientName,
        recipientOrganization: SENSITIVE_TEXT_VALUES.recipientOrganization,
        deliveryMethod: ChartRoiDeliveryMethod.COURIER,
        authorizationReference: SENSITIVE_TEXT_VALUES.authorizationReference,
      },
      "u-admin"
    );
    assertEveryAuditCallIsPhiSafe(audit);
  });

  it("ROI_REQUEST_APPROVE never copies sensitive text", async () => {
    const row = baseRow({ status: ChartRoiRequestStatus.DRAFT });
    const { service, audit } = makeServiceWithRow(row);
    await service.approve("fac-1", "roi-1", "u-admin");
    assertEveryAuditCallIsPhiSafe(audit);
  });

  it("ROI_REQUEST_DENY never copies the denialReason text", async () => {
    const row = baseRow({ status: ChartRoiRequestStatus.DRAFT });
    const { service, audit } = makeServiceWithRow(row);
    await service.deny("fac-1", "roi-1", "u-admin", SENSITIVE_TEXT_VALUES.denialReason);
    assertEveryAuditCallIsPhiSafe(audit);
  });

  it("ROI_REQUEST_CANCEL never copies the cancelledReason text", async () => {
    const row = baseRow({ status: ChartRoiRequestStatus.APPROVED });
    const { service, audit } = makeServiceWithRow(row);
    await service.cancel("fac-1", "roi-1", "u-admin", SENSITIVE_TEXT_VALUES.cancelledReason);
    assertEveryAuditCallIsPhiSafe(audit);
  });

  it("ROI_REQUEST_FULFILL records snapshot id but no recipient / purpose text", async () => {
    const row = baseRow({ status: ChartRoiRequestStatus.APPROVED });
    const { service, audit } = makeServiceWithRow(row);
    await service.fulfill("fac-1", "roi-1", "u-admin", { createSnapshotIfMissing: true });
    assertEveryAuditCallIsPhiSafe(audit);
  });

  it("ROI_EXPORT_VIEW records snapshot id + format only", async () => {
    const row = baseRow({
      status: ChartRoiRequestStatus.FULFILLED,
      encounterChartExportId: "snap-1",
    });
    const { service, audit } = makeServiceWithRow(row);
    await service.getFulfilledSnapshotDocument("fac-1", "roi-1", "html", "u-admin");
    assertEveryAuditCallIsPhiSafe(audit);
  });
});
