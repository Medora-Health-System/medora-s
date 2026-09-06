/**
 * MEDUI.TRILANG.DX.P3-F.8-ES — FY2027 Spanish carry-forward + governed gap ingest.
 *
 * STRUCTURAL_CANDIDATE != SEMANTICALLY_CERTIFIED != APPROVED_FOR_INGEST
 *
 * Production artifact (no DB terminology rows required):
 *
 *   pnpm --filter @medora/api run icd:fy2027-es-terminology -- --release=FY2027 --emit-from-sources \
 *     --cie10es=/path/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx \
 *     --fy2026-us=/path/icd10cm-order-2026.txt \
 *     --fy2027-us=/path/icd10cm-order-2027.txt \
 *     --combined-out=/secure/path/medora-p3f8-es-fy2027-combined.jsonl \
 *     --certify-semantics --approve-semantically-certified
 *
 * Local DB ingest (after artifact exists):
 *
 *   pnpm --filter @medora/api run icd:fy2027-es-terminology -- --release=FY2027 --certify-semantics
 *   pnpm --filter @medora/api run icd:fy2027-es-terminology -- --release=FY2027 --approve-semantically-certified --apply-local --dry-run
 *   pnpm --filter @medora/api run icd:fy2027-es-terminology -- --release=FY2027 --approve-semantically-certified --apply-local
 *
 * --approve-structurally-passing cannot write. --apply-local refuses non-localhost DATABASE_URL.
 * Does not mutate FY2026 rows.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  GOVERNED_ICD10_CLINICIAN_LABELS_ES,
  ICD10_CIE10ES_ARTIFACT_SHA256,
  ICD10_CIE10ES_SOURCE_ID,
  ICD10_CIE10ES_TERMINOLOGY_VERSION,
  ICD10_CM_CODE_SYSTEM,
  ICD10_FY2026_ES_GAP_SOURCE_ID,
  ICD10_FY2026_ES_GAP_TERMINOLOGY_VERSION,
  ICD10_FY2027_ES_CARRY_FORWARD_TERMINOLOGY_VERSION,
  ICD10_FY2027_ES_COMBINED_ARTIFACT_SHA256,
  ICD10_FY2027_ES_GAP_SOURCE_ID,
  ICD10_FY2027_ES_GAP_TERMINOLOGY_VERSION,
  ICD10_GOVERNED_SOURCE_ID,
  ICD10_GOVERNED_TERMINOLOGY_VERSION,
  ICD10_SOURCE_PRIORITY,
  buildCie10esFy2026AllowSet,
  certifyFy2027EsGapSemantics,
  decideFy2027EsCarryForward,
  fy2027EsGapIngestGate,
  reviewFy2026EsGapCandidate,
  reviewFy2027EsGapCandidate,
  summarizeFy2027EsCarryForward,
  summarizeFy2027EsGapFamilies,
  summarizeFy2027EsSemantics,
  toFy2027EsSemanticReviewRecord,
  type Fy2027EsCarryForwardDecision,
  type Fy2027EsExistingLabel,
  type Fy2027EsGapReviewRow,
  type Fy2027EsSemanticRow,
} from "@medora/shared";
import { assertLocalCertificationDatabaseUrl } from "./build-fy2026-es-gap-governed";
import { ICD10_CM_FY2026_MANIFEST, ICD10_CM_FY2027_MANIFEST } from "./icd10-cm-release-manifest";
import { importLicensedIcd10Terminology } from "./import-icd10-licensed-terminology";
import { parseIcd10CmReleaseFile } from "./parse-icd10-cm-release";
import { parseSpanishCie10EsXlsx, sha256File } from "./validate-icd10-national-sources";

const DEFAULT_CF_OUT = "/tmp/medora-p3f8-es-fy2027-carry-forward.jsonl";
const DEFAULT_GOVERNED_OUT = "/tmp/medora-p3f8-es-fy2027-governed.jsonl";
const DEFAULT_SEMANTIC_OUT = "/tmp/medora-p3f8-es-fy2027-semantic-matrix.jsonl";
const DEFAULT_COMBINED_OUT = "/tmp/medora-p3f8-es-fy2027-combined.jsonl";
const EXPECTED_FY2027_SELECTABLE = 74879;
const EXPECTED_CARRY_FORWARD = 74685;
const EXPECTED_NEW_OR_CHANGED = 194;

export function parseFy2027EsTerminologyArgs(argv: string[]) {
  let releaseVersion = "";
  let carryForwardOut = DEFAULT_CF_OUT;
  let governedOut = DEFAULT_GOVERNED_OUT;
  let semanticOut = DEFAULT_SEMANTIC_OUT;
  let combinedOut = DEFAULT_COMBINED_OUT;
  let cie10es = "";
  let fy2026Us = "";
  let fy2027Us = "";
  let expectedArtifactSha256 = "";
  let emitFromSources = false;
  let approveStructurallyPassing = false;
  let certifySemantics = false;
  let approveSemanticallyCertified = false;
  let applyLocal = false;
  let dryRun = false;
  let allowSameVersionUpdate = false;
  for (const arg of argv) {
    if (arg === "--approve-structurally-passing" || arg === "--export-structural-candidates") {
      approveStructurallyPassing = true;
    } else if (arg === "--certify-semantics") certifySemantics = true;
    else if (arg === "--approve-semantically-certified") approveSemanticallyCertified = true;
    else if (arg === "--apply-local") applyLocal = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--allow-same-version-update") allowSameVersionUpdate = true;
    else if (arg === "--emit-from-sources") emitFromSources = true;
    else if (arg.startsWith("--release=")) releaseVersion = arg.slice("--release=".length).trim();
    else if (arg.startsWith("--carry-forward-out=")) carryForwardOut = arg.slice("--carry-forward-out=".length).trim();
    else if (arg.startsWith("--governed-out=")) governedOut = arg.slice("--governed-out=".length).trim();
    else if (arg.startsWith("--semantic-out=")) semanticOut = arg.slice("--semantic-out=".length).trim();
    else if (arg.startsWith("--combined-out=")) combinedOut = arg.slice("--combined-out=".length).trim();
    else if (arg.startsWith("--cie10es=")) cie10es = arg.slice("--cie10es=".length).trim();
    else if (arg.startsWith("--fy2026-us=")) fy2026Us = arg.slice("--fy2026-us=".length).trim();
    else if (arg.startsWith("--fy2027-us=")) fy2027Us = arg.slice("--fy2027-us=".length).trim();
    else if (arg.startsWith("--expected-artifact-sha256=")) {
      expectedArtifactSha256 = arg.slice("--expected-artifact-sha256=".length).trim().toLowerCase();
    }
  }
  return {
    releaseVersion,
    carryForwardOut,
    governedOut,
    semanticOut,
    combinedOut,
    cie10es,
    fy2026Us,
    fy2027Us,
    expectedArtifactSha256,
    emitFromSources,
    approveStructurallyPassing,
    certifySemantics,
    approveSemanticallyCertified,
    applyLocal,
    dryRun,
    allowSameVersionUpdate,
  };
}

function writeJsonl(path: string, rows: unknown[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

function toCarryForwardRecord(row: Fy2027EsCarryForwardDecision) {
  return {
    code: row.code,
    locale: "es",
    label: row.label,
    sourceId: row.sourceId,
    terminologyVersion: ICD10_FY2027_ES_CARRY_FORWARD_TERMINOLOGY_VERSION,
    provenance: row.provenance,
    exactness: row.exactness,
    labelRegister: "CLINICIAN_PREFERRED",
    sourcePriority: row.sourcePriority ?? ICD10_SOURCE_PRIORITY.DEFAULT,
    status: "APPROVED",
    codeSystem: ICD10_CM_CODE_SYSTEM,
    releaseVersion: "FY2027",
    carryForwardFromRelease: "FY2026",
    originalTerminologyVersion: row.originalTerminologyVersion,
  };
}

function toGovernedRecord(row: Fy2027EsGapReviewRow, status: "PENDING_REVIEW" | "APPROVED") {
  return {
    code: row.code,
    locale: "es",
    label: row.label,
    sourceId: ICD10_FY2027_ES_GAP_SOURCE_ID,
    terminologyVersion: ICD10_FY2027_ES_GAP_TERMINOLOGY_VERSION,
    provenance: "MEDORA_GOVERNED",
    exactness: "EXACT_GOVERNED",
    labelRegister: "CLINICIAN_PREFERRED",
    sourcePriority: ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED,
    status,
    codeSystem: ICD10_CM_CODE_SYSTEM,
    releaseVersion: "FY2027",
  };
}

function jsonlSha256(rows: unknown[]): string {
  const body = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
  return createHash("sha256").update(body, "utf8").digest("hex");
}

function selectableCatalogFromOrderFile(file: string) {
  const parsed = parseIcd10CmReleaseFile(file);
  return parsed.rows
    .filter((row) => row.isSelectable && row.isBillable)
    .map((row) => ({
      code: row.code,
      normalizedCode: row.normalizedCode,
      shortDescription: row.shortDescription,
      longDescription: row.longDescription,
      isSelectable: true,
      isBillable: true,
    }));
}

export function composeFy2027EsCombinedFromSources(input: {
  cie10esXlsx: string;
  fy2026OrderFile: string;
  fy2027OrderFile: string;
}): {
  eligible: Fy2027EsCarryForwardDecision[];
  reviewed: Fy2027EsGapReviewRow[];
  combined: unknown[];
  cfSummary: ReturnType<typeof summarizeFy2027EsCarryForward>;
  sourceExactRows: number;
  governedCarryForwardRows: number;
  governedNewChangedRows: number;
  cie10esSha256: string;
  fy2026OrderSha256: string;
  fy2027OrderSha256: string;
  cie10esShaMatch: boolean;
  fy2026OrderShaMatch: boolean;
  fy2027OrderShaMatch: boolean;
  fy2026Selectable: number;
  fy2027Selectable: number;
  duplicateCodes: number;
} {
  const cie10esSha256 = sha256File(input.cie10esXlsx);
  const fy2026OrderSha256 = sha256File(input.fy2026OrderFile);
  const fy2027OrderSha256 = sha256File(input.fy2027OrderFile);
  const spanish = parseSpanishCie10EsXlsx(input.cie10esXlsx);
  const fy2026Catalog = selectableCatalogFromOrderFile(input.fy2026OrderFile);
  const fy2027Catalog = selectableCatalogFromOrderFile(input.fy2027OrderFile);
  const allow = buildCie10esFy2026AllowSet({
    usRows: fy2026Catalog.map((row) => ({
      code: row.code,
      normalizedCode: row.normalizedCode,
      label: row.shortDescription,
      selectable: true,
    })),
    esFinales: spanish.finales,
    sourceSha256: cie10esSha256,
    expectedSha256: ICD10_CIE10ES_ARTIFACT_SHA256,
    expectedRelease: "FY2026",
    expectedUsSelectable: fy2026Catalog.length,
  });
  const fy2026ByNorm = new Map(fy2026Catalog.map((row) => [row.normalizedCode, row]));
  const fy2026EsByNorm = new Map<string, Fy2027EsExistingLabel>();
  for (const row of allow.allowed) {
    fy2026EsByNorm.set(row.normalizedCode, {
      preferredLabel: row.label,
      provenance: "OFFICIAL_SOURCE",
      exactness: "EXACT_SOURCE",
      sourceId: ICD10_CIE10ES_SOURCE_ID,
      terminologyVersion: ICD10_CIE10ES_TERMINOLOGY_VERSION,
      sourcePriority: ICD10_SOURCE_PRIORITY.OFFICIAL_SOURCE,
    });
  }
  for (const [normalizedCode, label] of Object.entries(GOVERNED_ICD10_CLINICIAN_LABELS_ES)) {
    const catalog = fy2026ByNorm.get(normalizedCode);
    if (!catalog) continue;
    fy2026EsByNorm.set(normalizedCode, {
      preferredLabel: label,
      provenance: "MEDORA_GOVERNED",
      exactness: "EXACT_GOVERNED",
      sourceId: ICD10_GOVERNED_SOURCE_ID,
      terminologyVersion: ICD10_GOVERNED_TERMINOLOGY_VERSION,
      sourcePriority: ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED,
    });
  }
  for (const catalog of fy2026Catalog) {
    if (fy2026EsByNorm.has(catalog.normalizedCode)) continue;
    const reviewed = reviewFy2026EsGapCandidate({
      code: catalog.code,
      shortDescription: catalog.shortDescription,
      isSelectable: true,
    });
    if (!reviewed.label) {
      throw new Error(`FY2026_ES_GAP_LABEL_MISSING ${catalog.code}`);
    }
    fy2026EsByNorm.set(catalog.normalizedCode, {
      preferredLabel: reviewed.label,
      provenance: "MEDORA_GOVERNED",
      exactness: "EXACT_GOVERNED",
      sourceId: ICD10_FY2026_ES_GAP_SOURCE_ID,
      terminologyVersion: ICD10_FY2026_ES_GAP_TERMINOLOGY_VERSION,
      sourcePriority: ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED,
    });
  }

  const decisions: Fy2027EsCarryForwardDecision[] = fy2027Catalog.map((fy2027) =>
    decideFy2027EsCarryForward({
      fy2027,
      fy2026: fy2026ByNorm.get(fy2027.normalizedCode) ?? null,
      fy2026Es: fy2026EsByNorm.get(fy2027.normalizedCode) ?? null,
    }),
  );
  const cfSummary = summarizeFy2027EsCarryForward(decisions);
  const eligible = decisions.filter((row) => row.eligible);
  const gapDecisions = decisions.filter((row) => !row.eligible && row.bucket !== "NONSELECTABLE");
  const reviewed: Fy2027EsGapReviewRow[] = gapDecisions.map((row) => {
    const cat = fy2027Catalog.find((item) => item.normalizedCode === row.normalizedCode)!;
    return reviewFy2027EsGapCandidate({
      code: cat.code,
      shortDescription: cat.shortDescription,
      longDescription: cat.longDescription,
      isSelectable: cat.isSelectable && cat.isBillable !== false,
    });
  });
  const combined = [
    ...eligible.map(toCarryForwardRecord),
    ...reviewed.map((row) => toGovernedRecord(row, "APPROVED")),
  ];
  const codes = combined.map((row) => row.code);
  return {
    eligible,
    reviewed,
    combined,
    cfSummary,
    sourceExactRows: eligible.filter((row) => row.sourceId === ICD10_CIE10ES_SOURCE_ID).length,
    governedCarryForwardRows: eligible.filter((row) => row.sourceId !== ICD10_CIE10ES_SOURCE_ID).length,
    governedNewChangedRows: reviewed.length,
    cie10esSha256,
    fy2026OrderSha256,
    fy2027OrderSha256,
    cie10esShaMatch: cie10esSha256.toLowerCase() === ICD10_CIE10ES_ARTIFACT_SHA256.toLowerCase(),
    fy2026OrderShaMatch:
      fy2026OrderSha256.toLowerCase() === ICD10_CM_FY2026_MANIFEST.preferredInnerFileSha256.toLowerCase(),
    fy2027OrderShaMatch:
      fy2027OrderSha256.toLowerCase() === ICD10_CM_FY2027_MANIFEST.preferredInnerFileSha256.toLowerCase(),
    fy2026Selectable: fy2026Catalog.length,
    fy2027Selectable: fy2027Catalog.length,
    duplicateCodes: codes.length - new Set(codes).size,
  };
}

async function main() {
  const options = parseFy2027EsTerminologyArgs(process.argv.slice(2));
  if (options.releaseVersion !== "FY2027") {
    console.error(
      "Usage: icd:fy2027-es-terminology --release=FY2027 [--emit-from-sources --cie10es= --fy2026-us= --fy2027-us=] [--certify-semantics] [--approve-semantically-certified] [--apply-local] [--dry-run]",
    );
    process.exitCode = 64;
    return;
  }

  if (options.emitFromSources) {
    if (!options.cie10es || !options.fy2026Us || !options.fy2027Us) {
      console.error("EMIT_FROM_SOURCES requires --cie10es= --fy2026-us= --fy2027-us=");
      process.exitCode = 64;
      return;
    }
    const composed = composeFy2027EsCombinedFromSources({
      cie10esXlsx: options.cie10es,
      fy2026OrderFile: options.fy2026Us,
      fy2027OrderFile: options.fy2027Us,
    });
    console.log(`CIE10ES_SHA256=${composed.cie10esSha256}`);
    console.log(`CIE10ES_SHA_MATCH=${composed.cie10esShaMatch ? "YES" : "NO"}`);
    console.log(`FY2026_ORDER_SHA256=${composed.fy2026OrderSha256}`);
    console.log(`FY2026_ORDER_SHA_MATCH=${composed.fy2026OrderShaMatch ? "YES" : "NO"}`);
    console.log(`FY2027_ORDER_SHA256=${composed.fy2027OrderSha256}`);
    console.log(`FY2027_ORDER_SHA_MATCH=${composed.fy2027OrderShaMatch ? "YES" : "NO"}`);
    console.log(`FY2026_SELECTABLE=${composed.fy2026Selectable}`);
    console.log(`FY2027_SELECTABLE=${composed.fy2027Selectable}`);
    console.log(`SOURCE_EXACT_ROWS=${composed.sourceExactRows}`);
    console.log(`GOVERNED_CARRY_FORWARD_ROWS=${composed.governedCarryForwardRows}`);
    console.log(`GOVERNED_NEW_CHANGED_ROWS=${composed.governedNewChangedRows}`);
    console.log(`CARRY_FORWARD_ELIGIBLE=${composed.cfSummary.CARRY_FORWARD_ELIGIBLE}`);
    console.log(`DESCRIPTION_CHANGED=${composed.cfSummary.DESCRIPTION_CHANGED}`);
    console.log(`NEW_FY2027_CODE=${composed.cfSummary.NEW_FY2027_CODE}`);
    console.log(`MISSING_FY2026_SPANISH=${composed.cfSummary.MISSING_FY2026_SPANISH}`);
    console.log(`DUPLICATE_CODES=${composed.duplicateCodes}`);

    writeJsonl(options.carryForwardOut, composed.eligible.map(toCarryForwardRecord));
    writeJsonl(
      options.governedOut,
      composed.reviewed.filter((row) => row.label).map((row) => toGovernedRecord(row, "PENDING_REVIEW")),
    );
    console.log(`CARRY_FORWARD_OUT=${options.carryForwardOut}`);
    console.log(`GOVERNED_OUT=${options.governedOut}`);

    if (options.approveStructurallyPassing) {
      console.log("STRUCTURAL_CANDIDATE=YES");
      console.log("SEMANTICALLY_CERTIFIED=NO");
      console.log("APPROVED_FOR_INGEST=0");
      console.log("STOP=structural pass is not clinical approval; pass --certify-semantics");
      return;
    }
    const runSemantic = options.certifySemantics || options.approveSemanticallyCertified;
    if (!runSemantic) {
      console.log("STOP=waiting for --certify-semantics");
      return;
    }
    const semanticRows: Fy2027EsSemanticRow[] = composed.reviewed.map((row) =>
      certifyFy2027EsGapSemantics({
        code: row.code,
        shortDescription: row.shortDescription,
        spanish: row.label ?? "",
        structuralStatus: row.reviewStatus,
      }),
    );
    writeJsonl(options.semanticOut, semanticRows.map((row) => toFy2027EsSemanticReviewRecord(row, false)));
    const pass = semanticRows.filter((row) => row.semanticStatus === "PASS");
    const semanticReview = semanticRows.filter((row) => row.semanticStatus === "REVIEW_REQUIRED");
    const fail = semanticRows.filter((row) => row.semanticStatus === "FAIL");
    console.log(`SEMANTIC_OUT=${options.semanticOut}`);
    console.log(`SEMANTIC_PASS=${pass.length}`);
    console.log(`SEMANTIC_REVIEW_REQUIRED=${semanticReview.length}`);
    console.log(`SEMANTIC_FAIL=${fail.length}`);
    if (!options.approveSemanticallyCertified) {
      console.log("APPROVED_FOR_INGEST=0");
      console.log("STOP=waiting for --approve-semantically-certified");
      return;
    }
    if (
      fail.length > 0 ||
      semanticReview.length > 0 ||
      composed.cfSummary.MISSING_FY2026_SPANISH > 0 ||
      composed.eligible.length + pass.length !== composed.fy2027Selectable ||
      composed.fy2027Selectable !== EXPECTED_FY2027_SELECTABLE ||
      composed.eligible.length !== EXPECTED_CARRY_FORWARD ||
      composed.reviewed.length !== EXPECTED_NEW_OR_CHANGED ||
      composed.duplicateCodes !== 0 ||
      !composed.cie10esShaMatch ||
      !composed.fy2026OrderShaMatch ||
      !composed.fy2027OrderShaMatch
    ) {
      console.error("REFUSING_SEMANTIC_APPROVAL");
      process.exitCode = 1;
      return;
    }
    const approvedGoverned = composed.reviewed.map((row) => toGovernedRecord(row, "APPROVED"));
    const combined = [...composed.eligible.map(toCarryForwardRecord), ...approvedGoverned];
    writeJsonl(options.governedOut, approvedGoverned);
    writeJsonl(options.semanticOut, semanticRows.map((row) => toFy2027EsSemanticReviewRecord(row, true)));
    writeJsonl(options.combinedOut, combined);
    const artifactSha = jsonlSha256(combined);
    console.log(`APPROVED_FOR_INGEST=${approvedGoverned.length}`);
    console.log(`SEMANTICALLY_CERTIFIED=${pass.length}`);
    console.log(`ARTIFACT=${options.combinedOut}`);
    console.log(`ARTIFACT_SHA256=${artifactSha}`);
    console.log(`TOTAL_ARTIFACT_ROWS=${combined.length}`);
    const expectedSha = (options.expectedArtifactSha256 || ICD10_FY2027_ES_COMBINED_ARTIFACT_SHA256).toLowerCase();
    const match = artifactSha === expectedSha;
    console.log(`EXPECTED_ARTIFACT_SHA256=${expectedSha}`);
    console.log(`ARTIFACT_SHA_MATCH=${match ? "YES" : "NO"}`);
    if (!match) {
      console.error("STOP=regenerated artifact SHA-256 does not match expected");
      process.exitCode = 1;
    }
    return;
  }

  const ingestGate = fy2027EsGapIngestGate(options);
  if (!ingestGate.allowed) {
    console.error(
      ingestGate.reason === "REFUSING_STRUCTURAL_INGEST"
        ? "REFUSING_STRUCTURAL_INGEST structural pass is not clinical approval"
        : "REFUSING_INGEST --apply-local requires --approve-semantically-certified",
    );
    process.exitCode = 64;
    return;
  }

  const dbName = assertLocalCertificationDatabaseUrl(process.env.DATABASE_URL ?? "");
  console.log(`DB_TARGET=localhost/${dbName}`);
  console.log(`FY2027_CARRY_FORWARD_VERSION=${ICD10_FY2027_ES_CARRY_FORWARD_TERMINOLOGY_VERSION}`);
  console.log(`FY2027_GOVERNED_SOURCE_ID=${ICD10_FY2027_ES_GAP_SOURCE_ID}`);
  console.log(`FY2027_GOVERNED_VERSION=${ICD10_FY2027_ES_GAP_TERMINOLOGY_VERSION}`);

  const prisma = new PrismaClient();
  try {
    const [fy2026Catalog, fy2027Catalog, fy2026Es] = await Promise.all([
      prisma.icd10DiagnosisCode.findMany({
        where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: "FY2026", isSelectable: true, isBillable: true },
        select: { code: true, normalizedCode: true, shortDescription: true, longDescription: true, isSelectable: true, isBillable: true },
      }),
      prisma.icd10DiagnosisCode.findMany({
        where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: "FY2027", isSelectable: true, isBillable: true },
        select: { code: true, normalizedCode: true, shortDescription: true, longDescription: true, isSelectable: true, isBillable: true },
      }),
      prisma.icd10DiagnosisTerminology.findMany({
        where: {
          codeSystem: ICD10_CM_CODE_SYSTEM,
          releaseVersion: "FY2026",
          locale: "es",
          isEffective: true,
          labelRegister: "CLINICIAN_PREFERRED",
          status: "APPROVED",
        },
        select: {
          normalizedCode: true,
          preferredLabel: true,
          provenance: true,
          exactness: true,
          sourceId: true,
          terminologyVersion: true,
          sourcePriority: true,
        },
      }),
    ]);

    const fy2026ByNorm = new Map(fy2026Catalog.map((row) => [row.normalizedCode, row]));
    const fy2026EsByNorm = new Map(fy2026Es.map((row) => [row.normalizedCode, row]));
    const decisions: Fy2027EsCarryForwardDecision[] = fy2027Catalog.map((fy2027) =>
      decideFy2027EsCarryForward({
        fy2027,
        fy2026: fy2026ByNorm.get(fy2027.normalizedCode) ?? null,
        fy2026Es: fy2026EsByNorm.get(fy2027.normalizedCode) ?? null,
      }),
    );
    const cfSummary = summarizeFy2027EsCarryForward(decisions);
    const eligible = decisions.filter((row) => row.eligible);
    const gapDecisions = decisions.filter((row) => !row.eligible && row.bucket !== "NONSELECTABLE");
    console.log(`FY2026_SELECTABLE=${fy2026Catalog.length}`);
    console.log(`FY2027_SELECTABLE=${fy2027Catalog.length}`);
    console.log(`CARRY_FORWARD_ELIGIBLE=${cfSummary.CARRY_FORWARD_ELIGIBLE}`);
    console.log(`DESCRIPTION_CHANGED=${cfSummary.DESCRIPTION_CHANGED}`);
    console.log(`NEW_FY2027_CODE=${cfSummary.NEW_FY2027_CODE}`);
    console.log(`MISSING_FY2026_SPANISH=${cfSummary.MISSING_FY2026_SPANISH}`);

    const reviewed: Fy2027EsGapReviewRow[] = gapDecisions.map((row) => {
      const cat = fy2027Catalog.find((item) => item.normalizedCode === row.normalizedCode)!;
      return reviewFy2027EsGapCandidate({
        code: cat.code,
        shortDescription: cat.shortDescription,
        longDescription: cat.longDescription,
        isSelectable: cat.isSelectable && cat.isBillable !== false,
      });
    });
    const families = summarizeFy2027EsGapFamilies(reviewed);
    const structuralCandidates = reviewed.filter((row) => row.reviewStatus === "STRUCTURAL_CANDIDATE");
    console.log(`FY2027_NEW_OR_CHANGED_GOVERNED=${reviewed.length}`);
    console.log(`STRUCTURAL_CANDIDATES=${structuralCandidates.length}`);
    for (const family of families) {
      console.log(
        `STRUCTURAL_FAMILY ${family.family} TOTAL=${family.TOTAL_CODES} CANDIDATE=${family.STRUCTURAL_CANDIDATE} REVIEW_REQUIRED=${family.REVIEW_REQUIRED} BLOCKED=${family.BLOCKED}`,
      );
    }

    writeJsonl(options.carryForwardOut, eligible.map(toCarryForwardRecord));
    writeJsonl(
      options.governedOut,
      reviewed.filter((row) => row.label).map((row) => toGovernedRecord(row, "PENDING_REVIEW")),
    );
    console.log(`CARRY_FORWARD_OUT=${options.carryForwardOut}`);
    console.log(`GOVERNED_OUT=${options.governedOut}`);

    if (options.approveStructurallyPassing) {
      console.log("STRUCTURAL_CANDIDATE=YES");
      console.log("SEMANTICALLY_CERTIFIED=NO");
      console.log("APPROVED_FOR_INGEST=0");
      console.log("STOP=structural pass is not clinical approval; pass --certify-semantics");
      return;
    }

    const runSemantic = options.certifySemantics || options.approveSemanticallyCertified;
    if (!runSemantic) {
      console.log("STOP=waiting for --certify-semantics");
      return;
    }

    const semanticRows: Fy2027EsSemanticRow[] = reviewed.map((row) =>
      certifyFy2027EsGapSemantics({
        code: row.code,
        shortDescription: row.shortDescription,
        spanish: row.label ?? "",
        structuralStatus: row.reviewStatus,
      }),
    );
    writeJsonl(options.semanticOut, semanticRows.map((row) => toFy2027EsSemanticReviewRecord(row, false)));
    const pass = semanticRows.filter((row) => row.semanticStatus === "PASS");
    const semanticReview = semanticRows.filter((row) => row.semanticStatus === "REVIEW_REQUIRED");
    const fail = semanticRows.filter((row) => row.semanticStatus === "FAIL");
    console.log(`SEMANTIC_OUT=${options.semanticOut}`);
    console.log(`SEMANTIC_PASS=${pass.length}`);
    console.log(`SEMANTIC_REVIEW_REQUIRED=${semanticReview.length}`);
    console.log(`SEMANTIC_FAIL=${fail.length}`);
    for (const family of summarizeFy2027EsSemantics(semanticRows)) {
      console.log(
        `SEMANTIC_FAMILY ${family.family} TOTAL=${family.TOTAL} PASS=${family.PASS} REVIEW_REQUIRED=${family.REVIEW_REQUIRED} FAIL=${family.FAIL}`,
      );
    }
    for (const row of [...fail, ...semanticReview]) {
      console.log(`SEMANTIC_HOLD ${row.code} ${row.semanticStatus} ${row.semanticNotes.join(",")}`);
    }

    if (!options.approveSemanticallyCertified) {
      console.log("APPROVED_FOR_INGEST=0");
      console.log("STOP=waiting for --approve-semantically-certified");
      return;
    }
    if (
      fail.length > 0 ||
      semanticReview.length > 0 ||
      cfSummary.MISSING_FY2026_SPANISH > 0 ||
      eligible.length + pass.length !== fy2027Catalog.length
    ) {
      console.error("REFUSING_SEMANTIC_APPROVAL");
      process.exitCode = 1;
      return;
    }

    const approvedGoverned = reviewed.map((row) => toGovernedRecord(row, "APPROVED"));
    writeJsonl(options.governedOut, approvedGoverned);
    writeJsonl(options.semanticOut, semanticRows.map((row) => toFy2027EsSemanticReviewRecord(row, true)));
    console.log(`APPROVED_FOR_INGEST=${approvedGoverned.length}`);
    console.log(`SEMANTICALLY_CERTIFIED=${pass.length}`);

    if (!options.applyLocal) {
      console.log("LOCAL_ROWS_INSERTED=0");
      console.log("STOP=waiting for --apply-local");
      return;
    }

    const combinedPath = options.combinedOut || join(dirname(options.governedOut), "medora-p3f8-es-fy2027-combined.jsonl");
    writeJsonl(combinedPath, [...eligible.map(toCarryForwardRecord), ...approvedGoverned]);
    const plan = await importLicensedIcd10Terminology(prisma, {
      file: combinedPath,
      releaseVersion: "FY2027",
      dryRun: options.dryRun,
      supersedePrior: false,
      allowSameVersionUpdate: options.allowSameVersionUpdate,
      allowMixedSourceIds: true,
    });
    console.log(`ARTIFACT=${combinedPath}`);
    console.log(`ARTIFACT_SHA256=${plan.report.ARTIFACT_SHA256 ?? ""}`);
    console.log(`PRODUCTION_DRY_RUN=${options.dryRun ? "YES" : "NO"}`);
    console.log(`ROWS_TO_INSERT=${plan.report.INSERTED}`);
    console.log(`ROWS_TO_UPDATE=${plan.report.UPDATED}`);
    console.log(`ROWS_UNCHANGED=${plan.report.UNCHANGED}`);
    console.log(`ROWS_REJECTED=${plan.rejected.length}`);
    console.log(`EXPECTED_EFFECTIVE_ES=${plan.report.COVERAGE_AFTER ?? plan.report.EFFECTIVE_AFTER ?? ""}`);
    if (plan.rejected.length > 0) {
      for (const row of plan.rejected.slice(0, 20)) console.log(`REJECT ${row.code} ${row.reason}`);
      console.error("STOP=ROWS_REJECTED>0 zero-write on failed validation");
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
