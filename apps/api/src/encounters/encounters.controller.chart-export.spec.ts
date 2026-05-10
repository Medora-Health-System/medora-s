/**
 * Phase 5E hardening — controller-level coverage for the chart-export route.
 *
 * Exercises `EncountersController.getChartExport` directly (no Nest TestingModule,
 * no HTTP runtime, no DB) by injecting mocked services. This catches:
 *  - JSON default + manifest pass-through
 *  - HTML branch sets `Content-Type: text/html; charset=utf-8` and returns the
 *    rendered document (status 200 implied by absence of thrown exception)
 *  - Live preview banner rendering propagates from the manifest
 *  - Invalid `format` returns 400 (BadRequestException)
 *  - Missing facility context returns 400
 *  - Cross-facility / missing encounter propagates 404 (NotFoundException)
 *  - RBAC metadata is exactly `[PROVIDER, ADMIN]` (Roles guard contract)
 *  - PHI-safe audit metadata invariants are forwarded by the service call
 */

import "reflect-metadata";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { EncountersController } from "./encounters.controller";
import {
  ChartExportManifest,
  ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
} from "./chart-export.service";

function fakeManifest(overrides: Partial<ChartExportManifest> = {}): ChartExportManifest {
  const base: ChartExportManifest = {
    manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
    generatedAt: "2026-01-01T12:00:00.000Z",
    livePreview: false,
    caps: {
      clinicalTimeline: 100,
      auditTimeline: 200,
      diagnoses: 200,
      followUps: 100,
    },
    facility: { id: "fac-1", name: "Clinique Test" },
    encounter: {
      id: "enc-1",
      type: "EMERGENCY",
      status: "CLOSED",
      workflowState: "DISCHARGED",
      visitReason: null,
      chiefComplaint: null,
      roomLabel: null,
      physicianAssigned: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T01:00:00.000Z",
      admittedAt: null,
      dischargedAt: null,
      dischargeStatus: null,
      closedByDisplayFr: null,
      closedAt: null,
      nursingAssessment: null,
      dischargeSummaryJson: null,
      admissionSummaryJson: null,
      treatmentPlan: null,
      clinicianImpression: null,
      providerNote: null,
      providerDocumentation: { status: "SIGNED", signedAt: null, signedByDisplayFr: null },
      providerAddenda: [],
    },
    patient: {
      id: "pat-1",
      mrn: "MRN-1",
      globalMrn: "GMRN-1",
      nationalId: null,
      firstName: "Anon",
      lastName: "Patient",
      dob: null,
      sex: "FEMALE",
      sexAtBirth: null,
    },
    triage: null,
    vitalsHistory: { entries: [] },
    diagnoses: { items: [], total: 0 },
    documentationHistory: { entries: [] },
    orders: [],
    results: [],
    medicationAdministrations: [],
    procedures: { entries: [] },
    ivAccess: { entries: [] },
    clinicalTimeline: { items: [], capped: false },
    auditTimelineSummary: { items: [], capped: false },
    followUps: { items: [] },
    deferredDomains: [{ domain: "pathways", reason: "deferred_to_phase_5f" }],
  };
  return { ...base, ...overrides };
}

function makeController(getManifestImpl?: jest.Mock) {
  const getManifest = getManifestImpl ?? jest.fn().mockResolvedValue(fakeManifest());
  const chartExportService = { getManifest } as unknown as {
    getManifest: jest.Mock;
  };
  const encountersService = {} as never;
  const diagnosesService = {} as never;
  const controller = new EncountersController(
    encountersService,
    diagnosesService,
    chartExportService as never
  );
  return { controller, chartExportService };
}

function makeReqRes(opts: {
  facilityId?: string | null;
  userId?: string;
} = {}) {
  const headers: Record<string, string> = {};
  if (opts.facilityId) headers["x-facility-id"] = opts.facilityId;
  const req = {
    user: opts.userId ? { userId: opts.userId } : undefined,
    headers,
    ip: "127.0.0.1",
  };
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as import("express").Response;
  return { req, res, setHeader, headers };
}

