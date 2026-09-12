import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuditService } from "../patient-portal-audit.service";

type DiagnosticKind = "LAB_TEST" | "IMAGING_STUDY";

const DIAGNOSTIC_ORDER_SELECT = {
  id: true,
  facilityId: true,
  patientId: true,
  encounterId: true,
  createdAt: true,
  items: {
    select: {
      id: true,
      catalogItemType: true,
      manualLabel: true,
      status: true,
      createdAt: true,
      completedAt: true,
      documentedCollectedAt: true,
      effectiveCollectedAt: true,
      documentedPerformedAt: true,
      effectivePerformedAt: true,
      result: {
        select: {
          id: true,
          resultText: true,
          resultData: true,
          criticalValue: true,
          verifiedAt: true,
          effectiveResultedAt: true,
          effectiveFinalizedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
} as const;

function sanitizeResultData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeResultData);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(source)) {
    // Never ship embedded binary/base64 attachment payloads through the mobile result endpoint.
    if (key === "attachments" || key === "dataBase64") continue;
    out[key] = sanitizeResultData(nested);
  }
  return out;
}

@Injectable()
export class PatientDiagnosticResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PatientPortalAuditService
  ) {}

  private async rows(access: PatientPortalAccessContext) {
    return this.prisma.order.findMany({
      where: {
        facilityId: access.facilityId,
        patientId: access.patientId,
        cancelledAt: null,
      },
      select: DIAGNOSTIC_ORDER_SELECT,
      orderBy: { createdAt: "desc" },
      take: 250,
    });
  }

  private projectItem(
    order: Awaited<ReturnType<PatientDiagnosticResultsService["rows"]>>[number],
    item: Awaited<ReturnType<PatientDiagnosticResultsService["rows"]>>[number]["items"][number],
    kind: DiagnosticKind,
    includeData: boolean
  ) {
    const result = item.result!;
    const clinicalAt =
      kind === "LAB_TEST"
        ? result.effectiveResultedAt ?? result.verifiedAt
        : result.effectiveFinalizedAt ?? result.verifiedAt;
    return {
      id: item.id,
      orderId: order.id,
      encounterId: order.encounterId,
      kind,
      title: item.manualLabel?.trim() || (kind === "LAB_TEST" ? "Laboratory result" : "Imaging result"),
      status: item.status,
      criticalValue: result.criticalValue,
      resultText: result.resultText,
      verifiedAt: result.verifiedAt!.toISOString(),
      clinicalAt: clinicalAt?.toISOString() ?? result.verifiedAt!.toISOString(),
      collectedAt:
        kind === "LAB_TEST"
          ? (item.effectiveCollectedAt ?? item.documentedCollectedAt)?.toISOString() ?? null
          : null,
      performedAt:
        kind === "IMAGING_STUDY"
          ? (item.effectivePerformedAt ?? item.documentedPerformedAt)?.toISOString() ?? null
          : null,
      resultData: includeData ? sanitizeResultData(result.resultData) : undefined,
    };
  }

  async list(
    access: PatientPortalAccessContext,
    kind: DiagnosticKind,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const orders = await this.rows(access);
    const results = orders.flatMap((order) =>
      order.items
        .filter(
          (item) => item.catalogItemType === kind && item.result?.verifiedAt != null
        )
        .map((item) => this.projectItem(order, item, kind, false))
    );

    await this.audit.record(
      kind === "LAB_TEST" ? "PATIENT_PORTAL_LAB_LIST_VIEW" : "PATIENT_PORTAL_IMAGING_LIST_VIEW",
      kind === "LAB_TEST" ? "LAB_RESULT_LIST" : "IMAGING_RESULT_LIST",
      {
        portalAccountId: access.portalAccountId,
        sessionId: access.sessionId,
        facilityId: access.facilityId,
        patientId: access.patientId,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { count: results.length },
      }
    );

    return { results };
  }

  async get(
    access: PatientPortalAccessContext,
    kind: DiagnosticKind,
    orderItemId: string,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const orders = await this.rows(access);
    for (const order of orders) {
      const item = order.items.find(
        (candidate) =>
          candidate.id === orderItemId &&
          candidate.catalogItemType === kind &&
          candidate.result?.verifiedAt != null
      );
      if (!item) continue;

      await this.audit.record(
        kind === "LAB_TEST" ? "PATIENT_PORTAL_LAB_VIEW" : "PATIENT_PORTAL_IMAGING_VIEW",
        kind === "LAB_TEST" ? "LAB_RESULT" : "IMAGING_RESULT",
        {
          portalAccountId: access.portalAccountId,
          sessionId: access.sessionId,
          facilityId: access.facilityId,
          patientId: access.patientId,
          entityId: item.id,
          ip: context.ip,
          userAgent: context.userAgent,
        }
      );
      return this.projectItem(order, item, kind, true);
    }

    // Do not confirm whether an item exists for another patient/facility or is not yet verified.
    throw new NotFoundException("Result not found");
  }
}
