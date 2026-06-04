/**
 * M1.7C.2 — High-alert density review (recommendations only; no auto-downgrade).
 */

import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import type { EnterpriseWave4EdHospitalFormularyEntry } from "./enterpriseWave4EdHospitalTypes.js";

export type Wave4HighAlertDisposition = "APPROPRIATE" | "QUESTIONABLE" | "REMOVE";

export type Wave4HighAlertReviewRow = {
  catalogCode: string;
  genericName: string;
  bucket: string;
  disposition: Wave4HighAlertDisposition;
  rationale: string;
};

function classifyHighAlertEntry(entry: EnterpriseWave4EdHospitalFormularyEntry): Wave4HighAlertReviewRow {
  const g = entry.governance;
  const gn = entry.genericName.toLowerCase();
  const route = entry.route.toLowerCase();
  const form = entry.dosageForm.toLowerCase();

  if (
    g.isInsulin ||
    g.isThrombolytic ||
    g.isRsiParalytic ||
    g.isVasopressor ||
    g.isBloodProduct ||
    g.isContinuousInfusion
  ) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "APPROPRIATE",
      rationale: "Core high-risk ED class (insulin, thrombolytic, paralytic, vasopressor, blood product, or continuous infusion)",
    };
  }

  if (g.isAntidote || g.requiresSpecialtyReview) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "APPROPRIATE",
      rationale: "Antidote or specialty-review medication",
    };
  }

  if (
    (gn.includes("magnesium") || gn.includes("potassium") || gn.includes("calcium")) &&
    route.includes("intraveineuse")
  ) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "APPROPRIATE",
      rationale: "Concentrated electrolyte IV",
    };
  }

  if (
    gn.includes("heparin") ||
    gn.includes("enoxaparin") ||
    gn.includes("bivalirudin") ||
    g.isAnticoagulantInfusion
  ) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "APPROPRIATE",
      rationale: "Anticoagulant therapy",
    };
  }

  if (
    ["fentanyl", "morphine", "hydromorphone", "ketamine", "remifentanil", "alfentanil"].some((t) =>
      gn.includes(t)
    )
  ) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "APPROPRIATE",
      rationale: "High-risk opioid / sedative",
    };
  }

  if (
    ["propofol", "midazolam", "lorazepam", "etomidate", "dexmedetomidine"].some((t) => gn.includes(t))
  ) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "APPROPRIATE",
      rationale: "Sedation / RSI agent",
    };
  }

  if (gn.includes("epinephrine") || gn.includes("norepinephrine") || gn.includes("dopamine")) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "APPROPRIATE",
      rationale: "Vasoactive / resuscitation medication",
    };
  }

  if (form.includes("comprimé") && !g.isControlled && entry.bucket === "ACS_HYPERTENSIVE") {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "QUESTIONABLE",
      rationale: "Oral ACS antiplatelet/antihypertensive — consider informational-only high-alert at activation review",
    };
  }

  if (entry.bucket === "SEPSIS_ANTIBIOTICS" && entry.administrationType === "INFUSION") {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "QUESTIONABLE",
      rationale: "Routine IV antibiotic infusion — high-alert may be excess unless concentration policy requires it",
    };
  }

  if (gn.includes("dexamethasone") && !entry.strength.toLowerCase().includes("peds")) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "QUESTIONABLE",
      rationale: "Single-dose IV steroid — review whether high-alert banner adds value vs noise",
    };
  }

  if (gn.includes("albumin") || gn.includes("dextrose") || gn.includes("sodium chloride")) {
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      bucket: entry.bucket,
      disposition: "QUESTIONABLE",
      rationale: "Maintenance colloid/crystalloid — high-alert flag may be conservative; pharmacy review at activation",
    };
  }

  return {
    catalogCode: entry.catalogCode,
    genericName: entry.genericName,
    bucket: entry.bucket,
    disposition: "APPROPRIATE",
    rationale: "Default ED high-alert conservative flag retained pending pharmacy activation review",
  };
}

export function buildWave4HighAlertReviewReport(): {
  total: number;
  highAlertCount: number;
  appropriate: number;
  questionable: number;
  remove: number;
  rows: Wave4HighAlertReviewRow[];
} {
  const highAlertEntries = ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.filter(
    (e) => e.governance.isHighAlert
  );
  const rows = highAlertEntries.map(classifyHighAlertEntry);
  return {
    total: ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length,
    highAlertCount: highAlertEntries.length,
    appropriate: rows.filter((r) => r.disposition === "APPROPRIATE").length,
    questionable: rows.filter((r) => r.disposition === "QUESTIONABLE").length,
    remove: rows.filter((r) => r.disposition === "REMOVE").length,
    rows,
  };
}
