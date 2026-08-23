/**
 * MEDUI.INP.2G — Structured medical-record projection of authoritative Nursing Admission.
 * Read-only rows; omit empty fields (no invented Normal / No / N/A).
 */

import type { MedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import { projectNursingAdmissionOverview } from "./nursingAdmissionOverviewProjectionInp2b.js";

export type NursingAdmissionMedicalRecordRowV1 = {
  /** Stable i18n key suffix under inpatientNursingAdmissionInp2g.record.* */
  fieldKey: string;
  /** Documented clinical value only — never a fabricated default */
  value: string;
};

export type NursingAdmissionMedicalRecordProjectionV1 = {
  availability: "READY" | "EMPTY";
  rows: NursingAdmissionMedicalRecordRowV1[];
  signed: boolean;
  nurseDisplayName: string | null;
  nurseCredentials: string | null;
  signedAt: string | null;
  amendments: Array<{ type: string; sectionId: string; reason: string; createdAt: string }>;
  /** True when the authoritative admission has one or more amendments (summary/print chrome). */
  hasAmendments: boolean;
  amendmentCount: number;
};

function push(
  rows: NursingAdmissionMedicalRecordRowV1[],
  fieldKey: string,
  value: string | null | undefined
) {
  if (typeof value === "string" && value.trim()) {
    rows.push({ fieldKey, value: value.trim() });
  }
}

function sectionAnswer(
  doc: MedSurgNursingAdmissionDocV1,
  sectionId: string,
  key: string
): string | null {
  const v = doc.sections?.[sectionId as keyof typeof doc.sections]?.answers?.[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (Array.isArray(v) && v.length) return v.map(String).filter(Boolean).join(", ");
  return null;
}

export function projectNursingAdmissionMedicalRecord(
  doc: MedSurgNursingAdmissionDocV1 | null | undefined
): NursingAdmissionMedicalRecordProjectionV1 {
  const ov = projectNursingAdmissionOverview(doc);
  if (!doc || ov.availability === "EMPTY") {
    return {
      availability: "EMPTY",
      rows: [],
      signed: false,
      nurseDisplayName: null,
      nurseCredentials: null,
      signedAt: null,
      amendments: [],
      hasAmendments: false,
      amendmentCount: 0,
    };
  }

  const rows: NursingAdmissionMedicalRecordRowV1[] = [];
  push(rows, "admissionSource", ov.admissionSource);
  push(rows, "modeOfArrival", ov.modeOfArrival);
  push(rows, "conditionOnArrival", ov.conditionOnArrival);
  push(rows, "identityDemographics", sectionAnswer(doc, "IDENTITY_DEMOGRAPHICS", "identityConfirmed"));
  push(rows, "language", ov.language);
  push(rows, "interpreterNeeded", ov.interpreterNeeded);
  push(rows, "historyReviewed", ov.historyReviewed);
  push(
    rows,
    "surgicalHistory",
    sectionAnswer(doc, "SURGICAL_HISTORY", "rapidSurgicalHistory") ??
      sectionAnswer(doc, "SURGICAL_HISTORY", "surgicalHistorySummary")
  );
  push(rows, "homeMedications", ov.homeMedReviewed);
  push(rows, "allergies", ov.allergyReviewed);
  push(rows, "socialHistory", ov.preAdmissionResidence);
  push(rows, "advanceDirective", ov.advanceDirective);
  push(
    rows,
    "belongings",
    sectionAnswer(doc, "BELONGINGS_VALUABLES", "belongingsStatus") ??
      sectionAnswer(doc, "BELONGINGS_VALUABLES", "rapidBelongings") ??
      (Array.isArray(doc.belongings) && doc.belongings.length > 0
        ? String(doc.belongings.length)
        : null)
  );
  push(rows, "skinWound", ov.skinBaseline);
  push(rows, "linesDrainsDevices", ov.devicesConfirmed);
  push(rows, "fallSafety", ov.fallRiskConcern);
  push(rows, "safety", ov.safetyConcern);
  push(rows, "pain", ov.painStatus);
  push(rows, "functionalMobility", ov.mobilityBaseline);
  push(rows, "nutrition", ov.nutritionConcern);
  push(rows, "elimination", ov.eliminationBaseline);
  push(rows, "psychosocial", ov.psychosocialBarrier);
  push(rows, "educationCommunication", ov.educationBarrier);
  push(
    rows,
    "providerNotification",
    sectionAnswer(doc, "PROVIDER_ADMISSION", "providerNotifiedOfArrival") ??
      sectionAnswer(doc, "PROVIDER_ADMISSION", "handoffStatus")
  );
  push(rows, "dischargeBaseline", ov.dischargeBaselineFlag);
  push(
    rows,
    "completionStatus",
    ov.allRequiredComplete ? "COMPLETE" : `${ov.completeCount}/${ov.totalSections}`
  );
  push(rows, "clinicalDocumentedAt", ov.clinicalDocumentedAt);

  const sig = doc.nurseSignature;
  return {
    availability: "READY",
    rows,
    signed: Boolean(sig?.signed),
    nurseDisplayName: typeof sig?.displayName === "string" ? sig.displayName : null,
    nurseCredentials: typeof sig?.credentials === "string" ? sig.credentials : null,
    signedAt: typeof sig?.signedAt === "string" ? sig.signedAt : null,
    amendments: (Array.isArray(doc.amendments) ? doc.amendments : []).map((raw) => {
      const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      return {
        type: String(a.type ?? ""),
        sectionId: String(a.sectionId ?? ""),
        reason: String(a.reason ?? ""),
        createdAt: String(a.createdAt ?? ""),
      };
    }),
    hasAmendments: (Array.isArray(doc.amendments) ? doc.amendments : []).length > 0,
    amendmentCount: (Array.isArray(doc.amendments) ? doc.amendments : []).length,
  };
}
