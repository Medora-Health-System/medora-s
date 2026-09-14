import { createHash } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  patientClinicalHistoryProfileFromJson,
  sanitizeEnterpriseAllergiesSection,
  type EnterpriseAllergyEntry,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseFhirReference, parseLogicalId } from "./fhir-protocol";
import { FhirSearchService, searchBundle } from "./fhir-search";

const CLINICAL_STATUS_SYSTEM = "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical";
const VERIFICATION_STATUS_SYSTEM = "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification";
const ALLERGY_ID_RE = /^ai-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([0-9a-f]{20})$/i;
const PATIENT_BATCH_SIZE = 200;

export type FhirAllergyIntoleranceResource = {
  resourceType: "AllergyIntolerance";
  id: string;
  clinicalStatus: { coding: Array<{ system: string; code: "active" | "inactive" }> };
  verificationStatus: { coding: Array<{ system: string; code: "confirmed" | "unconfirmed" }> };
  code: { text: string };
  patient: { reference: string };
  recordedDate?: string;
  reaction?: Array<{
    manifestation: Array<{ text: string }>;
    severity?: "mild" | "moderate" | "severe";
  }>;
};

function entryFingerprint(entryId: string): string {
  return createHash("sha256").update(entryId, "utf8").digest("hex").slice(0, 20);
}

export function allergyLogicalId(patientId: string, entryId: string): string {
  return `ai-${patientId}-${entryFingerprint(entryId)}`;
}

export function parseAllergyLogicalId(rawId: string): { patientId: string; fingerprint: string } {
  const id = parseLogicalId(rawId);
  const match = ALLERGY_ID_RE.exec(id);
  if (!match) throw new BadRequestException("Malformed AllergyIntolerance logical ID");
  return { patientId: match[1]!.toLowerCase(), fingerprint: match[2]!.toLowerCase() };
}

export function allergyClinicalStatus(entry: EnterpriseAllergyEntry): "active" | "inactive" {
  return entry.status === "ACTIVE" ? "active" : "inactive";
}

export function allergyVerificationStatus(entry: EnterpriseAllergyEntry): "confirmed" | "unconfirmed" {
  return entry.verificationStatus === "CLINICIAN_VERIFIED" ? "confirmed" : "unconfirmed";
}

function reactionSeverity(entry: EnterpriseAllergyEntry): "mild" | "moderate" | "severe" | undefined {
  if (entry.severity === "MILD") return "mild";
  if (entry.severity === "MODERATE") return "moderate";
  if (entry.severity === "SEVERE" || entry.severity === "ANAPHYLAXIS") return "severe";
  return undefined;
}

function validRecordedDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function mapAllergyIntolerance(patientId: string, entry: EnterpriseAllergyEntry): FhirAllergyIntoleranceResource {
  const severity = reactionSeverity(entry);
  const reaction = entry.reaction?.trim()
    ? [{
        manifestation: [{ text: entry.reaction.trim() }],
        ...(severity ? { severity } : {}),
      }]
    : undefined;
  return {
    resourceType: "AllergyIntolerance",
    id: allergyLogicalId(patientId, entry.id),
    clinicalStatus: { coding: [{ system: CLINICAL_STATUS_SYSTEM, code: allergyClinicalStatus(entry) }] },
    verificationStatus: { coding: [{ system: VERIFICATION_STATUS_SYSTEM, code: allergyVerificationStatus(entry) }] },
    code: { text: entry.substance },
    patient: { reference: `Patient/${patientId}` },
    ...(validRecordedDate(entry.updatedAt) ? { recordedDate: validRecordedDate(entry.updatedAt) } : {}),
    ...(reaction ? { reaction } : {}),
  };
}

function entriesFromProfile(raw: unknown): EnterpriseAllergyEntry[] {
  const profile = patientClinicalHistoryProfileFromJson(raw);
  if (!profile?.allergies) return [];
  const section = sanitizeEnterpriseAllergiesSection(profile.allergies);
  if (section.nkda) return [];
  return section.entries ?? [];
}

function exactDay(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException("Unsupported date search; use YYYY-MM-DD");
  return value;
}

