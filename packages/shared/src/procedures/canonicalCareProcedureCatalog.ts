/**
 * MEDUI.CARE_PROCEDURES.CANONICAL_CATALOG_FOUNDATION.1
 * Canonical Care / Procedures catalog plan — single source for DB seed and governance.
 * `code` maps 1:1 to persisted `enterpriseProcedureId` on OrderItem.
 */
import {
  ENTERPRISE_PROCEDURE_CATALOG,
  type EnterpriseProcedureCategory,
  type EnterpriseProcedureDefinition,
  type EnterpriseProcedureExecutionRoleCategory,
} from "./enterpriseProcedureCatalog.js";
import { OBSERVATION_ORDER_TEMPLATE_ITEMS } from "../observationOrderTemplate.js";
import {
  CANONICAL_CARE_PROCEDURE_CATEGORIES,
  type CanonicalCareProcedureCategory,
} from "./canonicalCareProcedureCategories.js";
import {
  WAVE1_STAFF_ORDER_ALIAS_MERGES,
  WAVE1_STAFF_ORDER_DEDUP_REPORT,
  WAVE1_STAFF_ORDER_NEW_ROWS,
} from "./canonicalCareProcedureStaffOrdersWave1Manifest.js";

export type CanonicalCareProcedureRow = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  category: CanonicalCareProcedureCategory;
  aliases: string[];
  executionRoleCategory: EnterpriseProcedureExecutionRoleCategory;
  orderable: boolean;
  isActive: boolean;
  deprecatedBy?: string;
  documentationTemplateId?: string;
  billingCode?: string;
  defaultInstructions?: string;
  requiresProviderOrder: boolean;
  nursingProtocolAllowed: boolean;
  requiresClinicalNote: boolean;
  sortPriority: number;
};

/** Legacy enterprise rows superseded by a canonical code — kept for persisted enterpriseProcedureId. */
export const CANONICAL_CARE_PROCEDURE_DEPRECATED_BY_CODE: Readonly<Record<string, string>> = {
  urinary_catheter_insertion: "foley_catheter",
  cardiac_monitoring: "continuous_cardiac_monitoring",
};

const PROVIDER_ONLY_CODES = new Set([
  "endotracheal_intubation",
  "central_line_placement",
  "arterial_line_placement",
  "laceration_repair",
  "incision_and_drainage",
  "reduction",
  "lumbar_puncture",
  "procedural_sedation",
  "chest_tube",
  "thoracentesis",
  "paracentesis",
  "cardiology_consult",
  "orthopedics_consult",
  "neurology_consult",
  "psychiatry_consult",
  "social_work_consult",
  "stroke_alert_activation",
  "trauma_team_activation",
  "picc_line_placement",
  "midline_catheter_placement",
  "transvenous_pacer",
  "massive_transfusion_protocol",
  "debride_wound",
  "cerumen_disimpaction",
  "transfuse_prbcs",
  "transfuse_ffp",
  "transfuse_platelets",
]);

function mapEnterpriseCategory(category: EnterpriseProcedureCategory): CanonicalCareProcedureCategory {
  switch (category) {
    case "AIRWAY":
      return "RESPIRATORY";
    case "CARDIAC_RESPIRATORY":
      return "MONITORING";
    case "VASCULAR_ACCESS":
      return "VASCULAR_ACCESS";
    case "WOUND_CARE":
      return "WOUND_CARE";
    case "ORTHOPEDIC":
      return "ORTHOPEDICS_IMMOBILIZATION";
    case "GU":
    case "GI":
      return "GI_GU";
    case "NEURO":
      return "NEURO_STROKE";
    case "SEDATION":
      return "OTHER";
    case "NURSING_TASK":
      return "NURSING_PATIENT_CARE";
    case "MONITORING":
      return "MONITORING";
    case "SPECIMEN_COLLECTION":
      return "SPECIMEN_POC";
    case "OTHER":
    default:
      return "OTHER";
  }
}

