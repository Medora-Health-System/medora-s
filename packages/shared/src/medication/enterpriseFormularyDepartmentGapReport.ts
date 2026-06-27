/**
 * MEDUI.MEDS.ENTERPRISE_FORMULARY_GAP_REPORT.1
 * Department-level essential medication readiness audit.
 * Audit-only — does not activate medications or change catalog content.
 */

import {
  buildEnterpriseMedicationInventoryReport,
  resetEnterpriseFormularyGapAnalysisCaches,
  type EnterpriseMedicationInventoryRow,
} from "./enterpriseFormularyGapAnalysis.js";
import { prewarmProviderOrderableCatalogCodesRegistry } from "./providerOrderableCatalogCodesRegistry.js";

export type DepartmentGapAuditDepartment =
  | "Emergency Department"
  | "ICU / Critical Care"
  | "Pediatrics"
  | "Medical-Surgical"
  | "Orthopedics"
  | "OBGYN"
  | "Anesthesia / procedural sedation"
  | "Cardiology / ACLS"
  | "Infectious disease / antibiotics"
  | "Electrolytes / fluids";

export type EssentialMedicationReadinessStatus =
  | "PRESENT_AND_ORDERABLE_AND_MAR_READY"
  | "PRESENT_BUT_NOT_PROVIDER_ORDERABLE"
  | "PROVIDER_ORDERABLE_BUT_NOT_MAR_READY"
  | "MISSING_FROM_CATALOG"
  | "PRESENT_BUT_ROUTE_OR_DOSE_INCOMPLETE";

export type DepartmentEssentialMedication = {
  label: string;
  route: string;
  tokens: string[];
  strengthTokens?: string[];
  excludeTokens?: string[];
};

export type DepartmentEssentialReadinessRow = {
  department: DepartmentGapAuditDepartment;
  medication: string;
  expectedRoute: string;
  status: EssentialMedicationReadinessStatus;
  matchedCatalogCodes: string[];
};

export type EnterpriseFormularyGapAuditReport = {
  ticket: "MEDUI.MEDS.ENTERPRISE_FORMULARY_GAP_REPORT.1";
  generatedAt: string;
  totalUnifiedCatalogMedications: number;
  providerOrderableMedications: number;
  marReadyMedications: number;
  presentButNotProviderOrderable: number;
  providerOrderableButNotMarReady: number;
  missingEssentialMedications: number;
};

export type DepartmentReadinessMatrix = {
  departments: DepartmentGapAuditDepartment[];
  rows: DepartmentEssentialReadinessRow[];
  summaryByDepartment: Record<
    DepartmentGapAuditDepartment,
    Record<EssentialMedicationReadinessStatus, number>
  >;
};

export type EssentialMedicationListReport = {
  kind: "MissingEssentialMedicationList" | "PresentButNotOrderableList" | "OrderableButNotMarReadyList" | "RouteOrDoseIncompleteList";
  rows: DepartmentEssentialReadinessRow[];
};

export type HighPrioritySupplementRecommendation = {
  rank: number;
  department: DepartmentGapAuditDepartment;
  medication: string;
  status: EssentialMedicationReadinessStatus;
  rationale: string;
};

export type PotassiumPoVerificationRow = {
  medication: string;
  status: EssentialMedicationReadinessStatus;
  matchedCatalogCodes: string[];
};

export type PotassiumPoVerificationReport = {
  rows: PotassiumPoVerificationRow[];
  po20MeqReady: boolean;
  po40MeqReady: boolean;
};

export type EnterpriseFormularyGapTestResultsReport = {
  enterpriseFormularyGapAnalysisTests: "NOT_RUN" | "PASS" | "FAIL";
  enterpriseFormularyDepartmentGapTests: "NOT_RUN" | "PASS" | "FAIL";
  notes: string[];
};

export type FormularyGapReportFinalDecision =
  | "FORMULARY_GAP_REPORT_COMPLETE"
  | "FORMULARY_GAP_REPORT_BLOCKED";

export type EnterpriseFormularyDepartmentGapAuditBundle = {
  EnterpriseFormularyGapAuditReport: EnterpriseFormularyGapAuditReport;
  DepartmentReadinessMatrix: DepartmentReadinessMatrix;
  MissingEssentialMedicationList: EssentialMedicationListReport;
  PresentButNotOrderableList: EssentialMedicationListReport;
  OrderableButNotMarReadyList: EssentialMedicationListReport;
  RouteOrDoseIncompleteList: EssentialMedicationListReport;
  HighPrioritySupplementRecommendation: { rows: HighPrioritySupplementRecommendation[] };
  PotassiumPoVerificationReport: PotassiumPoVerificationReport;
  TestResultsReport: EnterpriseFormularyGapTestResultsReport;
  FinalDecision: FormularyGapReportFinalDecision;
};

