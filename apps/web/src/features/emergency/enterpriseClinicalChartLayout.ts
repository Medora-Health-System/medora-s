import type { ClinicalRecordAttribution } from "@medora/shared";
import type {
  EncounterClinicalRecord,
  EncounterClinicalRecordClinicalMilestone,
  EncounterClinicalRecordClinicalTimelineEntry,
  EncounterClinicalRecordDiagnosis,
  EncounterClinicalRecordImagingResult,
  EncounterClinicalRecordLaboratoryResult,
  EncounterClinicalRecordMedicationAdministration,
  EncounterClinicalRecordOrderRow,
  EncounterClinicalRecordProviderAssessment,
} from "@medora/shared";
import { calculateAge } from "@/lib/patientDisplay";

export const ENTERPRISE_CLINICAL_CHART_SECTION_ORDER = [
  "encounterOverview",
  "chiefComplaint",
  "hpi",
  "triageSummary",
  "providerAssessment",
  "nursingDocumentation",
  "activeOrders",
  "results",
  "medicationAdministration",
  "completedProcedures",
  "diagnoses",
  "clinicalTimeline",
  "disposition",
  "electronicSignatures",
  "auditTimeline",
] as const;

export type EnterpriseClinicalChartSectionId = (typeof ENTERPRISE_CLINICAL_CHART_SECTION_ORDER)[number];

export type EnterpriseOrderGroupKey =
  | "laboratory"
  | "imaging"
  | "medications"
  | "treatments"
  | "procedures";

export type EnterpriseTriageFieldKey =
  | "esi"
  | "arrivalMode"
  | "symptomOnset"
  | "chiefComplaint"
  | "narrative"
  | "vitalSigns"
  | "pain"
  | "allergies"
  | "isolation"
  | "fallRisk"
  | "acuityAlerts"
  | "airway"
  | "breathing"
  | "circulation"
  | "gcs";

export type EnterpriseTriageSummary = Partial<Record<EnterpriseTriageFieldKey, string>>;

export type EnterpriseEncounterOverview = {
  patientDisplayName: string | null;
  patientMrn: string | null;
  patientAgeLabel: string | null;
  patientSexLabel: string | null;
  arrivedAt: string | null;
  lengthOfStayLabel: string | null;
  dispositionStatusLabel: string | null;
  attendingProviderDisplayName: string | null;
  primaryNurseDisplayName: string | null;
};

export type EnterpriseGroupedOrders = Record<EnterpriseOrderGroupKey, EncounterClinicalRecordOrderRow[]>;

export type EnterpriseGroupedDiagnoses = {
  primary: EncounterClinicalRecordDiagnosis[];
  secondary: EncounterClinicalRecordDiagnosis[];
  chronic: EncounterClinicalRecordDiagnosis[];
  resolved: EncounterClinicalRecordDiagnosis[];
};

export type EnterpriseClinicalChartLayout = {
  overview: EnterpriseEncounterOverview;
  triageDocumentation: ClinicalRecordAttribution | null;
  triageFields: Partial<Record<EnterpriseTriageFieldKey, string>>;
  vitalsRows: EncounterClinicalRecord["vitals"];
  chiefComplaintLines: string[];
  hpiLines: string[];
  triageSummary: EnterpriseTriageSummary;
  triageVitals: EncounterClinicalRecord["vitals"];
  providerAssessment: EncounterClinicalRecordProviderAssessment | null;
  providerAssessmentHistory: EncounterClinicalRecord["providerAssessmentHistory"];
  nursingAssessment: EncounterClinicalRecord["nursingAssessment"];
  nursingAssessmentHistory: EncounterClinicalRecord["nursingAssessmentHistory"];
  groupedOrders: EnterpriseGroupedOrders;
  laboratoryResults: EncounterClinicalRecordLaboratoryResult[];
  imagingResults: EncounterClinicalRecordImagingResult[];
  medicationAdministration: EncounterClinicalRecordMedicationAdministration[];
  completedProcedures: EncounterClinicalRecord["procedures"];
  groupedDiagnoses: EnterpriseGroupedDiagnoses;
  clinicalTimeline: EncounterClinicalRecordClinicalTimelineEntry[];
  disposition: EncounterClinicalRecord["disposition"];
  signatures: EncounterClinicalRecord["signatures"];
};

export const PHYSICIAN_CLINICAL_MILESTONES: ReadonlySet<EncounterClinicalRecordClinicalMilestone> =
  new Set([
    "ARRIVAL",
    "PROVIDER_ASSESSMENT_SIGNED",
    "MEDICATION_ADMINISTERED",
    "LABORATORY_RESULTED",
    "IMAGING_RESULTED",
    "PROCEDURE_COMPLETED",
    "DISPOSITION",
    "DISCHARGED",
  ]);