export function mapEnterpriseCategoryToCanonicalCareCategory(
  category: EnterpriseProcedureCategory
): CanonicalCareProcedureCategory {
  return mapEnterpriseCategory(category);
}

function mapObservationGroup(group: string): CanonicalCareProcedureCategory {
  switch (group) {
    case "monitoring":
      return "MONITORING";
    case "nursing_reassessment":
      return "NURSING_PATIENT_CARE";
    case "comfort":
      return "NURSING_PATIENT_CARE";
    case "diagnostics_hint":
      return "COMMUNICATION";
    case "disposition":
      return "ADMISSION_DISPOSITION";
    default:
      return "OTHER";
  }
}

function rowFromEnterprise(entry: EnterpriseProcedureDefinition, sortPriority: number): CanonicalCareProcedureRow {
  const deprecatedBy = CANONICAL_CARE_PROCEDURE_DEPRECATED_BY_CODE[entry.id];
  const requiresProvider = PROVIDER_ONLY_CODES.has(entry.id) || entry.executionRoleCategory === "PROVIDER";
  return {
    code: entry.id,
    displayNameEn: entry.displayNameEn,
    displayNameFr: entry.displayNameFr,
    category: mapEnterpriseCategory(entry.category),
    aliases: [...entry.aliases],
    executionRoleCategory: entry.executionRoleCategory,
    orderable: !deprecatedBy && entry.orderable,
    isActive: !deprecatedBy,
    ...(deprecatedBy ? { deprecatedBy } : {}),
    ...(entry.documentationTemplateId ? { documentationTemplateId: entry.documentationTemplateId } : {}),
    requiresProviderOrder: requiresProvider,
    nursingProtocolAllowed: !requiresProvider,
    requiresClinicalNote: entry.requiresProcedureNote,
    sortPriority,
  };
}

