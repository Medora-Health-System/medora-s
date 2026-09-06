/**
 * MEDUI.TRILANG.DX.P3-F.7A-ES — governed Spanish gap review + semantic certify + local ingest.
 *
 * STRUCTURAL_CANDIDATE != SEMANTICALLY_CERTIFIED != APPROVED_FOR_LOCAL_INGEST
 *
 *   pnpm --filter @medora/api run icd:fy2026-es-gap-governed -- --release=FY2026 --certify-semantics
 *   pnpm --filter @medora/api run icd:fy2026-es-gap-governed -- --release=FY2026 --approve-semantically-certified --apply-local
 *
 * --approve-structurally-passing / --export-structural-candidates never write APPROVED rows.
 * --approve-semantically-certified is required before APPROVED_FOR_LOCAL_INGEST.
 * Refuses non-localhost DATABASE_URL.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  certifyFy2026EsGapSemantics,
  ICD10_CM_CODE_SYSTEM,
  ICD10_FY2026_ES_GAP_SOURCE_ID,
  ICD10_FY2026_ES_GAP_TERMINOLOGY_VERSION,
  ICD10_SOURCE_PRIORITY,
  reviewFy2026EsGapCandidate,
  summarizeFy2026EsGapFamilies,
  summarizeFy2026EsSemantics,
  fy2026EsGapIngestGate,
  toFy2026EsSemanticReviewRecord,
  type Fy2026EsGapReviewRow,
  type Fy2026EsSemanticRow,
} from "@medora/shared";
import { importLicensedIcd10Terminology } from "./import-icd10-licensed-terminology";

const DEFAULT_PENDING_OUT = "/tmp/medora-p3f7-es-gap-pending.jsonl";
const DEFAULT_APPROVED_OUT = "/tmp/medora-p3f7-es-gap-approved.jsonl";
const DEFAULT_SEMANTIC_OUT = "/tmp/medora-p3f7a-es-semantic-matrix.jsonl";

type LiveGapFile = {
  codes: Array<{ code: string; family: string }>;
};

export function parseFy2026EsGapGovernedArgs(argv: string[]) {
  let releaseVersion = "";
  let liveGap = join(__dirname, "fy2026-es-live-missing-codes.json");
  let pendingOut = DEFAULT_PENDING_OUT;
  let approvedOut = DEFAULT_APPROVED_OUT;
  let semanticOut = DEFAULT_SEMANTIC_OUT;
  let approveStructurallyPassing = false;
  let certifySemantics = false;
  let approveSemanticallyCertified = false;
  let applyLocal = false;
  let dryRun = false;
  let allowSameVersionUpdate = false;
  for (const arg of argv) {
    if (arg === "--approve-structurally-passing" || arg === "--export-structural-candidates") {
      approveStructurallyPassing = true;
    }
    else if (arg === "--certify-semantics") certifySemantics = true;
    else if (arg === "--approve-semantically-certified") approveSemanticallyCertified = true;
    else if (arg === "--apply-local") applyLocal = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--allow-same-version-update") allowSameVersionUpdate = true;
    else if (arg.startsWith("--release=")) releaseVersion = arg.slice("--release=".length).trim();
    else if (arg.startsWith("--live-gap=")) liveGap = arg.slice("--live-gap=".length).trim();
    else if (arg.startsWith("--pending-out=")) pendingOut = arg.slice("--pending-out=".length).trim();
    else if (arg.startsWith("--approved-out=")) approvedOut = arg.slice("--approved-out=".length).trim();
    else if (arg.startsWith("--semantic-out=")) semanticOut = arg.slice("--semantic-out=".length).trim();
  }
  return {
    releaseVersion,
    liveGap,
    pendingOut,
    approvedOut,
    semanticOut,
    approveStructurallyPassing,
    certifySemantics,
    approveSemanticallyCertified,
    applyLocal,
    dryRun,
    allowSameVersionUpdate,
  };
}

export function assertLocalCertificationDatabaseUrl(databaseUrl: string): string {
  const raw = databaseUrl.trim();
  if (!raw) throw new Error("DATABASE_URL is required");
  const parsed = new URL(raw.replace(/^postgresql:/i, "http:"));
  const host = parsed.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    throw new Error(`REFUSING_NON_LOCAL_DB host=${host}`);
  }
  return parsed.pathname.replace(/^\//, "").split("?")[0] ?? "";
}

function toJsonlRecord(row: Fy2026EsGapReviewRow, status: "PENDING_REVIEW" | "APPROVED") {
  return {
    code: row.code,
    locale: "es",
    label: row.label,
    sourceId: ICD10_FY2026_ES_GAP_SOURCE_ID,
    terminologyVersion: ICD10_FY2026_ES_GAP_TERMINOLOGY_VERSION,
    provenance: "MEDORA_GOVERNED",
    exactness: "EXACT_GOVERNED",
    labelRegister: "CLINICIAN_PREFERRED",
    sourcePriority: ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED,
    status,
    codeSystem: ICD10_CM_CODE_SYSTEM,
    releaseVersion: "FY2026",
  };
}

function writeJsonl(path: string, rows: unknown[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

async function main() {
  const options = parseFy2026EsGapGovernedArgs(process.argv.slice(2));
  if (options.releaseVersion !== "FY2026") {
    console.error(
      "Usage: icd:fy2026-es-gap-governed --release=FY2026 [--certify-semantics] [--approve-semantically-certified] [--apply-local]",
    );
    process.exitCode = 64;
    return;
  }
  const ingestGate = fy2026EsGapIngestGate(options);
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
  console.log(`SOURCE_CLASS=MEDORA_GOVERNED`);
  console.log(`SOURCE_ID=${ICD10_FY2026_ES_GAP_SOURCE_ID}`);
  console.log(`TERMINOLOGY_VERSION=${ICD10_FY2026_ES_GAP_TERMINOLOGY_VERSION}`);

  const gap = JSON.parse(readFileSync(options.liveGap, "utf8")) as LiveGapFile;
  const prisma = new PrismaClient();
  try {
    const catalog = await prisma.icd10DiagnosisCode.findMany({
      where: {
        codeSystem: ICD10_CM_CODE_SYSTEM,
        releaseVersion: options.releaseVersion,
        code: { in: gap.codes.map((row) => row.code) },
      },
      select: {
        code: true,
        normalizedCode: true,
        shortDescription: true,
        isSelectable: true,
        isBillable: true,
      },
    });
    const byCode = new Map(catalog.map((row) => [row.code, row]));
    const reviewed: Fy2026EsGapReviewRow[] = [];
    for (const gapRow of gap.codes) {
      const cat = byCode.get(gapRow.code);
      reviewed.push(
        reviewFy2026EsGapCandidate({
          code: gapRow.code,
          shortDescription: cat?.shortDescription ?? "",
          isSelectable: cat?.isSelectable === true && cat.isBillable === true,
        }),
      );
    }

    const families = summarizeFy2026EsGapFamilies(reviewed);
    const structuralCandidates = reviewed.filter((row) => row.reviewStatus === "STRUCTURAL_CANDIDATE");
    const reviewRequired = reviewed.filter((row) => row.reviewStatus === "PENDING_REVIEW");
    const blocked = reviewed.filter((row) => row.reviewStatus === "BLOCKED");

    writeJsonl(
      options.pendingOut,
      reviewed.filter((row) => row.label).map((row) => toJsonlRecord(row, "PENDING_REVIEW")),
    );
    console.log(`PENDING_OUT=${options.pendingOut}`);
    console.log(`LIVE_GAP_RECOMPUTED=${reviewed.length}`);
    console.log(`STRUCTURAL_CANDIDATES=${structuralCandidates.length}`);
    console.log(`STRUCTURAL_REVIEW_REQUIRED=${reviewRequired.length}`);
    console.log(`BLOCKED=${blocked.length}`);
    for (const family of families) {
      console.log(
        `STRUCTURAL_FAMILY ${family.family} TOTAL=${family.TOTAL_CODES} CANDIDATE=${family.STRUCTURAL_CANDIDATE} REVIEW_REQUIRED=${family.REVIEW_REQUIRED} BLOCKED=${family.BLOCKED}`,
      );
    }

    if (options.approveStructurallyPassing) {
      console.log("STRUCTURAL_CANDIDATE=YES");
      console.log("SEMANTICALLY_CERTIFIED=NO");
      console.log("APPROVED_FOR_LOCAL_INGEST=0");
      console.log("SEMANTIC_STATUS=NOT_RUN");
      console.log("STOP=structural pass is not clinical approval; pass --certify-semantics");
      return;
    }

    const runSemantic = options.certifySemantics || options.approveSemanticallyCertified;
    if (!runSemantic) {
      console.log("STOP=waiting for --certify-semantics");
      return;
    }

    const liveTerms = await prisma.icd10DiagnosisTerminology.findMany({
      where: {
        codeSystem: ICD10_CM_CODE_SYSTEM,
        releaseVersion: options.releaseVersion,
        locale: "es",
        sourceId: ICD10_FY2026_ES_GAP_SOURCE_ID,
        labelRegister: "CLINICIAN_PREFERRED",
      },
      select: { code: true, preferredLabel: true },
    });
    const liveByCode = new Map(liveTerms.map((row) => [row.code, row.preferredLabel]));

    const semanticRows: Fy2026EsSemanticRow[] = reviewed.map((row) => {
      const certified = certifyFy2026EsGapSemantics({
        code: row.code,
        shortDescription: row.shortDescription,
        spanish: row.label ?? "",
        structuralStatus: row.reviewStatus,
      });
      const live = liveByCode.get(row.code);
      if (live && live !== row.label) {
        certified.semanticNotes.push(`LIVE_MISMATCH:${live}`);
      }
      return certified;
    });
    writeJsonl(
      options.semanticOut,
      semanticRows.map((row) => toFy2026EsSemanticReviewRecord(row, false)),
    );
    const semanticFamilies = summarizeFy2026EsSemantics(semanticRows);
    const pass = semanticRows.filter((row) => row.semanticStatus === "PASS");
    const semanticReview = semanticRows.filter((row) => row.semanticStatus === "REVIEW_REQUIRED");
    const fail = semanticRows.filter((row) => row.semanticStatus === "FAIL");
    console.log(`SEMANTIC_OUT=${options.semanticOut}`);
    console.log(`SEMANTIC_PASS=${pass.length}`);
    console.log(`SEMANTIC_REVIEW_REQUIRED=${semanticReview.length}`);
    console.log(`SEMANTIC_FAIL=${fail.length}`);
    for (const family of semanticFamilies) {
      console.log(
        `SEMANTIC_FAMILY ${family.family} TOTAL=${family.TOTAL} PASS=${family.PASS} REVIEW_REQUIRED=${family.REVIEW_REQUIRED} FAIL=${family.FAIL}`,
      );
    }
    for (const row of [...fail, ...semanticReview]) {
      console.log(`SEMANTIC_HOLD ${row.code} ${row.semanticStatus} ${row.semanticNotes.join(",")}`);
      console.log(`  EN=${row.english}`);
      console.log(`  ES=${row.spanish}`);
    }

    if (!options.approveSemanticallyCertified) {
      console.log("SEMANTICALLY_CERTIFIED=" + (fail.length === 0 && semanticReview.length === 0 ? pass.length : 0));
      console.log("APPROVED_FOR_LOCAL_INGEST=0");
      console.log("STOP=waiting for --approve-semantically-certified");
      return;
    }
    if (fail.length > 0 || semanticReview.length > 0 || pass.length !== 486) {
      console.error("REFUSING_SEMANTIC_APPROVAL");
      process.exitCode = 1;
      return;
    }

    const approvedRecords = reviewed.map((row) => toJsonlRecord(row, "APPROVED"));
    writeJsonl(options.approvedOut, approvedRecords);
    writeJsonl(
      options.semanticOut,
      semanticRows.map((row) => toFy2026EsSemanticReviewRecord(row, true)),
    );
    console.log(`APPROVED_OUT=${options.approvedOut}`);
    console.log(`APPROVED_FOR_LOCAL_INGEST=${approvedRecords.length}`);
    console.log(`SEMANTICALLY_CERTIFIED=${pass.length}`);

    if (!options.applyLocal) {
      console.log("LOCAL_ROWS_INSERTED=0");
      console.log("STOP=waiting for --apply-local");
      return;
    }

    const plan = await importLicensedIcd10Terminology(prisma, {
      file: options.approvedOut,
      releaseVersion: options.releaseVersion,
      dryRun: options.dryRun,
      supersedePrior: false,
      allowSameVersionUpdate: options.allowSameVersionUpdate,
    });
    console.log(`LOCAL_ROWS_INSERTED=${plan.report.INSERTED}`);
    console.log(`LOCAL_ROWS_UPDATED=${plan.report.UPDATED}`);
    console.log(`LOCAL_UNCHANGED=${plan.report.UNCHANGED}`);
    console.log(`LOCAL_EFFECTIVE_ES=${plan.report.COVERAGE_AFTER ?? ""}`);
    if (plan.rejected.length > 0) {
      for (const row of plan.rejected) console.log(`REJECT ${row.code} ${row.reason}`);
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