export const SEVERITY_HIGHLIGHT = {
  critical: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  abnormal: { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
} as const;

const HPI_SECTION_LABELS = [
  /^hpi$/i,
  /^hma$/i,
  /histoire de la maladie/i,
  /history of present illness/i,
  /motif et histoire/i,
  /présentation clinique/i,
];

const TRIAGE_LINE_PATTERNS: Array<{ key: EnterpriseTriageFieldKey; patterns: RegExp[] }> = [
  { key: "esi", patterns: [/^esi\s*[:：]/i, /niveau\s+esi/i, /^esi\s+\d/i] },
  {
    key: "arrivalMode",
    patterns: [/mode d'arrivée/i, /arrival mode/i, /mode d'arrivee/i, /transport/i],
  },
  {
    key: "symptomOnset",
    patterns: [/symptom onset/i, /début des symptômes/i, /debut des symptomes/i, /onset/i],
  },
  {
    key: "chiefComplaint",
    patterns: [/chief complaint/i, /motif/i, /plainte/i, /reason for visit/i],
  },
  {
    key: "narrative",
    patterns: [/triage narrative/i, /narratif/i, /histoire/i],
  },
  {
    key: "vitalSigns",
    patterns: [/signes vitaux/i, /vital signs/i, /constantes/i, /ta\s*[:：]/i, /fc\s*[:：]/i],
  },
  { key: "pain", patterns: [/douleur/i, /pain\s*[:：]/i, /échelle.*douleur/i, /pain scale/i] },
  {
    key: "allergies",
    patterns: [/allerg/i, /intolérance/i, /intolerance/i],
  },
  {
    key: "isolation",
    patterns: [/isolement/i, /isolation/i, /précautions/i, /precautions/i, /ppe/i],
  },
  {
    key: "fallRisk",
    patterns: [/risque de chute/i, /fall risk/i, /chute/i],
  },
  {
    key: "acuityAlerts",
    patterns: [/alerte/i, /alert/i, /sepsis/i, /stroke/i, /avc/i, /trauma/i],
  },
  { key: "airway", patterns: [/voie aérienne/i, /airway/i] },
  { key: "breathing", patterns: [/ventilation/i, /breathing/i, /respiration/i] },
  { key: "circulation", patterns: [/circulation/i] },
  { key: "gcs", patterns: [/gcs/i, /glasgow/i] },
];

function asTrimmed(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function normalizeOrderGroup(orderType: string): EnterpriseOrderGroupKey {
  const t = orderType.toUpperCase();
  if (t.includes("LAB")) return "laboratory";
  if (t.includes("IMG") || t.includes("RAD") || t.includes("IMAGING")) return "imaging";
  if (t.includes("MED") || t.includes("PHARM") || t.includes("DRUG")) return "medications";
  if (t.includes("PROC")) return "procedures";
  if (t.includes("CARE") || t.includes("TREAT") || t.includes("NURS")) return "treatments";
  return "treatments";
}

function dedupeByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function isHpiSectionLabel(label: string): boolean {
  return HPI_SECTION_LABELS.some((re) => re.test(label.trim()));
}

export function extractHpiFromProviderAssessment(
  assessment: EncounterClinicalRecordProviderAssessment | null
): string[] {
  if (!assessment) return [];
  const lines: string[] = [];
  for (const sec of assessment.sections) {
    if (!isHpiSectionLabel(sec.label)) continue;
    const text = sec.text.trim();
    if (text) lines.push(text);
  }
  if (lines.length === 0 && assessment.narrativeSummary?.trim()) {
    return [assessment.narrativeSummary.trim()];
  }
  return lines;
}

export function extractProviderAssessmentSectionsExcludingHpi(
  assessment: EncounterClinicalRecordProviderAssessment | null
): Array<{ label: string; text: string }> {
  if (!assessment) return [];
  return assessment.sections.filter((sec) => !isHpiSectionLabel(sec.label));
}

function parseTriageLine(line: string): { key: EnterpriseTriageFieldKey; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  for (const { key, patterns } of TRIAGE_LINE_PATTERNS) {
    if (patterns.some((re) => re.test(trimmed))) {
      return { key, value: trimmed };
    }
  }
  return null;
}

export function stripTriageDisplayValue(value: string): string | null {
  const trimmed = value.trim();
  const colonIdx = trimmed.indexOf(":");
  const raw = colonIdx < 0 ? trimmed : trimmed.slice(colonIdx + 1).trim() || trimmed;
  if (!raw || /^[-—–]+$/.test(raw)) return null;
  return raw;
}

export function parseTriageFieldLine(
  line: string
): { key: EnterpriseTriageFieldKey; value: string } | null {
  const parsed = parseTriageLine(line);
  if (!parsed) return null;
  const value = stripTriageDisplayValue(parsed.value);
  if (!value) return null;
  return { key: parsed.key, value };
}

export function buildTriageSummaryFromPresentation(
  presentationLines: string[],
  vitals: EncounterClinicalRecord["vitals"]
): { triageSummary: EnterpriseTriageSummary; hpiFromPresentation: string[] } {
  const triageSummary: EnterpriseTriageSummary = {};
  const hpiFromPresentation: string[] = [];

  for (const line of presentationLines) {
    const parsed = parseTriageLine(line);
    if (parsed) {
      const value = stripTriageDisplayValue(parsed.value);
      if (value) triageSummary[parsed.key] = value;
    } else if (line.trim()) {
      hpiFromPresentation.push(line.trim());
    }
  }

  return { triageSummary, hpiFromPresentation };
}

export function computeLengthOfStayMinutes(
  arrivedAt: string | null,
  closedAt: string | null,
  nowMs: number = Date.now()
): number | null {
  if (!arrivedAt) return null;
  const start = new Date(arrivedAt).getTime();
  if (Number.isNaN(start)) return null;
  const end = closedAt ? new Date(closedAt).getTime() : nowMs;
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / 60_000));
}

