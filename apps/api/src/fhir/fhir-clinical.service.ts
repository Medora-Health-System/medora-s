import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CarePlanComponentStatus, CarePlanStatus, DiagnosisStatus, OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseFhirReference, parseLogicalId } from "./fhir-protocol";
import { FhirReferenceResolver } from "./fhir-reference.resolver";
import { FhirSearchService, searchBundle } from "./fhir-search";

export type ClinicalResourceType = "Condition" | "ServiceRequest" | "DiagnosticReport" | "CarePlan";
const TYPES = ["LAB_TEST", "IMAGING_STUDY"] as const;

export const DIAGNOSIS_STATUS = {
  ACTIVE: { clinical: "active", verification: "confirmed" },
  RESOLVED: { clinical: "resolved", verification: "confirmed" },
  REMOVED: { clinical: undefined, verification: "entered-in-error" },
} as const satisfies Record<DiagnosisStatus, { clinical: string | undefined; verification: string }>;

export const SERVICE_REQUEST_STATUS = {
  DRAFT: "draft",
  PENDING: "active",
  PLACED: "active",
  SIGNED: "active",
  ACKNOWLEDGED: "active",
  IN_PROGRESS: "active",
  RESULTED: "completed",
  VERIFIED: "completed",
  COMPLETED: "completed",
  CANCELLED: "revoked",
} as const satisfies Record<OrderStatus, string>;

export const CARE_PLAN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  ON_HOLD: "on-hold",
  UNDER_REVIEW: "active",
  COMPLETED: "completed",
  DISCONTINUED: "revoked",
} as const satisfies Record<CarePlanStatus, string>;

export const CARE_PLAN_ACTIVITY_STATUS = {
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  MET: "completed",
  PARTIALLY_MET: "in-progress",
  NOT_MET: "stopped",
  DISCONTINUED: "stopped",
} as const satisfies Record<CarePlanComponentStatus, string>;

export function carePlanActivityStatus(status: string) {
  const mapped = CARE_PLAN_ACTIVITY_STATUS[status as CarePlanComponentStatus];
  if (!mapped) throw new Error("Unmapped CarePlan component status");
  return mapped;
}

export function diagnosticReportStatus(row: { verifiedAt?: Date | null; orderItem: { status: OrderStatus } }) {
  if (!Object.values(OrderStatus).includes(row.orderItem.status)) throw new Error("Unmapped Result status evidence");
  if (row.orderItem.status === OrderStatus.CANCELLED) return "cancelled";
  return row.verifiedAt ? "final" : "preliminary";
}

export function serviceRequestOrderStatuses(fhirStatus: string): OrderStatus[] {
  const statuses = Object.values(OrderStatus).filter((status) => SERVICE_REQUEST_STATUS[status] === fhirStatus);
  if (!statuses.length) throw new BadRequestException("Unsupported status");
  return statuses;
}

export function conditionDiagnosisStatuses(clinicalStatus?: string, verificationStatus?: string): DiagnosisStatus[] | undefined {
  let clinical: DiagnosisStatus[] | undefined;
  if (clinicalStatus) {
    clinical = clinicalStatus === "active" ? [DiagnosisStatus.ACTIVE] : clinicalStatus === "resolved" ? [DiagnosisStatus.RESOLVED] : undefined;
    if (!clinical) throw new BadRequestException("Unsupported clinical-status");
  }
  let verification: DiagnosisStatus[] | undefined;
  if (verificationStatus) {
    verification = verificationStatus === "confirmed"
      ? [DiagnosisStatus.ACTIVE, DiagnosisStatus.RESOLVED]
      : verificationStatus === "entered-in-error"
        ? [DiagnosisStatus.REMOVED]
        : undefined;
    if (!verification) throw new BadRequestException("Unsupported verification-status");
  }
  if (!clinical && !verification) return undefined;
  if (!clinical) return verification;
  if (!verification) return clinical;
  return clinical.filter((status) => verification!.includes(status));
}