@Injectable()
export class FhirAllergyIntoleranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: FhirSearchService,
  ) {}

  async read(facilityId: string, rawId: string): Promise<FhirAllergyIntoleranceResource> {
    const decoded = parseAllergyLogicalId(rawId);
    const patient = await this.prisma.patient.findFirst({
      where: { id: decoded.patientId, facilityId },
      select: { id: true, clinicalHistoryProfileJson: true },
    });
    if (!patient) throw new NotFoundException("AllergyIntolerance not found");
    const entry = entriesFromProfile(patient.clinicalHistoryProfileJson).find(
      (candidate) => entryFingerprint(candidate.id) === decoded.fingerprint,
    );
    if (!entry) throw new NotFoundException("AllergyIntolerance not found");
    return mapAllergyIntolerance(patient.id, entry);
  }

  async find(facilityId: string, query: Record<string, unknown>) {
    const parsed = this.search.parse(query, [
      "_id",
      "patient",
      "clinical-status",
      "verification-status",
      "date",
      "_count",
      "_cursor",
    ]);
    const v = parsed.values;
    const patientFilter = v.patient ? parseFhirReference(v.patient, "Patient").id : undefined;
    const idFilter = v._id ? parseAllergyLogicalId(v._id) : undefined;
    if (patientFilter && idFilter && patientFilter !== idFilter.patientId) {
      return searchBundle(this.search.baseUrl(), "AllergyIntolerance", query, [], false);
    }
    if (v["clinical-status"] && !["active", "inactive"].includes(v["clinical-status"])) {
      throw new BadRequestException("Unsupported clinical-status");
    }
    if (v["verification-status"] && !["confirmed", "unconfirmed"].includes(v["verification-status"])) {
      throw new BadRequestException("Unsupported verification-status");
    }
    const dateFilter = v.date ? exactDay(v.date) : undefined;
    const cursor = parsed.cursor ? parseAllergyLogicalId(parsed.cursor) : undefined;
    const fixedPatientId = patientFilter ?? idFilter?.patientId;
    const matches: FhirAllergyIntoleranceResource[] = [];

    let nextPatientId: string | undefined = fixedPatientId ?? cursor?.patientId;
    let includeBoundaryPatient = Boolean(nextPatientId);
    while (matches.length <= parsed.count) {
      const where = fixedPatientId
        ? { id: fixedPatientId, facilityId }
        : {
            facilityId,
            ...(nextPatientId
              ? { id: includeBoundaryPatient ? { gte: nextPatientId } : { gt: nextPatientId } }
              : {}),
          };
      const patients = await this.prisma.patient.findMany({
        where,
        select: { id: true, clinicalHistoryProfileJson: true },
        orderBy: { id: "asc" },
        take: fixedPatientId ? 1 : PATIENT_BATCH_SIZE,
      });
      if (!patients.length) break;

      for (const patient of patients) {
        const resources = entriesFromProfile(patient.clinicalHistoryProfileJson)
          .map((entry) => mapAllergyIntolerance(patient.id, entry))
          .sort((a, b) => a.id.localeCompare(b.id));
        for (const resource of resources) {
          if (cursor && resource.id.localeCompare(parsed.cursor!) <= 0) continue;
          if (idFilter && resource.id !== v._id) continue;
          const entryClinical = resource.clinicalStatus.coding[0]!.code;
          const entryVerification = resource.verificationStatus.coding[0]!.code;
          if (v["clinical-status"] && entryClinical !== v["clinical-status"]) continue;
          if (v["verification-status"] && entryVerification !== v["verification-status"]) continue;
          if (dateFilter && resource.recordedDate?.slice(0, 10) !== dateFilter) continue;
          matches.push(resource);
          if (matches.length > parsed.count) break;
        }
        if (matches.length > parsed.count) break;
      }

      if (fixedPatientId || matches.length > parsed.count || patients.length < PATIENT_BATCH_SIZE) break;
      nextPatientId = patients.at(-1)!.id;
      includeBoundaryPatient = false;
    }

    const page = matches.slice(0, parsed.count);
    return searchBundle(this.search.baseUrl(), "AllergyIntolerance", query, page, matches.length > parsed.count);
  }
}
