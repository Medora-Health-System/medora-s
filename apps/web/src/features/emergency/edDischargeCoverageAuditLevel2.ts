/**
 * MEDUI.ED.DISCHARGE.DIAGNOSIS_INSTRUCTIONS.2A — CoverageAuditLevel2
 *
 * Audits every diagnosis record available to the ED diagnosis picker in-repo:
 * - Dev ICD-10 sample CSV (repo-bound catalog loaded into `Icd10DiagnosisCode`)
 * - Patient-chart quick picks (`COMMON_DIAGNOSES`) — supplemental, not primary ED picker
 *
 * Production deployments may import the full CMS ICD-10 catalog into the same table;
 * that full set is environment-dependent and not shipped in this repository.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateMatchLevel,
} from "./providerDischargeTemplateRegistry";

export type EdDiagnosisPickerSource =
  | "icd10_dev_sample_csv"
  | "icd10_api_search_catalog"
  | "patient_chart_quick_pick"
  | "manual_non_catalog";

/** How the ED diagnosis tab resolves options at runtime. */
export type EdDiagnosisPickerModel =
  | "hybrid_api_search_and_manual"
  | "quick_pick_only"
  | "full_icd_catalog"
  | "sample_icd_catalog";

export type CoverageAuditLevel2Row = {
  icd10: string;
  diagnosis: string;
  pickerSource: EdDiagnosisPickerSource;
  templateId: string;
  templateMatch: ProviderDischargeTemplateMatchLevel;
  hasDiagnosisSpecificTemplate: boolean;
  genericFallbackOnly: boolean;
  edRelevance: "high" | "medium" | "low";
  recommendedAction: string;
};

export type CoverageAuditLevel2Summary = {
  pickerModel: EdDiagnosisPickerModel;
  pickerModelNotes: string[];
  totalPickerRecordsAudited: number;
  totalDiagnosisSpecificMapped: number;
  totalGenericFallbackOnly: number;
  totalUnresolvable: number;
  devIcdSampleRowCount: number;
  patientChartQuickPickCount: number;
};

export type CoverageAuditLevel2Result = {
  summary: CoverageAuditLevel2Summary;
  rows: CoverageAuditLevel2Row[];
  topGenericFallback: CoverageAuditLevel2Row[];
};

const ICD_DEV_SAMPLE_FILENAME = "icd10-cm-sample-dev.csv";

function resolveIcdDevSampleCsvPath(): string | null {
  const candidates = [
    join(process.cwd(), "apps/api/prisma/data", ICD_DEV_SAMPLE_FILENAME),
    join(process.cwd(), "../api/prisma/data", ICD_DEV_SAMPLE_FILENAME),
    join(process.cwd(), "../../api/prisma/data", ICD_DEV_SAMPLE_FILENAME),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function loadIcd10DevSampleCatalog(): Array<{ code: string; label: string; edRelevance: "high" | "medium" | "low" }> {
  const path = resolveIcdDevSampleCsvPath();
  if (!path) return [];
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const codeIdx = header.indexOf("code");
  const shortIdx = header.indexOf("short_description");
  const longIdx = header.indexOf("long_description");
  const out: Array<{ code: string; label: string; edRelevance: "high" | "medium" | "low" }> = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const code = cols[codeIdx >= 0 ? codeIdx : 0]?.trim() ?? "";
    if (!code) continue;
    const shortDesc = cols[shortIdx >= 0 ? shortIdx : 1]?.trim() ?? "";
    const longDesc = cols[longIdx >= 0 ? longIdx : 2]?.trim() ?? "";
    const blob = `${shortDesc} ${longDesc}`.toLowerCase();
    const edRelevance: "high" | "medium" | "low" =
      blob.includes("er core") || blob.includes("emergency") ? "high"
      : blob.includes("medora dev sample") ? "medium"
      : "low";
    out.push({ code, label: shortDesc || code, edRelevance });
  }
  return out;
}

export function describeEdDiagnosisPickerModel(): {
  pickerModel: EdDiagnosisPickerModel;
  notes: string[];
} {
  const devRows = loadIcd10DevSampleCatalog();
  return {
    pickerModel: "hybrid_api_search_and_manual",
    notes: [
      "ED diagnosis tab uses Icd10DiagnosisEntryPanel: API search against Icd10DiagnosisCode (GET /terminology/icd10/search) plus explicit manual non-catalog entry.",
      "COMMON_DIAGNOSES quick picks appear on the patient chart modal only — not the ED EncounterDiagnosticsPanel search.",
      `Repo ships ${devRows.length} ICD-10 dev sample rows (${ICD_DEV_SAMPLE_FILENAME}); production may import the full CMS catalog into the same table.`,
      "Discharge template resolution uses ICD code + encounter diagnosis label via resolveProviderDischargeTemplateForDiagnosis (exact → family → keyword → generic).",
    ],
  };
}

function auditRow(
  code: string,
  label: string,
  pickerSource: EdDiagnosisPickerSource,
  edRelevance: "high" | "medium" | "low"
): CoverageAuditLevel2Row {
  const trimmedCode = code.trim();
  const trimmedLabel = label.trim();
  if (!trimmedCode && !trimmedLabel) {
    return {
      icd10: trimmedCode,
      diagnosis: trimmedLabel,
      pickerSource,
      templateId: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
      templateMatch: "generic",
      hasDiagnosisSpecificTemplate: false,
      genericFallbackOnly: true,
      edRelevance,
      recommendedAction: "MISSING_CODE_OR_LABEL — cannot resolve template",
    };
  }
  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: trimmedCode,
    displayName: trimmedLabel,
  });
  const specific = resolved.template.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID;
  return {
    icd10: trimmedCode,
    diagnosis: trimmedLabel,
    pickerSource,
    templateId: resolved.template.id,
    templateMatch: resolved.matchLevel,
    hasDiagnosisSpecificTemplate: specific,
    genericFallbackOnly: !specific,
    edRelevance,
    recommendedAction: specific ? "OK — diagnosis-specific template" : "GENERIC_FALLBACK — add mapping if clinically common in ED",
  };
}