function essential(
  label: string,
  route: string,
  tokens: string[],
  strengthTokens?: string[],
  excludeTokens?: string[]
): DepartmentEssentialMedication {
  return { label, route, tokens, strengthTokens, excludeTokens };
}

export const DEPARTMENT_ESSENTIAL_MEDICATIONS: Record<
  DepartmentGapAuditDepartment,
  readonly DepartmentEssentialMedication[]
> = {
  "Electrolytes / fluids": [
    essential("Potassium chloride PO 20 mEq", "PO", ["potassium chloride", "potassium"], ["20 meq", "20meq"]),
    essential("Potassium chloride PO 40 mEq", "PO", ["potassium chloride", "potassium"], ["40 meq", "40meq"]),
    essential("Potassium chloride IV replacement", "IV", ["potassium chloride", "potassium"], ["intraveineuse", "perfusion", "injectable"], ["comprime", "orale", "oral", "phosphate"]),
    essential("Magnesium sulfate IV", "IV", ["magnesium sulfate", "magnesium"], ["intraveineuse", "iv", "perfusion"]),
    essential("Calcium gluconate IV", "IV", ["calcium gluconate", "calcium"], ["intraveineuse", "iv"]),
    essential("Sodium bicarbonate IV", "IV", ["sodium bicarbonate", "bicarbonate"], ["intraveineuse", "iv"]),
    essential("Sodium chloride 0.9%", "IV", ["sodium chloride 0.9", "nacl 0.9", "chlorure de sodium 0.9", "normal saline", "saline 0.9"]),
    essential("Lactated Ringers", "IV", ["lactated ringer", "ringer lactate", "lactate ringer"]),
    essential("Dextrose fluids", "IV", ["dextrose", "dextrose 5", "d5w", "glucose"]),
    essential("Hypertonic saline", "IV", ["hypertonic saline", "saline hypertonique", "nacl 3", "3% sodium"]),
  ],
  "Emergency Department": [
    essential("Epinephrine", "IV/IM", ["epinephrine", "adrenaline"], undefined, ["norepinephrine", "racemic"]),
    essential("Atropine", "IV", ["atropine"]),
    essential("Adenosine", "IV", ["adenosine"]),
    essential("Amiodarone", "IV", ["amiodarone"]),
    essential("Lidocaine", "IV", ["lidocaine"]),
    essential("Naloxone", "IV/IM", ["naloxone"]),
    essential("Dextrose 50", "IV", ["dextrose 50", "d50", "dextrose 50%", "glucose 50"]),
    essential("Glucagon", "IM/IV", ["glucagon"]),
    essential("Aspirin", "PO", ["aspirin", "acide acetylsalicylique"]),
    essential("Nitroglycerin", "SL/IV", ["nitroglycerin", "nitroglycerine", "trinitrine"]),
    essential("Tranexamic acid", "IV", ["tranexamic"]),
  ],
  "ICU / Critical Care": [
    essential("Norepinephrine", "IV infusion", ["norepinephrine", "levophed"]),
    essential("Epinephrine infusion", "IV infusion", ["epinephrine", "adrenaline"], ["perfusion", "infusion"], ["norepinephrine", "racemic"]),
    essential("Vasopressin", "IV infusion", ["vasopressin"]),
    essential("Phenylephrine", "IV infusion", ["phenylephrine"]),
    essential("Dobutamine", "IV infusion", ["dobutamine"]),
    essential("Dopamine", "IV infusion", ["dopamine"]),
    essential("Propofol", "IV infusion", ["propofol"]),
    essential("Dexmedetomidine", "IV infusion", ["dexmedetomidine", "precedex"]),
    essential("Midazolam infusion", "IV infusion", ["midazolam"], ["perfusion", "infusion"]),
    essential("Fentanyl infusion", "IV infusion", ["fentanyl"], ["perfusion", "infusion"]),
    essential("Heparin infusion", "IV infusion", ["heparin"], ["perfusion", "infusion"]),
    essential("Insulin infusion", "IV infusion", ["insulin"], ["perfusion", "infusion"]),
    essential("Nicardipine infusion", "IV infusion", ["nicardipine", "cardene"]),
    essential("Nitroglycerin infusion", "IV infusion", ["nitroglycerin", "nitroglycerine"], ["perfusion", "infusion"]),
  ],
  Pediatrics: [
    essential("Acetaminophen liquid", "PO", ["acetaminophen", "paracetamol"], ["liquid", "suspension", "sirop", "oral"]),
    essential("Ibuprofen liquid", "PO", ["ibuprofen"], ["liquid", "suspension", "sirop", "oral"]),
    essential("Ondansetron ODT/liquid", "PO", ["ondansetron"], ["odt", "orodispers", "liquid", "suspension", "sirop"]),
    essential("Albuterol neb", "Inhaled", ["albuterol", "salbutamol"], ["inhal", "neb"]),
    essential("Epinephrine IM", "IM", ["epinephrine", "adrenaline"], ["intramusculaire", "im"], ["norepinephrine", "racemic"]),
    essential("Ceftriaxone", "IV/IM", ["ceftriaxone"]),
    essential("Amoxicillin", "PO", ["amoxicillin"], ["orale", "oral", "suspension", "sirop"]),
    essential("Dexamethasone", "PO/IV", ["dexamethasone"]),
    essential("Normal saline bolus", "IV", ["sodium chloride 0.9", "normal saline", "chlorure de sodium 0.9", "nacl 0.9"]),
  ],
  "Medical-Surgical": [
    essential("Enoxaparin", "SQ", ["enoxaparin"], ["sous-cutan", "subcutaneous"]),
    essential("Heparin SQ", "SQ", ["heparin"], ["sous-cutan", "subcutaneous"]),
    essential("Insulin lispro", "SQ", ["insulin lispro", "lispro"]),
    essential("Insulin glargine", "SQ", ["insulin glargine", "glargine"]),
    essential("Metformin", "PO", ["metformin"]),
    essential("Pantoprazole", "PO/IV", ["pantoprazole"]),
    essential("Ondansetron", "IV/PO", ["ondansetron"]),
    essential("Acetaminophen", "PO/IV", ["acetaminophen", "paracetamol"]),
    essential("Hydrocodone/APAP", "PO", ["hydrocodone"]),
    essential("Oxycodone", "PO", ["oxycodone"]),
    essential("Bowel regimen meds", "PO", ["polyethylene glycol", "senna", "bisacodyl", "docusate", "lactulose"]),
  ],
  Orthopedics: [
    essential("Ketorolac", "IV/IM", ["ketorolac"]),
    essential("Acetaminophen", "PO/IV", ["acetaminophen", "paracetamol"]),
    essential("Oxycodone", "PO", ["oxycodone"]),
    essential("Hydromorphone", "IV/PO", ["hydromorphone"]),
    essential("Morphine", "IV/PO", ["morphine"]),
    essential("Cyclobenzaprine", "PO", ["cyclobenzaprine"]),
    essential("Methocarbamol", "PO", ["methocarbamol"]),
    essential("Enoxaparin", "SQ", ["enoxaparin"]),
    essential("Cefazolin", "IV", ["cefazolin"]),
  ],
  OBGYN: [
    essential("Oxytocin", "IV/IM", ["oxytocin", "pitocin"]),
    essential("Magnesium sulfate", "IV", ["magnesium sulfate", "magnesium"]),
    essential("Misoprostol", "PO/PR", ["misoprostol", "cytotec"]),
    essential("Methylergonovine", "IM/PO", ["methylergonovine", "methergine"]),
    essential("Carboprost", "IM", ["carboprost", "hemabate"]),
    essential("Tranexamic acid", "IV", ["tranexamic"]),
    essential("Rh immune globulin", "IM", ["rh immune", "rho(d)", "anti-d", "winrho", "rhogam"]),
    essential("Betamethasone", "IM", ["betamethasone"]),
    essential("Terbutaline", "SQ/IV", ["terbutaline"]),
    essential("Cefazolin", "IV", ["cefazolin"]),
    essential("Ampicillin", "IV", ["ampicillin"]),
    essential("Gentamicin", "IV/IM", ["gentamicin"]),
  ],
  "Anesthesia / procedural sedation": [
    essential("Propofol", "IV", ["propofol"]),
    essential("Midazolam", "IV", ["midazolam"]),
    essential("Fentanyl", "IV", ["fentanyl"]),
    essential("Ketamine", "IV/IM", ["ketamine"]),
    essential("Rocuronium", "IV", ["rocuronium"]),
    essential("Succinylcholine", "IV", ["succinylcholine"]),
    essential("Etomidate", "IV", ["etomidate"]),
    essential("Lidocaine", "IV", ["lidocaine"]),
    essential("Ondansetron", "IV", ["ondansetron"]),
  ],
  "Cardiology / ACLS": [
    essential("Epinephrine", "IV", ["epinephrine", "adrenaline"], undefined, ["norepinephrine", "racemic"]),
    essential("Atropine", "IV", ["atropine"]),
    essential("Adenosine", "IV", ["adenosine"]),
    essential("Amiodarone", "IV", ["amiodarone"]),
    essential("Lidocaine", "IV", ["lidocaine"]),
    essential("Labetalol IV", "IV", ["labetalol"]),
    essential("Nicardipine IV", "IV", ["nicardipine", "cardene"]),
    essential("Nitroglycerin", "SL/IV", ["nitroglycerin", "nitroglycerine"]),
    essential("Dobutamine", "IV infusion", ["dobutamine"]),
    essential("Aspirin", "PO", ["aspirin", "acide acetylsalicylique"]),
  ],
  "Infectious disease / antibiotics": [
    essential("Vancomycin IV", "IV", ["vancomycin"]),
    essential("Ceftriaxone", "IV/IM", ["ceftriaxone"]),
    essential("Piperacillin-tazobactam", "IV", ["piperacillin", "tazobactam", "zosyn"]),
    essential("Meropenem", "IV", ["meropenem"]),
    essential("Cefepime", "IV", ["cefepime"]),
    essential("Metronidazole", "IV/PO", ["metronidazole"]),
    essential("Azithromycin", "IV/PO", ["azithromycin"]),
    essential("Clindamycin", "IV/PO", ["clindamycin"]),
    essential("Trimethoprim-sulfamethoxazole", "IV/PO", ["trimethoprim", "sulfamethoxazole", "bactrim"]),
    essential("Ampicillin-sulbactam", "IV", ["ampicillin", "sulbactam", "unasyn"]),
  ],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function inventoryBlob(row: EnterpriseMedicationInventoryRow): string {
  return normalize([row.catalogCode, row.displayNameEn, row.displayNameFr, row.route, row.form, row.canonicalFamily].join(" "));
}

function routeTokens(routeSpec: string): string[] {
  return routeSpec
    .split(/[/,\s]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

const ROUTE_SYNONYMS: Record<string, readonly string[]> = {
  po: ["orale", "oral", "po", "comprime", "gelule", "suspension", "sirop", "capsule", "tablet"],
  iv: ["intraveineuse", "intravenous", " iv ", "perfusion", "infusion", "bolus"],
  im: ["intramusculaire", "intramuscular", " im "],
  sq: ["sous-cutan", "subcutaneous", " sc "],
  sl: ["sublingual", "sublinguale"],
  pr: ["rectal", "rectale", "suppository"],
  inhaled: ["inhal", "neb", "nebul"],
  infusion: ["perfusion", "infusion", "drip"],
};

function rowMatchesRouteSpec(routeSpec: string, blob: string): boolean {
  const tokens = routeTokens(routeSpec);
  if (tokens.length === 0) return true;
  return tokens.some((token) => {
    const synonyms = ROUTE_SYNONYMS[token] ?? [token];
    return synonyms.some((synonym) => blob.includes(normalize(synonym)));
  });
}

function rowMatchesStrengthTokens(strengthTokens: readonly string[] | undefined, blob: string): boolean {
  if (!strengthTokens || strengthTokens.length === 0) return true;
  return strengthTokens.some((token) => blob.includes(normalize(token)));
}

function findEssentialMatches(
  essentialMed: DepartmentEssentialMedication,
  inventoryRows: EnterpriseMedicationInventoryRow[]
): EnterpriseMedicationInventoryRow[] {
  return inventoryRows.filter((row) => {
    const blob = inventoryBlob(row);
    if (essentialMed.excludeTokens?.some((token) => blob.includes(normalize(token)))) return false;
    return essentialMed.tokens.some((token) => blob.includes(normalize(token)));
  });
}

function classifyEssentialMedication(
  department: DepartmentGapAuditDepartment,
  essentialMed: DepartmentEssentialMedication,
  inventoryRows: EnterpriseMedicationInventoryRow[]
): DepartmentEssentialReadinessRow {
  const matches = findEssentialMatches(essentialMed, inventoryRows);
  const matchedCatalogCodes = matches.map((row) => row.catalogCode);

  if (matches.length === 0) {
    return {
      department,
      medication: essentialMed.label,
      expectedRoute: essentialMed.route,
      status: "MISSING_FROM_CATALOG",
      matchedCatalogCodes,
    };
  }

  const orderableMatches = matches.filter((row) => row.providerOrderable);
  if (orderableMatches.length === 0) {
    return {
      department,
      medication: essentialMed.label,
      expectedRoute: essentialMed.route,
      status: "PRESENT_BUT_NOT_PROVIDER_ORDERABLE",
      matchedCatalogCodes,
    };
  }

  const marReadyOrderable = orderableMatches.filter((row) => row.MARReady);
  if (marReadyOrderable.length === 0) {
    return {
      department,
      medication: essentialMed.label,
      expectedRoute: essentialMed.route,
      status: "PROVIDER_ORDERABLE_BUT_NOT_MAR_READY",
      matchedCatalogCodes,
    };
  }

  const routeAndDoseReady = marReadyOrderable.filter((row) => {
    const blob = inventoryBlob(row);
    return rowMatchesRouteSpec(essentialMed.route, blob) && rowMatchesStrengthTokens(essentialMed.strengthTokens, blob);
  });

  if (routeAndDoseReady.length === 0) {
    return {
      department,
      medication: essentialMed.label,
      expectedRoute: essentialMed.route,
      status: "PRESENT_BUT_ROUTE_OR_DOSE_INCOMPLETE",
      matchedCatalogCodes,
    };
  }

  return {
    department,
    medication: essentialMed.label,
    expectedRoute: essentialMed.route,
    status: "PRESENT_AND_ORDERABLE_AND_MAR_READY",
    matchedCatalogCodes: routeAndDoseReady.map((row) => row.catalogCode),
  };
}

function emptyStatusCounts(): Record<EssentialMedicationReadinessStatus, number> {
  return {
    PRESENT_AND_ORDERABLE_AND_MAR_READY: 0,
    PRESENT_BUT_NOT_PROVIDER_ORDERABLE: 0,
    PROVIDER_ORDERABLE_BUT_NOT_MAR_READY: 0,
    MISSING_FROM_CATALOG: 0,
    PRESENT_BUT_ROUTE_OR_DOSE_INCOMPLETE: 0,
  };
}

export function buildDepartmentReadinessMatrix(): DepartmentReadinessMatrix {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const departments = Object.keys(DEPARTMENT_ESSENTIAL_MEDICATIONS) as DepartmentGapAuditDepartment[];
  const rows = departments.flatMap((department) =>
    DEPARTMENT_ESSENTIAL_MEDICATIONS[department].map((essentialMed) =>
      classifyEssentialMedication(department, essentialMed, inventory.rows)
    )
  );
  const summaryByDepartment = {} as DepartmentReadinessMatrix["summaryByDepartment"];
  for (const department of departments) {
    summaryByDepartment[department] = emptyStatusCounts();
  }
  for (const row of rows) {
    summaryByDepartment[row.department][row.status] += 1;
  }
  return { departments, rows, summaryByDepartment };
}

export function buildEnterpriseFormularyGapAuditReport(): EnterpriseFormularyGapAuditReport {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const matrix = buildDepartmentReadinessMatrix();
  const presentButNotProviderOrderable = inventory.rows.filter(
    (row) => !row.providerOrderable
  ).length;
  const providerOrderableButNotMarReady = inventory.rows.filter(
    (row) => row.providerOrderable && !row.MARReady
  ).length;
  const missingEssentialMedications = matrix.rows.filter(
    (row) => row.status === "MISSING_FROM_CATALOG"
  ).length;

  return {
    ticket: "MEDUI.MEDS.ENTERPRISE_FORMULARY_GAP_REPORT.1",
    generatedAt: new Date().toISOString(),
    totalUnifiedCatalogMedications: inventory.totalCatalogRows,
    providerOrderableMedications: inventory.totalProviderOrderableRows,
    marReadyMedications: inventory.rows.filter((row) => row.MARReady).length,
    presentButNotProviderOrderable,
    providerOrderableButNotMarReady,
    missingEssentialMedications,
  };
}

function listByStatus(
  kind: EssentialMedicationListReport["kind"],
  status: EssentialMedicationReadinessStatus,
  rows: DepartmentEssentialReadinessRow[]
): EssentialMedicationListReport {
  return { kind, rows: rows.filter((row) => row.status === status) };
}

export function buildHighPrioritySupplementRecommendations(
  rows: DepartmentEssentialReadinessRow[]
): HighPrioritySupplementRecommendation[] {
  const priority: EssentialMedicationReadinessStatus[] = [
    "MISSING_FROM_CATALOG",
    "PRESENT_BUT_NOT_PROVIDER_ORDERABLE",
    "PROVIDER_ORDERABLE_BUT_NOT_MAR_READY",
    "PRESENT_BUT_ROUTE_OR_DOSE_INCOMPLETE",
  ];
  const rationaleByStatus: Record<EssentialMedicationReadinessStatus, string> = {
    MISSING_FROM_CATALOG: "Essential medication absent from unified catalog.",
    PRESENT_BUT_NOT_PROVIDER_ORDERABLE: "Catalog row exists but provider ordering activation is missing.",
    PROVIDER_ORDERABLE_BUT_NOT_MAR_READY: "Provider ordering enabled but MAR workflow is not ready.",
    PRESENT_BUT_ROUTE_OR_DOSE_INCOMPLETE: "Present and partially ready but route or dose strength does not meet department spec.",
    PRESENT_AND_ORDERABLE_AND_MAR_READY: "Already ready.",
  };
  return rows
    .filter((row) => row.status !== "PRESENT_AND_ORDERABLE_AND_MAR_READY")
    .sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status) || a.department.localeCompare(b.department))
    .slice(0, 25)
    .map((row, index) => ({
      rank: index + 1,
      department: row.department,
      medication: row.medication,
      status: row.status,
      rationale: rationaleByStatus[row.status],
    }));
}

export function buildPotassiumPoVerificationReport(): PotassiumPoVerificationReport {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const electrolyteEssentials = DEPARTMENT_ESSENTIAL_MEDICATIONS["Electrolytes / fluids"].filter((med) =>
    med.label.includes("Potassium chloride PO")
  );
  const rows = electrolyteEssentials.map((essentialMed) => {
    const classified = classifyEssentialMedication("Electrolytes / fluids", essentialMed, inventory.rows);
    return {
      medication: essentialMed.label,
      status: classified.status,
      matchedCatalogCodes: classified.matchedCatalogCodes,
    };
  });
  return {
    rows,
    po20MeqReady: rows.some((row) => row.medication.includes("20 mEq") && row.status === "PRESENT_AND_ORDERABLE_AND_MAR_READY"),
    po40MeqReady: rows.some((row) => row.medication.includes("40 mEq") && row.status === "PRESENT_AND_ORDERABLE_AND_MAR_READY"),
  };
}

export function runEnterpriseFormularyDepartmentGapAudit(input?: {
  testResults?: EnterpriseFormularyGapTestResultsReport;
}): EnterpriseFormularyDepartmentGapAuditBundle {
  resetEnterpriseFormularyGapAnalysisCaches();
  prewarmProviderOrderableCatalogCodesRegistry();

  const matrix = buildDepartmentReadinessMatrix();
  const audit = buildEnterpriseFormularyGapAuditReport();

  return {
    EnterpriseFormularyGapAuditReport: audit,
    DepartmentReadinessMatrix: matrix,
    MissingEssentialMedicationList: listByStatus("MissingEssentialMedicationList", "MISSING_FROM_CATALOG", matrix.rows),
    PresentButNotOrderableList: listByStatus(
      "PresentButNotOrderableList",
      "PRESENT_BUT_NOT_PROVIDER_ORDERABLE",
      matrix.rows
    ),
    OrderableButNotMarReadyList: listByStatus(
      "OrderableButNotMarReadyList",
      "PROVIDER_ORDERABLE_BUT_NOT_MAR_READY",
      matrix.rows
    ),
    RouteOrDoseIncompleteList: listByStatus(
      "RouteOrDoseIncompleteList",
      "PRESENT_BUT_ROUTE_OR_DOSE_INCOMPLETE",
      matrix.rows
    ),
    HighPrioritySupplementRecommendation: {
      rows: buildHighPrioritySupplementRecommendations(matrix.rows),
    },
    PotassiumPoVerificationReport: buildPotassiumPoVerificationReport(),
    TestResultsReport: input?.testResults ?? {
      enterpriseFormularyGapAnalysisTests: "NOT_RUN",
      enterpriseFormularyDepartmentGapTests: "NOT_RUN",
      notes: [],
    },
    FinalDecision: "FORMULARY_GAP_REPORT_COMPLETE",
  };
}