@Injectable()
export class FhirClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: FhirSearchService,
    private readonly refs: FhirReferenceResolver,
  ) {}

  async read(type: ClinicalResourceType, facilityId: string, rawId: string) {
    const id = parseLogicalId(rawId);
    const resource = type === "Condition"
      ? await this.condition(facilityId, id)
      : type === "ServiceRequest"
        ? await this.serviceRequest(facilityId, id)
        : type === "DiagnosticReport"
          ? await this.diagnosticReport(facilityId, id)
          : await this.carePlan(facilityId, id);
    if (!resource) throw new NotFoundException(`${type} not found`);
    return resource;
  }

  async find(type: ClinicalResourceType, facilityId: string, query: Record<string, unknown>) {
    const allowed = type === "Condition"
      ? ["_id", "patient", "subject", "encounter", "code", "clinical-status", "verification-status", "recorded-date", "_count", "_cursor"]
      : type === "ServiceRequest"
        ? ["_id", "patient", "subject", "encounter", "code", "status", "authored", "_count", "_cursor"]
        : type === "DiagnosticReport"
          ? ["_id", "patient", "subject", "encounter", "based-on", "status", "date", "_count", "_cursor"]
          : ["_id", "patient", "subject", "encounter", "status", "date", "_count", "_cursor"];
    const parsed = this.search.parse(query, allowed);
    const v = parsed.values;
    const patient = this.reference(v.patient ?? v.subject, "Patient");
    const encounter = this.reference(v.encounter, "Encounter");
    const id = v._id ? parseLogicalId(v._id) : undefined;
    let rows: Array<Record<string, any>>;

    if (type === "Condition") {
      const statuses = conditionDiagnosisStatuses(v["clinical-status"], v["verification-status"]);
      if (statuses && statuses.length === 0) return searchBundle(this.search.baseUrl(), type, query, [], false);
      rows = await this.prisma.diagnosis.findMany({
        where: {
          facilityId,
          ...(id ? { id } : {}),
          ...(patient ? { patientId: patient } : {}),
          ...(encounter ? { encounterId: encounter } : {}),
          ...(v.code ? { code: this.token(v.code) } : {}),
          ...(statuses ? { status: { in: statuses } } : {}),
          ...(v["recorded-date"] ? { createdAt: this.day(v["recorded-date"]) } : {}),
          ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take: parsed.count + 1,
      });
    } else if (type === "ServiceRequest") {
      rows = await this.prisma.orderItem.findMany({
        where: {
          id: id ?? (parsed.cursor ? { gt: parsed.cursor } : undefined),
          catalogItemType: { in: [...TYPES] },
          order: {
            facilityId,
            ...(patient ? { patientId: patient } : {}),
            ...(encounter ? { encounterId: encounter } : {}),
            ...(v.authored ? { createdAt: this.day(v.authored) } : {}),
          },
          ...(v.code ? { OR: [{ catalogItemId: this.token(v.code) }, { manualLabel: v.code }] } : {}),
          ...(v.status ? { status: { in: serviceRequestOrderStatuses(v.status) } } : {}),
        },
        include: { order: true },
        orderBy: { id: "asc" },
        take: parsed.count + 1,
      });
    } else if (type === "DiagnosticReport") {
      const basedOn = this.reference(v["based-on"], "ServiceRequest");
      if (v.status && !["preliminary", "final", "cancelled"].includes(v.status)) throw new BadRequestException("Unsupported status");
      const reportStatus = v.status === "cancelled"
        ? { orderItem: { status: OrderStatus.CANCELLED } }
        : v.status === "final"
          ? { verifiedAt: { not: null }, orderItem: { status: { not: OrderStatus.CANCELLED } } }
          : v.status === "preliminary"
            ? { verifiedAt: null, orderItem: { status: { not: OrderStatus.CANCELLED } } }
            : {};
      rows = await this.prisma.result.findMany({
        where: {
          facilityId,
          ...(id ? { id } : {}),
          ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}),
          ...(v.date ? { createdAt: this.day(v.date) } : {}),
          ...reportStatus,
          orderItem: {
            ...(reportStatus as any).orderItem,
            ...(basedOn ? { id: basedOn } : {}),
            catalogItemType: { in: [...TYPES] },
            order: {
              facilityId,
              ...(patient ? { patientId: patient } : {}),
              ...(encounter ? { encounterId: encounter } : {}),
            },
          },
        },
        include: { orderItem: { include: { order: true } } },
        orderBy: { id: "asc" },
        take: parsed.count + 1,
      });
    } else {
      rows = await this.prisma.encounterCarePlan.findMany({
        where: {
          facilityId,
          ...(id ? { id } : {}),
          ...(patient ? { patientId: patient } : {}),
          ...(encounter ? { encounterId: encounter } : {}),
          ...(v.status ? { status: this.careStatus(v.status) as any } : {}),
          ...(v.date ? { createdAt: this.day(v.date) } : {}),
          ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}),
        },
        include: { components: { orderBy: { sequence: "asc" } } },
        orderBy: { id: "asc" },
        take: parsed.count + 1,
      });
    }

    const page = await Promise.all(rows.slice(0, parsed.count).map((row) => this.map(type, facilityId, row)));
    return searchBundle(this.search.baseUrl(), type, query, page, rows.length > parsed.count);
  }

  private async condition(facilityId: string, id: string) {
    const row = await this.prisma.diagnosis.findFirst({ where: { id, facilityId } });
    return row && this.mapCondition(row);
  }

  private async serviceRequest(facilityId: string, id: string) {
    const row = await this.prisma.orderItem.findFirst({
      where: { id, catalogItemType: { in: [...TYPES] }, order: { facilityId } },
      include: { order: true },
    });
    return row && this.mapRequest(facilityId, row);
  }

  private async diagnosticReport(facilityId: string, id: string) {
    const row = await this.prisma.result.findFirst({
      where: { id, facilityId, orderItem: { catalogItemType: { in: [...TYPES] }, order: { facilityId } } },
      include: { orderItem: { include: { order: true } } },
    });
    return row && this.mapReport(facilityId, row);
  }

  private async carePlan(facilityId: string, id: string) {
    const row = await this.prisma.encounterCarePlan.findFirst({
      where: { id, facilityId },
      include: { components: { orderBy: { sequence: "asc" } } },
    });
    return row && this.mapCarePlan(facilityId, row);
  }

  private map(type: ClinicalResourceType, facilityId: string, row: any) {
    return type === "Condition"
      ? this.mapCondition(row)
      : type === "ServiceRequest"
        ? this.mapRequest(facilityId, row)
        : type === "DiagnosticReport"
          ? this.mapReport(facilityId, row)
          : this.mapCarePlan(facilityId, row);
  }

  private mapCondition(row: any) {
    const mapped = DIAGNOSIS_STATUS[row.status as DiagnosisStatus];
    if (!mapped) throw new Error("Unmapped Diagnosis status");
    return {
      resourceType: "Condition",
      id: row.id,
      clinicalStatus: mapped.clinical ? { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: mapped.clinical }] } : undefined,
      verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: mapped.verification }] },
      code: row.codeSource === "ICD10_CATALOG"
        ? { coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: row.code, display: row.description ?? undefined }] }
        : { text: row.description ?? row.code },
      subject: this.refs.reference("Patient", row.patientId),
      encounter: this.refs.reference("Encounter", row.encounterId),
      onsetDateTime: row.onsetDate?.toISOString(),
      abatementDateTime: row.resolvedDate?.toISOString(),
      recordedDate: row.createdAt.toISOString(),
    };
  }

  private async mapRequest(facilityId: string, row: any) {
    await this.safeCoreRefs(facilityId, row.order);
    const requester = row.order.orderedBy
      ? await this.prisma.userRole.findFirst({
          where: { facilityId, userId: row.order.orderedBy, isActive: true, role: { code: { in: ["RN", "PROVIDER"] } } },
          select: { userId: true },
        })
      : null;
    return {
      resourceType: "ServiceRequest",
      id: row.id,
      status: this.requestStatus(row.status),
      intent: "order",
      priority: ({ ROUTINE: "routine", URGENT: "urgent", STAT: "stat" } as Record<string, string>)[row.order.priority],
      code: row.catalogItemId
        ? { coding: [{ system: "urn:medora:catalog", code: row.catalogItemId }], text: row.manualLabel ?? undefined }
        : { text: row.manualLabel ?? row.manualSecondaryText ?? "Diagnostic service" },
      subject: this.refs.reference("Patient", row.order.patientId),
      encounter: this.refs.reference("Encounter", row.order.encounterId),
      authoredOn: row.order.createdAt.toISOString(),
      requester: requester ? this.refs.reference("Practitioner", requester.userId) : undefined,
      occurrenceDateTime: (row.intendedAdministrationAt ?? row.effectiveCollectedAt ?? row.effectivePerformedAt)?.toISOString(),
    };
  }

  private async mapReport(facilityId: string, row: any) {
    await this.safeCoreRefs(facilityId, row.orderItem.order);
    return {
      resourceType: "DiagnosticReport",
      id: row.id,
      status: this.reportStatus(row),
      category: [{ text: row.orderItem.catalogItemType === "LAB_TEST" ? "Laboratory" : "Imaging" }],
      code: row.orderItem.catalogItemId
        ? { coding: [{ system: "urn:medora:catalog", code: row.orderItem.catalogItemId }], text: row.orderItem.manualLabel ?? undefined }
        : { text: row.orderItem.manualLabel ?? "Diagnostic report" },
      subject: this.refs.reference("Patient", row.orderItem.order.patientId),
      encounter: this.refs.reference("Encounter", row.orderItem.order.encounterId),
      basedOn: [this.refs.reference("ServiceRequest", row.orderItemId)],
      effectiveDateTime: (row.effectiveResultedAt ?? row.effectiveFinalizedAt ?? row.verifiedAt ?? row.createdAt).toISOString(),
      issued: (row.verifiedAt ?? row.createdAt).toISOString(),
      conclusion: row.resultText ?? undefined,
    };
  }

  private async mapCarePlan(facilityId: string, row: any) {
    await this.safeCoreRefs(facilityId, row);
    const status = CARE_PLAN_STATUS[row.status as CarePlanStatus];
    if (!status) throw new Error("Unmapped CarePlan status");
    const practitioner = await this.prisma.userRole.findFirst({
      where: { facilityId, userId: row.activatedByUserId, isActive: true },
      select: { userId: true },
    });
    return {
      resourceType: "CarePlan",
      id: row.id,
      status,
      intent: "plan",
      title: row.title,
      subject: this.refs.reference("Patient", row.patientId),
      encounter: this.refs.reference("Encounter", row.encounterId),
      period: { start: row.activatedAt.toISOString(), end: (row.completedAt ?? row.discontinuedAt)?.toISOString() },
      created: row.createdAt.toISOString(),
      author: practitioner ? this.refs.reference("Practitioner", practitioner.userId) : undefined,
      activity: row.components.map((component: any) => ({ detail: { status: carePlanActivityStatus(component.status), description: component.text } })),
    };
  }

  private async safeCoreRefs(facilityId: string, row: any) {
    await this.refs.assertVisible("Patient", row.patientId, facilityId);
    await this.refs.assertVisible("Encounter", row.encounterId, facilityId);
  }

  private reference(value: string | undefined, type: "Patient" | "Encounter" | "ServiceRequest") {
    return value ? parseFhirReference(value, type).id : undefined;
  }

  private token(value: string) {
    const parts = value.split("|");
    if (parts.length > 2 || !parts.at(-1)) throw new BadRequestException("Malformed token");
    return parts.at(-1)!;
  }

  private day(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException("Malformed date");
    const date = new Date(`${value}T00:00:00.000Z`);
    if (date.toISOString().slice(0, 10) !== value) throw new BadRequestException("Malformed date");
    return { gte: date, lt: new Date(date.getTime() + 86_400_000) };
  }

  private requestStatus(value: string) {
    const status = SERVICE_REQUEST_STATUS[value as OrderStatus];
    if (!status) throw new Error("Unmapped Order status");
    return status;
  }

  private reportStatus(row: any) { return diagnosticReportStatus(row); }

  private careStatus(value: string) {
    const status = ({ draft: "DRAFT", active: "ACTIVE", "on-hold": "ON_HOLD", completed: "COMPLETED", revoked: "DISCONTINUED" } as Record<string, string>)[value];
    if (!status) throw new BadRequestException("Unsupported status");
    return status;
  }
}