/** Union of dev ICD sample + patient-chart quick picks (deduped by normalized code). */
export function buildCoverageAuditLevel2PickerUnion(): Array<{
  code: string;
  label: string;
  pickerSource: EdDiagnosisPickerSource;
  edRelevance: "high" | "medium" | "low";
}> {
  const seen = new Set<string>();
  const merged: Array<{
    code: string;
    label: string;
    pickerSource: EdDiagnosisPickerSource;
    edRelevance: "high" | "medium" | "low";
  }> = [];
  for (const row of loadIcd10DevSampleCatalog()) {
    const key = row.code.trim().toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      code: row.code,
      label: row.label,
      pickerSource: "icd10_dev_sample_csv",
      edRelevance: row.edRelevance,
    });
  }
  for (const row of COMMON_DIAGNOSES) {
    const key = row.code.trim().toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      code: row.code,
      label: row.label,
      pickerSource: "patient_chart_quick_pick",
      edRelevance: "medium",
    });
  }
  return merged;
}

export function runCoverageAuditLevel2(): CoverageAuditLevel2Result {
  const picker = describeEdDiagnosisPickerModel();
  const union = buildCoverageAuditLevel2PickerUnion();
  const rows = union.map((entry) =>
    auditRow(entry.code, entry.label, entry.pickerSource, entry.edRelevance)
  );
  const totalDiagnosisSpecificMapped = rows.filter((r) => r.hasDiagnosisSpecificTemplate).length;
  const totalGenericFallbackOnly = rows.filter((r) => r.genericFallbackOnly && r.recommendedAction.startsWith("GENERIC")).length;
  const totalUnresolvable = rows.filter((r) => r.recommendedAction.startsWith("MISSING")).length;

  const topGenericFallback = rows
    .filter((r) => r.genericFallbackOnly)
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.edRelevance] - rank[b.edRelevance] || a.icd10.localeCompare(b.icd10);
    })
    .slice(0, 100);

  return {
    summary: {
      pickerModel: picker.pickerModel,
      pickerModelNotes: picker.notes,
      totalPickerRecordsAudited: rows.length,
      totalDiagnosisSpecificMapped,
      totalGenericFallbackOnly,
      totalUnresolvable,
      devIcdSampleRowCount: loadIcd10DevSampleCatalog().length,
      patientChartQuickPickCount: COMMON_DIAGNOSES.length,
    },
    rows,
    topGenericFallback,
  };
}

export function getTop100GenericFallbackDiagnoses(): CoverageAuditLevel2Row[] {
  return runCoverageAuditLevel2().topGenericFallback;
}