export function formatLengthOfStayLabel(totalMinutes: number | null): string | null {
  if (totalMinutes == null) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function formatPatientAgeFromDob(dob: string | null): string | null {
  if (!dob) return null;
  const age = calculateAge(dob);
  if (!Number.isFinite(age) || age < 0) return null;
  return String(age);
}

export function groupOrdersByCategory(
  orders: EncounterClinicalRecordOrderRow[]
): EnterpriseGroupedOrders {
  const deduped = dedupeByKey(orders, (o) => o.orderItemId);
  const grouped: EnterpriseGroupedOrders = {
    laboratory: [],
    imaging: [],
    medications: [],
    treatments: [],
    procedures: [],
  };
  for (const order of deduped) {
    grouped[normalizeOrderGroup(order.orderType)].push(order);
  }
  for (const key of Object.keys(grouped) as EnterpriseOrderGroupKey[]) {
    grouped[key].sort((a, b) => {
      const at = a.orderedAt ?? "";
      const bt = b.orderedAt ?? "";
      return bt.localeCompare(at) || a.label.localeCompare(b.label);
    });
  }
  return grouped;
}

export function groupDiagnoses(
  diagnoses: EncounterClinicalRecordDiagnosis[]
): EnterpriseGroupedDiagnoses {
  const deduped = dedupeByKey(diagnoses, (d) => d.id);
  const primary: EncounterClinicalRecordDiagnosis[] = [];
  const secondary: EncounterClinicalRecordDiagnosis[] = [];
  const chronic: EncounterClinicalRecordDiagnosis[] = [];
  const resolved: EncounterClinicalRecordDiagnosis[] = [];

  for (const dx of deduped) {
    const status = (dx.status ?? "").toUpperCase();
    if (status === "RESOLVED") {
      resolved.push(dx);
      continue;
    }
    const type = (dx.diagnosisType ?? "").toUpperCase();
    if (type.includes("CHRONIC") || type.includes("PROBLEM")) {
      chronic.push(dx);
    } else if (dx.isPrimary) {
      primary.push(dx);
    } else {
      secondary.push(dx);
    }
  }

  return { primary, secondary, chronic, resolved };
}

export function formatEncounterClinicalRecordDiagnosisLine(dx: EncounterClinicalRecordDiagnosis): string {
  const label = dx.displayLabel.trim();
  if (label) return label;
  return dx.code?.trim() || "";
}

export function diagnosisAttributionFallback(
  documentedBy: ClinicalRecordAttribution | null | undefined,
  t: (key: string) => string
): string {
  return `${t("encounterClinicalRecordSummary.attrDocumentedBy")} ${t("encounterClinicalRecordSummary.attrNotRecorded")}`;
}

export function filterPhysicianClinicalTimeline(
  entries: EncounterClinicalRecordClinicalTimelineEntry[]
): EncounterClinicalRecordClinicalTimelineEntry[] {
  return dedupeByKey(
    entries.filter((e) => PHYSICIAN_CLINICAL_MILESTONES.has(e.milestone)),
    (e) => e.id
  );
}

export function isCriticalAllergyText(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    /anaphyl/i.test(t) ||
    /sévère|severe/i.test(t) ||
    /critique|critical/i.test(t) ||
    /\bstat\b/i.test(t)
  );
}