/** Canonical staff-order extensions (deduplicated; aliases hold legacy spellings). */
const CANONICAL_CARE_PROCEDURE_EXTENSIONS: Omit<CanonicalCareProcedureRow, "sortPriority">[] = [
  {
    code: "cervical_collar",
    displayNameEn: "Cervical collar application",
    displayNameFr: "Pose de collier cervical",
    category: "ORTHOPEDICS_IMMOBILIZATION",
    aliases: ["c-collar", "c collar", "cervical collar", "collier cervical", "c spine collar"],
    executionRoleCategory: "NURSING",
    orderable: true,
    isActive: true,
    requiresProviderOrder: false,
    nursingProtocolAllowed: true,
    requiresClinicalNote: false,
  },
  {
    code: "warm_blanket",
    displayNameEn: "Warm blanket",
    displayNameFr: "Couverture chauffante",
    category: "NURSING_PATIENT_CARE",
    aliases: ["give warm blanket", "heated blanket", "couverture chaude"],
    executionRoleCategory: "NURSING",
    orderable: true,
    isActive: true,
    requiresProviderOrder: false,
    nursingProtocolAllowed: true,
    requiresClinicalNote: false,
  },
  {
    code: "ice_pack",
    displayNameEn: "Ice pack application",
    displayNameFr: "Application de compresse froide",
    category: "NURSING_PATIENT_CARE",
    aliases: ["ice", "cold pack", "compresse froide"],
    executionRoleCategory: "NURSING",
    orderable: true,
    isActive: true,
    requiresProviderOrder: false,
    nursingProtocolAllowed: true,
    requiresClinicalNote: false,
  },
  {
    code: "restraints_application",
    displayNameEn: "Restraints application",
    displayNameFr: "Pose de contenants / contention",
    category: "NURSING_PATIENT_CARE",
    aliases: ["restraints", "physical restraints", "contention"],
    executionRoleCategory: "NURSING",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
  {
    code: "constant_observation",
    displayNameEn: "Constant observation / sitter",
    displayNameFr: "Surveillance constante / sitter",
    category: "MONITORING",
    aliases: ["sitter", "1:1 observation", "constant sitter", "surveillance constante"],
    executionRoleCategory: "NURSING",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
  {
    code: "wheelchair",
    displayNameEn: "Wheelchair",
    displayNameFr: "Fauteuil roulant",
    category: "EQUIPMENT",
    aliases: ["w/c", "wheel chair", "fauteuil roulant"],
    executionRoleCategory: "NURSING",
    orderable: true,
    isActive: true,
    requiresProviderOrder: false,
    nursingProtocolAllowed: true,
    requiresClinicalNote: false,
  },
  {
    code: "crutches",
    displayNameEn: "Crutches",
    displayNameFr: "Béquilles",
    category: "EQUIPMENT",
    aliases: ["crutch", "bequilles"],
    executionRoleCategory: "NURSING",
    orderable: true,
    isActive: true,
    requiresProviderOrder: false,
    nursingProtocolAllowed: true,
    requiresClinicalNote: false,
  },
  {
    code: "cardiology_consult",
    displayNameEn: "Cardiology consult",
    displayNameFr: "Consultation cardiologie",
    category: "CONSULTS",
    aliases: ["cardiology", "cardiac consult", "consult cardio"],
    executionRoleCategory: "PROVIDER",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
  {
    code: "orthopedics_consult",
    displayNameEn: "Orthopedics consult",
    displayNameFr: "Consultation orthopédie",
    category: "CONSULTS",
    aliases: ["ortho consult", "orthopedics", "consult ortho"],
    executionRoleCategory: "PROVIDER",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
  {
    code: "neurology_consult",
    displayNameEn: "Neurology consult",
    displayNameFr: "Consultation neurologie",
    category: "CONSULTS",
    aliases: ["neuro consult", "neurology", "consult neuro"],
    executionRoleCategory: "PROVIDER",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
  {
    code: "psychiatry_consult",
    displayNameEn: "Psychiatry consult",
    displayNameFr: "Consultation psychiatrie",
    category: "CONSULTS",
    aliases: ["psych consult", "psychiatry", "consult psych"],
    executionRoleCategory: "PROVIDER",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
  {
    code: "social_work_consult",
    displayNameEn: "Social work consult",
    displayNameFr: "Consultation travail social",
    category: "CONSULTS",
    aliases: ["social work", "sw consult", "travail social"],
    executionRoleCategory: "NURSING",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
  {
    code: "stroke_alert_activation",
    displayNameEn: "Stroke alert activation",
    displayNameFr: "Activation alerte AVC",
    category: "NEURO_STROKE",
    aliases: ["stroke alert", "code stroke", "alerte avc"],
    executionRoleCategory: "MULTI_ROLE",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
  {
    code: "trauma_team_activation",
    displayNameEn: "Trauma team activation",
    displayNameFr: "Activation équipe trauma",
    category: "TRAUMA",
    aliases: ["trauma alert", "code trauma", "equipe trauma"],
    executionRoleCategory: "MULTI_ROLE",
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
  },
];

function observationTemplateRows(): CanonicalCareProcedureRow[] {
  return OBSERVATION_ORDER_TEMPLATE_ITEMS.map((item, index) => ({
    code: item.id,
    displayNameEn: item.manualLabelEn,
    displayNameFr: item.manualLabelFr,
    category: mapObservationGroup(item.group),
    aliases: [],
    executionRoleCategory: "NURSING" as const,
    orderable: true,
    isActive: true,
    requiresProviderOrder: true,
    nursingProtocolAllowed: false,
    requiresClinicalNote: false,
    sortPriority: 500 + index,
  }));
}

function buildCanonicalCareProcedureCatalog(): CanonicalCareProcedureRow[] {
  const byCode = new Map<string, CanonicalCareProcedureRow>();

  ENTERPRISE_PROCEDURE_CATALOG.forEach((entry, index) => {
    byCode.set(entry.id, rowFromEnterprise(entry, index + 1));
  });

  for (const [legacyCode, canonicalCode] of Object.entries(CANONICAL_CARE_PROCEDURE_DEPRECATED_BY_CODE)) {
    const legacy = byCode.get(legacyCode);
    const canonical = byCode.get(canonicalCode);
    if (legacy && canonical) {
      canonical.aliases = [...new Set([...canonical.aliases, ...legacy.aliases, legacy.displayNameEn.toLowerCase()])];
    }
  }

  CANONICAL_CARE_PROCEDURE_EXTENSIONS.forEach((row, index) => {
    if (byCode.has(row.code)) return;
    byCode.set(row.code, { ...row, sortPriority: 200 + index });
  });

  for (const row of observationTemplateRows()) {
    if (byCode.has(row.code)) continue;
    byCode.set(row.code, row);
  }

  WAVE1_STAFF_ORDER_NEW_ROWS.forEach((row, index) => {
    if (byCode.has(row.code)) return;
    const requiresProvider =
      PROVIDER_ONLY_CODES.has(row.code) || row.requiresProviderOrder || row.executionRoleCategory === "PROVIDER";
    byCode.set(row.code, {
      ...row,
      requiresProviderOrder: requiresProvider,
      nursingProtocolAllowed: !requiresProvider,
      sortPriority: 300 + index,
    });
  });

  for (const merge of WAVE1_STAFF_ORDER_ALIAS_MERGES) {
    const canonical = byCode.get(merge.canonicalCode);
    if (!canonical) continue;
    canonical.aliases = [
      ...new Set([
        ...canonical.aliases,
        ...merge.aliases.map((alias) => alias.trim()).filter(Boolean),
      ]),
    ];
  }

  return [...byCode.values()].sort((a, b) => a.sortPriority - b.sortPriority || a.code.localeCompare(b.code));
}

export const CANONICAL_CARE_PROCEDURE_CATALOG: CanonicalCareProcedureRow[] = buildCanonicalCareProcedureCatalog();

export const CANONICAL_CARE_PROCEDURE_EXPECTED_COUNT = CANONICAL_CARE_PROCEDURE_CATALOG.length;

export function canonicalCareProcedureByCode(code: string): CanonicalCareProcedureRow | undefined {
  return CANONICAL_CARE_PROCEDURE_CATALOG.find((row) => row.code === code.trim());
}

export function activeCanonicalCareProcedureCatalog(): CanonicalCareProcedureRow[] {
  return CANONICAL_CARE_PROCEDURE_CATALOG.filter((row) => row.isActive && row.orderable);
}

export function buildCanonicalCareProcedureDuplicateReport(): {
  mergedPairs: Array<{ canonicalCode: string; mergedFrom: string; reason: string }>;
} {
  return {
    mergedPairs: [
      ...Object.entries(CANONICAL_CARE_PROCEDURE_DEPRECATED_BY_CODE).map(([legacy, canonical]) => ({
        canonicalCode: canonical,
        mergedFrom: legacy,
        reason: "DEPRECATED_BY_CANONICAL_CODE",
      })),
      ...WAVE1_STAFF_ORDER_DEDUP_REPORT.map((entry) => ({
        canonicalCode: entry.canonicalCode,
        mergedFrom: entry.mergedFrom,
        reason: entry.reason,
      })),
    ],
  };
}

export function buildCanonicalCareProcedureCategoryReport(): Record<CanonicalCareProcedureCategory, number> {
  const report = Object.fromEntries(
    CANONICAL_CARE_PROCEDURE_CATEGORIES.map((c) => [c, 0])
  ) as Record<CanonicalCareProcedureCategory, number>;
  for (const row of activeCanonicalCareProcedureCatalog()) {
    report[row.category] += 1;
  }
  return report;
}
