/**
 * RxNorm verification CLI (Phase 4 — service/CLI only, no web UI).
 *
 * Usage:
 *   pnpm --filter @medora/api medication:rxnorm:ensure-synthetic-targets
 *   pnpm --filter @medora/api medication:rxnorm:review-report
 *   pnpm --filter @medora/api medication:rxnorm:verify -- --candidate-id=... --rationale=... --actor=PHASE4_CERT_REVIEWER --confirm-verify
 *   pnpm --filter @medora/api medication:rxnorm:reject -- --candidate-id=... --rationale=... --actor=PHASE4_CERT_REVIEWER --confirm-reject
 *   pnpm --filter @medora/api medication:rxnorm:retire -- --verified-mapping-id=... --rationale=... --actor=PHASE4_CERT_REVIEWER --confirm-retire
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import {
  ensureSyntheticCanonicalTargets,
  listMappingReviewReport,
  rejectMappingCandidate,
  retireVerifiedMapping,
  verifyMappingCandidate,
} from "./rxnorm-verification-service";

type VerifyMode =
  | "ensure-targets"
  | "review-report"
  | "verify"
  | "reject"
  | "retire";

const MODES: VerifyMode[] = ["ensure-targets", "review-report", "verify", "reject", "retire"];

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function resolveMode(): VerifyMode {
  const raw = getArg("mode");
  if (!raw) {
    console.error(`Missing --mode= (${MODES.join("|")})`);
    process.exit(1);
  }
  if (!(MODES as readonly string[]).includes(raw)) {
    console.error(`Invalid mode: ${raw}`);
    process.exit(1);
  }
  return raw as VerifyMode;
}

function parseReviewVersion(): number {
  const raw = getArg("review-version");
  if (raw == null || raw === "") return 0;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    console.error(`Invalid --review-version=${raw}`);
    process.exit(1);
  }
  return parsed;
}

function parseOverrideReasons(): string[] | undefined {
  const raw = getArg("override-reasons");
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function main() {
  const mode = resolveMode();
  console.log("=== RxNorm verification (Phase 4 — CLI/service only) ===");
  console.log(`Mode: ${mode}`);

  const prisma = new PrismaClient();
  try {
    if (mode === "ensure-targets") {
      const result = await ensureSyntheticCanonicalTargets(prisma);
      console.log(`Concepts upserted: ${result.conceptsUpserted}`);
      console.log(`Products upserted: ${result.productsUpserted}`);
      console.log(`Concept codes: ${result.conceptCodes.join(", ")}`);
      console.log(`Product codes: ${result.productCodes.join(", ")}`);
      process.exit(0);
    }

    if (mode === "review-report") {
      const report = await listMappingReviewReport(prisma, {
        releaseId: getArg("release-id"),
        status: getArg("status"),
        targetKind: getArg("target-kind"),
        limit: getArg("limit") ? Number.parseInt(getArg("limit")!, 10) : undefined,
      });
      console.log(`Total rows: ${report.total}`);
      for (const row of report.rows) {
        console.log(
          [
            row.candidateId,
            `v${row.reviewVersion}`,
            row.status,
            row.rxcui,
            row.termType,
            row.targetKind,
            row.targetCode ?? row.targetId,
            `autoVerified=${row.autoVerified}`,
          ].join(" | ")
        );
      }
      process.exit(0);
    }

    const actor = getArg("actor");
    const rationale = getArg("rationale");
    const candidateId = getArg("candidate-id");
    const verifiedMappingId = getArg("verified-mapping-id");
    const reviewVersion = parseReviewVersion();

    if (mode === "verify") {
      if (!hasFlag("confirm-verify")) {
        console.error("verify requires --confirm-verify");
        process.exit(1);
      }
      if (!candidateId || !rationale || !actor) {
        console.error("verify requires --candidate-id=, --rationale=, --actor=");
        process.exit(1);
      }

      const result = await verifyMappingCandidate(prisma, {
        candidateId,
        expectedReviewVersion: reviewVersion,
        confirmVerify: true,
        reviewerActorLabel: actor,
        rationaleNotes: rationale,
        conflictOverrideAcknowledged: hasFlag("acknowledge-conflicts"),
        conflictOverrideReasons: parseOverrideReasons(),
      });

      console.log(`OK: ${result.ok}`);
      console.log(`Candidate: ${result.candidateId}`);
      console.log(`Verified mapping: ${result.verifiedMappingId}`);
      console.log(`Review version: ${result.reviewVersion}`);
      process.exit(result.ok ? 0 : 1);
    }

    if (mode === "reject") {
      if (!hasFlag("confirm-reject")) {
        console.error("reject requires --confirm-reject");
        process.exit(1);
      }
      if (!candidateId || !rationale || !actor) {
        console.error("reject requires --candidate-id=, --rationale=, --actor=");
        process.exit(1);
      }
      const rejectionReasonCategory = getArg("rejection-reason") ?? "OTHER";

      const result = await rejectMappingCandidate(prisma, {
        candidateId,
        expectedReviewVersion: reviewVersion,
        confirmReject: true,
        rejectionReasonCategory: rejectionReasonCategory as never,
        reviewerActorLabel: actor,
        rationaleNotes: rationale,
      });

      console.log(`OK: ${result.ok}`);
      console.log(`Candidate: ${result.candidateId}`);
      console.log(`Review version: ${result.reviewVersion}`);
      process.exit(result.ok ? 0 : 1);
    }

    if (mode === "retire") {
      if (!hasFlag("confirm-retire")) {
        console.error("retire requires --confirm-retire");
        process.exit(1);
      }
      if (!verifiedMappingId || !rationale || !actor) {
        console.error("retire requires --verified-mapping-id=, --rationale=, --actor=");
        process.exit(1);
      }

      const result = await retireVerifiedMapping(prisma, {
        verifiedMappingId,
        confirmRetire: true,
        retireReason: rationale,
        reviewerActorLabel: actor,
      });

      console.log(`OK: ${result.ok}`);
      console.log(`Verified mapping: ${result.verifiedMappingId}`);
      process.exit(result.ok ? 0 : 1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