export function isCriticalMedicationOrder(order: EncounterClinicalRecordOrderRow): boolean {
  const priority = (order.priority ?? "").toUpperCase();
  return priority === "STAT" || priority === "URGENT";
}

export function buildEnterpriseClinicalChartLayout(
  record: EncounterClinicalRecord
): EnterpriseClinicalChartLayout {
  const presentationLines = record.presentation?.lines ?? [];
  const chiefComplaintLines = [...(record.chiefComplaint?.lines ?? [])];
  const hpiFromProvider = extractHpiFromProviderAssessment(record.providerAssessment);
  const { triageSummary, hpiFromPresentation } = buildTriageSummaryFromPresentation(
    presentationLines,
    record.vitals
  );

  const hpiLines = hpiFromProvider.length > 0 ? hpiFromProvider : hpiFromPresentation;

  const triageFieldsFromDoc = record.triageDocumentation?.fields ?? {};
  for (const [key, value] of Object.entries(triageFieldsFromDoc)) {
    const trimmed = value?.trim();
    if (trimmed) {
      triageSummary[key as EnterpriseTriageFieldKey] = trimmed;
    }
  }
  if (record.vitals.length > 0) {
    const vitalValue = triageSummary.vitalSigns?.trim();
    if (!vitalValue || /^[-—–]+$/.test(vitalValue)) {
      delete triageSummary.vitalSigns;
    }
  }

  const losMinutes = computeLengthOfStayMinutes(
    record.header.arrivedAt,
    record.header.closedAt
  );

  const dispositionStatusLabel =
    asTrimmed(record.disposition?.dischargeMode) ??
    asTrimmed(record.header.encounterStatus);

  return {
    overview: {
      patientDisplayName: record.header.patientDisplayName,
      patientMrn: record.header.patientMrn,
      patientAgeLabel: formatPatientAgeFromDob(record.header.patientDateOfBirth),
      patientSexLabel: record.header.patientSex,
      arrivedAt: record.header.arrivedAt,
      lengthOfStayLabel: formatLengthOfStayLabel(losMinutes),
      dispositionStatusLabel,
      attendingProviderDisplayName: record.header.attendingProviderDisplayName,
      primaryNurseDisplayName: record.nursingAssessment?.performerDisplayName ?? null,
    },
    triageDocumentation: record.triageDocumentation?.documentedBy ?? null,
    triageFields: triageFieldsFromDoc,
    vitalsRows: record.vitals,
    chiefComplaintLines,
    hpiLines,
    triageSummary,
    triageVitals: record.vitals,
    providerAssessment: record.providerAssessment,
    providerAssessmentHistory: record.providerAssessmentHistory,
    nursingAssessment: record.nursingAssessment,
    nursingAssessmentHistory: record.nursingAssessmentHistory,
    groupedOrders: groupOrdersByCategory(record.orders),
    laboratoryResults: dedupeByKey(record.laboratoryResults, (r) => r.orderItemId),
    imagingResults: dedupeByKey(record.imagingResults, (r) => r.orderItemId),
    medicationAdministration: [...record.medicationAdministration].sort((a, b) => {
      const at = a.administeredAt ?? "";
      const bt = b.administeredAt ?? "";
      return at.localeCompare(bt);
    }),
    completedProcedures: dedupeByKey(record.procedures, (p) => p.id),
    groupedDiagnoses: groupDiagnoses(record.diagnoses),
    clinicalTimeline: filterPhysicianClinicalTimeline(record.clinicalTimeline),
    disposition: record.disposition,
    signatures: record.signatures,
  };
}

export function validateEnterpriseLayoutNoDuplicates(layout: EnterpriseClinicalChartLayout): {
  providerAssessmentCount: number;
  nursingAssessmentCount: number;
  orderItemIds: string[];
  labOrderItemIds: string[];
  imagingOrderItemIds: string[];
} {
  return {
    providerAssessmentCount: layout.providerAssessment ? 1 : 0,
    nursingAssessmentCount: layout.nursingAssessment ? 1 : 0,
    orderItemIds: [
      ...layout.groupedOrders.laboratory,
      ...layout.groupedOrders.imaging,
      ...layout.groupedOrders.medications,
      ...layout.groupedOrders.treatments,
      ...layout.groupedOrders.procedures,
    ].map((o) => o.orderItemId),
    labOrderItemIds: layout.laboratoryResults.map((r) => r.orderItemId),
    imagingOrderItemIds: layout.imagingResults.map((r) => r.orderItemId),
  };
}