describe("EncountersController.getChartExport", () => {
  it("declares RBAC metadata exactly [PROVIDER, ADMIN]", () => {
    const handler = (EncountersController.prototype as unknown as Record<string, unknown>)[
      "getChartExport"
    ];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toEqual([RoleCode.PROVIDER, RoleCode.ADMIN]);
  });

  it("returns the JSON manifest when format is omitted (default) and never sets text/html", async () => {
    const manifest = fakeManifest();
    const { controller, chartExportService } = makeController(jest.fn().mockResolvedValue(manifest));
    const { req, res, setHeader } = makeReqRes({ facilityId: "fac-1", userId: "u-1" });

    const out = await controller.getChartExport("enc-1", undefined, req, res);

    expect(out).toBe(manifest);
    expect(setHeader).not.toHaveBeenCalled();
    expect(chartExportService.getManifest).toHaveBeenCalledWith(
      "fac-1",
      "enc-1",
      "u-1",
      "127.0.0.1",
      undefined,
      { exportFormat: "json" }
    );
  });

  it("returns the JSON manifest when ?format=json is explicit", async () => {
    const manifest = fakeManifest();
    const { controller, chartExportService } = makeController(jest.fn().mockResolvedValue(manifest));
    const { req, res, setHeader } = makeReqRes({ facilityId: "fac-1", userId: "u-1" });

    const out = await controller.getChartExport("enc-1", "json", req, res);

    expect(out).toBe(manifest);
    expect(setHeader).not.toHaveBeenCalled();
    expect(chartExportService.getManifest).toHaveBeenLastCalledWith(
      "fac-1",
      "enc-1",
      "u-1",
      "127.0.0.1",
      undefined,
      { exportFormat: "json" }
    );
  });

  it("returns rendered HTML and sets text/html when ?format=html", async () => {
    const manifest = fakeManifest({ livePreview: false });
    const { controller, chartExportService } = makeController(jest.fn().mockResolvedValue(manifest));
    const { req, res, setHeader } = makeReqRes({ facilityId: "fac-1", userId: "u-1" });

    const out = await controller.getChartExport("enc-1", "html", req, res);

    expect(typeof out).toBe("string");
    const html = out as string;
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(setHeader).toHaveBeenCalledWith("Content-Type", "text/html; charset=utf-8");
    expect(chartExportService.getManifest).toHaveBeenLastCalledWith(
      "fac-1",
      "enc-1",
      "u-1",
      "127.0.0.1",
      undefined,
      { exportFormat: "html" }
    );
  });

  it("HTML response shows live-preview banner when livePreview=true", async () => {
    const manifest = fakeManifest({ livePreview: true });
    const { controller } = makeController(jest.fn().mockResolvedValue(manifest));
    const { req, res } = makeReqRes({ facilityId: "fac-1", userId: "u-1" });

    const html = (await controller.getChartExport("enc-1", "html", req, res)) as string;

    expect(html).toContain("Live preview — not a finalized legal record export");
    expect(html).not.toContain("Generated encounter chart export");
  });

  it("HTML response shows generated-export banner when livePreview=false", async () => {
    const manifest = fakeManifest({ livePreview: false });
    const { controller } = makeController(jest.fn().mockResolvedValue(manifest));
    const { req, res } = makeReqRes({ facilityId: "fac-1", userId: "u-1" });

    const html = (await controller.getChartExport("enc-1", "html", req, res)) as string;

    expect(html).toContain("Generated encounter chart export");
    expect(html).toContain("not an immutable legal snapshot");
    expect(html).not.toContain("Live preview — not a finalized legal record export");
  });

  it("rejects unsupported ?format with 400 BadRequestException (no service call)", async () => {
    const { controller, chartExportService } = makeController();
    const { req, res } = makeReqRes({ facilityId: "fac-1", userId: "u-1" });

    await expect(controller.getChartExport("enc-1", "pdf", req, res)).rejects.toBeInstanceOf(
      BadRequestException
    );
    await expect(controller.getChartExport("enc-1", "xml", req, res)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(chartExportService.getManifest).not.toHaveBeenCalled();
  });

  it("returns 400 when no facility context is provided", async () => {
    const { controller, chartExportService } = makeController();
    const { req, res } = makeReqRes({ facilityId: null, userId: "u-1" });

    await expect(controller.getChartExport("enc-1", "html", req, res)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(chartExportService.getManifest).not.toHaveBeenCalled();
  });

  it("propagates 404 (NotFoundException) for cross-facility / missing encounter", async () => {
    const { controller } = makeController(
      jest.fn().mockRejectedValue(new NotFoundException("Encounter not found"))
    );
    const { req, res } = makeReqRes({ facilityId: "fac-WRONG", userId: "u-1" });

    await expect(controller.getChartExport("enc-1", "html", req, res)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("normalises mixed-case and surrounding whitespace in ?format", async () => {
    const manifest = fakeManifest();
    const { controller, chartExportService } = makeController(jest.fn().mockResolvedValue(manifest));
    const { req, res, setHeader } = makeReqRes({ facilityId: "fac-1", userId: "u-1" });

    await controller.getChartExport("enc-1", "  HTML  ", req, res);
    expect(setHeader).toHaveBeenCalledWith("Content-Type", "text/html; charset=utf-8");
    expect(chartExportService.getManifest).toHaveBeenLastCalledWith(
      "fac-1",
      "enc-1",
      "u-1",
      "127.0.0.1",
      undefined,
      { exportFormat: "html" }
    );
  });
});
