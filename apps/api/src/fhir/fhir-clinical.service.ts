import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FhirReferenceResolver } from "./fhir-reference.resolver";
import { FhirSearchService, searchBundle } from "./fhir-search";
import { parseFhirReference, parseLogicalId } from "./fhir-protocol";
import { CarePlanComponentStatus, CarePlanStatus, DiagnosisStatus, OrderStatus } from "@prisma/client";

export type ClinicalResourceType = "Condition" | "ServiceRequest" | "DiagnosticReport" | "CarePlan";
const TYPES = ["LAB_TEST", "IMAGING_STUDY"];
export const DIAGNOSIS_STATUS = { ACTIVE: { clinical: "active", verification: "confirmed" }, RESOLVED: { clinical: "resolved", verification: "confirmed" }, REMOVED: { clinical: undefined, verification: "entered-in-error" } } as const satisfies Record<DiagnosisStatus, { clinical: string | undefined; verification: string }>;
export const SERVICE_REQUEST_STATUS = { DRAFT: "draft", PENDING: "active", PLACED: "active", SIGNED: "active", ACKNOWLEDGED: "active", IN_PROGRESS: "active", RESULTED: "completed", VERIFIED: "completed", COMPLETED: "completed", CANCELLED: "revoked" } as const satisfies Record<OrderStatus, string>;
export const CARE_PLAN_STATUS = { DRAFT: "draft", ACTIVE: "active", ON_HOLD: "on-hold", UNDER_REVIEW: "active", COMPLETED: "completed", DISCONTINUED: "revoked" } as const satisfies Record<CarePlanStatus, string>;
export const CARE_PLAN_ACTIVITY_STATUS = { NOT_STARTED: "not-started", IN_PROGRESS: "in-progress", MET: "completed", PARTIALLY_MET: "in-progress", NOT_MET: "stopped", DISCONTINUED: "stopped" } as const satisfies Record<CarePlanComponentStatus, string>;
export function carePlanActivityStatus(status: string) { const mapped = CARE_PLAN_ACTIVITY_STATUS[status as CarePlanComponentStatus]; if (!mapped) throw new Error("Unmapped CarePlan component status"); return mapped; }
export function diagnosticReportStatus(row: { verifiedAt?: Date | null; orderItem: { status: OrderStatus } }) { if (!Object.values(OrderStatus).includes(row.orderItem.status)) throw new Error("Unmapped Result status evidence"); if (row.orderItem.status === OrderStatus.CANCELLED) return "cancelled"; return row.verifiedAt ? "final" : "preliminary"; }

@Injectable()
export class FhirClinicalService {
  constructor(private readonly prisma: PrismaService, private readonly search: FhirSearchService, private readonly refs: FhirReferenceResolver) {}

  async read(type: ClinicalResourceType, facilityId: string, rawId: string) {
    const id = parseLogicalId(rawId);
    const resource = type === "Condition" ? await this.condition(facilityId, id)
      : type === "ServiceRequest" ? await this.serviceRequest(facilityId, id)
      : type === "DiagnosticReport" ? await this.diagnosticReport(facilityId, id)
      : await this.carePlan(facilityId, id);
    if (!resource) throw new NotFoundException(`${type} not found`);
    return resource;
  }

  async find(type: ClinicalResourceType, facilityId: string, query: Record<string, unknown>) {
    const allowed = type === "Condition" ? ["_id", "patient", "subject", "encounter", "code", "clinical-status", "verification-status", "recorded-date", "_count", "_cursor"]
      : type === "ServiceRequest" ? ["_id", "patient", "subject", "encounter", "code", "status", "authored", "_count", "_cursor"]
      : type === "DiagnosticReport" ? ["_id", "patient", "subject", "encounter", "based-on", "status", "date", "_count", "_cursor"]
      : ["_id", "patient", "subject", "encounter", "status", "date", "_count", "_cursor"];
    const parsed = this.search.parse(query, allowed); const v = parsed.values;
    const patient = this.reference(v.patient ?? v.subject, "Patient");
    const encounter = this.reference(v.encounter, "Encounter");
    const id = v._id ? parseLogicalId(v._id) : undefined;
    let rows: Array<Record<string, any>>;
    if (type === "Condition") {
      if (v["verification-status"] && !["confirmed", "entered-in-error"].includes(v["verification-status"])) throw new BadRequestException("Unsupported verification-status");
      const status = v["clinical-status"] ? ({ active: "ACTIVE", resolved: "RESOLVED" } as Record<string,string>)[v["clinical-status"]] : undefined;
      if (v["clinical-status"] && !status) throw new BadRequestException("Unsupported clinical-status");
      const verificationStatus = v["verification-status"] === "confirmed" ? { in: [DiagnosisStatus.ACTIVE, DiagnosisStatus.RESOLVED] } : v["verification-status"] === "entered-in-error" ? DiagnosisStatus.REMOVED : undefined;
      rows = await this.prisma.diagnosis.findMany({ where: { facilityId, ...(id ? { id } : {}), ...(patient ? { patientId: patient } : {}), ...(encounter ? { encounterId: encounter } : {}), ...(v.code ? { code: this.token(v.code) } : {}), ...(status ? { status: status as any } : verificationStatus ? { status: verificationStatus } : {}), ...(v["recorded-date"] ? { createdAt: this.day(v["recorded-date"]) } : {}), ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}) }, orderBy: { id: "asc" }, take: parsed.count + 1 });
    } else if (type === "ServiceRequest") {
      rows = await this.prisma.orderItem.findMany({ where: { id: id ?? (parsed.cursor ? { gt: parsed.cursor } : undefined), catalogItemType: { in: TYPES }, order: { facilityId, ...(patient ? { patientId: patient } : {}), ...(encounter ? { encounterId: encounter } : {}), ...(v.authored ? { createdAt: this.day(v.authored) } : {}) }, ...(v.code ? { OR: [{ catalogItemId: this.token(v.code) }, { manualLabel: v.code }] } : {}), ...(v.status ? { status: this.orderStatus(v.status) as any } : {}) }, include: { order: true }, orderBy: { id: "asc" }, take: parsed.count + 1 });
    } else if (type === "DiagnosticReport") {
      const basedOn = this.reference(v["based-on"], "ServiceRequest");
      if (v.status && !["preliminary", "final", "cancelled"].includes(v.status)) throw new BadRequestException("Unsupported status");
      const reportStatus = v.status === "cancelled" ? { orderItem: { status: OrderStatus.CANCELLED } } : v.status === "final" ? { verifiedAt: { not: null }, orderItem: { status: { not: OrderStatus.CANCELLED } } } : v.status === "preliminary" ? { verifiedAt: null, orderItem: { status: { not: OrderStatus.CANCELLED } } } : {};
      rows = await this.prisma.result.findMany({ where: { facilityId, ...(id ? { id } : {}), ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}), ...(v.date ? { createdAt: this.day(v.date) } : {}), ...reportStatus, orderItem: { ...(reportStatus as any).orderItem, id: basedOn, catalogItemType: { in: TYPES }, order: { facilityId, ...(patient ? { patientId: patient } : {}), ...(encounter ? { encounterId: encounter } : {}) } } }, include: { orderItem: { include: { order: true } } }, orderBy: { id: "asc" }, take: parsed.count + 1 });
    } else {
      rows = await this.prisma.encounterCarePlan.findMany({ where: { facilityId, ...(id ? { id } : {}), ...(patient ? { patientId: patient } : {}), ...(encounter ? { encounterId: encounter } : {}), ...(v.status ? { status: this.careStatus(v.status) as any } : {}), ...(v.date ? { createdAt: this.day(v.date) } : {}), ...(parsed.cursor ? { id: { gt: parsed.cursor } } : {}) }, include: { components: { orderBy: { sequence: "asc" } } }, orderBy: { id: "asc" }, take: parsed.count + 1 });
    }
    const page = await Promise.all(rows.slice(0, parsed.count).map((r) => this.map(type, facilityId, r)));
    return searchBundle(this.search.baseUrl(), type, query, page, rows.length > parsed.count);
  }

  private async condition(f: string, id: string) { const r = await this.prisma.diagnosis.findFirst({ where: { id, facilityId: f } }); return r && this.mapCondition(r); }
  private async serviceRequest(f: string, id: string) { const r = await this.prisma.orderItem.findFirst({ where: { id, catalogItemType: { in: TYPES }, order: { facilityId: f } }, include: { order: true } }); return r && this.mapRequest(f, r); }
  private async diagnosticReport(f: string, id: string) { const r = await this.prisma.result.findFirst({ where: { id, facilityId: f, orderItem: { catalogItemType: { in: TYPES }, order: { facilityId: f } } }, include: { orderItem: { include: { order: true } } } }); return r && this.mapReport(f, r); }
  private async carePlan(f: string, id: string) { const r = await this.prisma.encounterCarePlan.findFirst({ where: { id, facilityId: f }, include: { components: { orderBy: { sequence: "asc" } } } }); return r && this.mapCarePlan(f, r); }
  private map(type: ClinicalResourceType, f: string, r: any) { return type === "Condition" ? this.mapCondition(r) : type === "ServiceRequest" ? this.mapRequest(f,r) : type === "DiagnosticReport" ? this.mapReport(f,r) : this.mapCarePlan(f,r); }
  private mapCondition(r: any) { const mapped = DIAGNOSIS_STATUS[r.status as DiagnosisStatus]; if (!mapped) throw new Error("Unmapped Diagnosis status"); return { resourceType: "Condition", id: r.id, clinicalStatus: mapped.clinical ? { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: mapped.clinical }] } : undefined, verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: mapped.verification }] }, code: r.codeSource === "ICD10_CATALOG" ? { coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: r.code, display: r.description ?? undefined }] } : { text: r.description ?? r.code }, subject: this.refs.reference("Patient", r.patientId), encounter: this.refs.reference("Encounter", r.encounterId), onsetDateTime: r.onsetDate?.toISOString(), abatementDateTime: r.resolvedDate?.toISOString(), recordedDate: r.createdAt.toISOString() }; }
  private async mapRequest(f: string, r: any) { await this.safeCoreRefs(f, r.order); const requester = r.order.orderedBy ? await this.prisma.userRole.findFirst({ where: { facilityId: f, userId: r.order.orderedBy, isActive: true, role: { code: { in: ["RN", "PROVIDER"] } } }, select: { userId: true } }) : null; return { resourceType: "ServiceRequest", id: r.id, status: this.requestStatus(r.status), intent: "order", priority: ({ ROUTINE: "routine", URGENT: "urgent", STAT: "stat" } as any)[r.order.priority], code: r.catalogItemId ? { coding: [{ system: "urn:medora:catalog", code: r.catalogItemId }], text: r.manualLabel ?? undefined } : { text: r.manualLabel ?? r.manualSecondaryText ?? "Diagnostic service" }, subject: this.refs.reference("Patient", r.order.patientId), encounter: this.refs.reference("Encounter", r.order.encounterId), authoredOn: r.order.createdAt.toISOString(), requester: requester ? this.refs.reference("Practitioner", requester.userId) : undefined, occurrenceDateTime: (r.intendedAdministrationAt ?? r.effectiveCollectedAt ?? r.effectivePerformedAt)?.toISOString() }; }
  private async mapReport(f: string, r: any) { await this.safeCoreRefs(f, r.orderItem.order); return { resourceType: "DiagnosticReport", id: r.id, status: this.reportStatus(r), category: [{ text: r.orderItem.catalogItemType === "LAB_TEST" ? "Laboratory" : "Imaging" }], code: r.orderItem.catalogItemId ? { coding: [{ system: "urn:medora:catalog", code: r.orderItem.catalogItemId }], text: r.orderItem.manualLabel ?? undefined } : { text: r.orderItem.manualLabel ?? "Diagnostic report" }, subject: this.refs.reference("Patient", r.orderItem.order.patientId), encounter: this.refs.reference("Encounter", r.orderItem.order.encounterId), basedOn: [this.refs.reference("ServiceRequest", r.orderItemId)], effectiveDateTime: (r.effectiveResultedAt ?? r.effectiveFinalizedAt ?? r.verifiedAt ?? r.createdAt).toISOString(), issued: (r.verifiedAt ?? r.createdAt).toISOString(), conclusion: r.resultText ?? undefined }; }
  private async mapCarePlan(f: string, r: any) { await this.safeCoreRefs(f, r); const careStatus = CARE_PLAN_STATUS[r.status as CarePlanStatus]; if (!careStatus) throw new Error("Unmapped CarePlan status"); const practitioner = await this.prisma.userRole.findFirst({ where: { facilityId: f, userId: r.activatedByUserId, isActive: true }, select: { userId: true } }); return { resourceType: "CarePlan", id: r.id, status: careStatus, intent: "plan", title: r.title, subject: this.refs.reference("Patient", r.patientId), encounter: this.refs.reference("Encounter", r.encounterId), period: { start: r.activatedAt.toISOString(), end: (r.completedAt ?? r.discontinuedAt)?.toISOString() }, created: r.createdAt.toISOString(), author: practitioner ? this.refs.reference("Practitioner", practitioner.userId) : undefined, activity: r.components.map((c:any) => ({ detail: { status: carePlanActivityStatus(c.status), description: c.text } })) }; }
  private async safeCoreRefs(f: string, x: any) { await this.refs.assertVisible("Patient", x.patientId, f); await this.refs.assertVisible("Encounter", x.encounterId, f); }
  private reference(v: string|undefined, type: "Patient"|"Encounter"|"ServiceRequest") { return v ? parseFhirReference(v, type).id : undefined; }
  private token(v:string) { const p=v.split("|"); if(p.length>2 || !p.at(-1)) throw new BadRequestException("Malformed token"); return p.at(-1)!; }
  private day(v:string) { if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new BadRequestException("Malformed date"); const d=new Date(v+"T00:00:00.000Z"); if(d.toISOString().slice(0,10)!==v) throw new BadRequestException("Malformed date"); return { gte:d, lt:new Date(d.getTime()+86400000) }; }
  private orderStatus(v:string) { const x=({ draft:"DRAFT", active:"IN_PROGRESS", completed:"COMPLETED", revoked:"CANCELLED" } as any)[v]; if(!x) throw new BadRequestException("Unsupported status"); return x; }
  private requestStatus(v:string) { const status = SERVICE_REQUEST_STATUS[v as OrderStatus]; if (!status) throw new Error("Unmapped Order status"); return status; }
  private reportStatus(r:any) { return diagnosticReportStatus(r); }
  private careStatus(v:string) { const x=({ draft:"DRAFT", active:"ACTIVE", "on-hold":"ON_HOLD", completed:"COMPLETED", revoked:"DISCONTINUED" } as any)[v]; if(!x) throw new BadRequestException("Unsupported status"); return x; }
}
