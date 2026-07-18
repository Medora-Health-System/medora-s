/**
 * Phase 15 Part 2B CLI — operational remediation controls (no certification).
 *
 * Modes: baseline | list | refresh | preview | execute | sources | verify-source |
 *        quality | readiness | dashboard
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Phase15WorkItemStatus } from "@medora/shared";
import {
  applySupportedKnowledgeGuarded,
  executeRemediationTransition,
  getPhase15Dashboard,
  getPhase15OperationalBaseline,
  getPhase15Readiness,
  listAuthoritativeSources,
  listRemediationWorkItems,
  previewRemediationTransition,
  promoteAuthoritativeSource,
  refreshRemediationQueue,
  verifyRemediationSource,
} from "../../../src/medications/remediation/medication-phase15-remediation-orchestrator.service";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function resolveActor(prisma: PrismaClient) {
  const envId = process.env.PHASE15_ACTOR_USER_ID;
  if (envId) {
    return {
      userId: envId,
      roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
    };
  }
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!user) throw new Error("No active user for Phase 15 CLI actor.");
  return {
    userId: user.id,
    roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
  };
}

function print(data: unknown, json: boolean) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function main() {
  const mode = process.argv[2] ?? "baseline";
  const json = hasFlag("--json") || true;
  const dryRun = hasFlag("--dry-run");
  const prisma = new PrismaClient();

  try {
    const actor = await resolveActor(prisma);

    if (mode === "baseline") {
      const baseline = await getPhase15OperationalBaseline(prisma);
      const outDir = resolve(__dirname, "../audit-summaries");
      mkdirSync(outDir, { recursive: true });
      const outPath = resolve(
        outDir,
        "medication-phase15-part2b-operational-baseline.json"
      );
      writeFileSync(outPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
      print({ path: outPath, ...baseline }, json);
      return;
    }

    if (mode === "readiness") {
      print(await getPhase15Readiness(prisma), json);
      return;
    }

    if (mode === "dashboard") {
      print(await getPhase15Dashboard(prisma), json);
      return;
    }

    if (mode === "list") {
      print(
        await listRemediationWorkItems(prisma, {
          familyKey: arg("--family"),
          gapCategory: arg("--category"),
          status: arg("--status"),
        }),
        json
      );
      return;
    }

    if (mode === "refresh") {
      if (dryRun) {
        print(
          {
            dryRun: true,
            would: "seedRemediationWorkItemsFromPhase14BGaps",
            mutates: false,
          },
          json
        );
        return;
      }
      print(await refreshRemediationQueue(prisma, actor), json);
      return;
    }

    if (mode === "preview") {
      const id = arg("--id");
      const toStatus = (arg("--to") ?? "ROUTED") as Phase15WorkItemStatus;
      if (!id) throw new Error("--id required");
      if (/acetaminophen/i.test(id)) {
        throw new Error("IDENTITY_BLOCKED_OUT_OF_SCOPE");
      }
      print(await previewRemediationTransition(prisma, id, toStatus), json);
      return;
    }

    if (mode === "execute") {
      const id = arg("--id");
      const toStatus = arg("--to") as Phase15WorkItemStatus | undefined;
      const reason = arg("--reason");
      const expectedStatus = arg("--expected-status");
      const evidenceRegistrationId = arg("--source-id");
      if (!id || !toStatus || !reason) {
        throw new Error("--id --to --reason required");
      }
      if (dryRun) {
        print(
          await previewRemediationTransition(prisma, id, toStatus),
          json
        );
        return;
      }
      print(
        await executeRemediationTransition(prisma, actor, {
          workItemId: id,
          toStatus,
          reason,
          expectedStatus,
          evidenceRegistrationId,
        }),
        json
      );
      return;
    }

    if (mode === "apply") {
      const id = arg("--id");
      const reason = arg("--reason");
      if (!id || !reason) throw new Error("--id --reason required");
      if (dryRun) {
        print({ dryRun: true, workItemId: id, mutates: false }, json);
        return;
      }
      print(
        await applySupportedKnowledgeGuarded(prisma, actor, {
          workItemId: id,
          reason,
        }),
        json
      );
      return;
    }

    if (mode === "sources") {
      print(
        await listAuthoritativeSources(prisma, {
          sourceTier: arg("--tier"),
          acquisitionStatus: arg("--status"),
        }),
        json
      );
      return;
    }

    if (mode === "verify-source") {
      const id = arg("--id");
      const reason = arg("--reason") ?? "CLI verify";
      if (!id) throw new Error("--id work-item id required");
      if (dryRun) {
        print({ dryRun: true, workItemId: id }, json);
        return;
      }
      print(await verifyRemediationSource(prisma, actor, id, reason), json);
      return;
    }

    if (mode === "promote-source") {
      const id = arg("--id");
      const reason = arg("--reason") ?? "CLI promote";
      if (!id) throw new Error("--id registration id required");
      if (dryRun) {
        print({ dryRun: true, registrationId: id }, json);
        return;
      }
      print(
        await promoteAuthoritativeSource(prisma, actor, {
          registrationId: id,
          reason,
          licensingStatus: "PUBLIC_DOMAIN",
        }),
        json
      );
      return;
    }

    if (mode === "quality") {
      if (dryRun) {
        print({ dryRun: true, would: "recalculateWave1Quality" }, json);
        return;
      }
      const { recalculateWave1QualityAfterRemediation } = await import(
        "../../../src/medications/remediation/medication-quality-recalculation.service"
      );
      print(
        await recalculateWave1QualityAfterRemediation(prisma, actor),
        json
      );
      return;
    }

    const part2c = await import(
      "../../../src/medications/remediation/medication-phase15-part2c-execution.service"
    );

    if (mode === "pre-baseline") {
      print(await part2c.writePhase15PreRemediationBaseline(prisma), json);
      return;
    }

    if (mode === "remediation-preview" || mode === "preview-batch") {
      print(await part2c.previewPhase15Part2CRemediation(prisma), json);
      return;
    }

    if (mode === "execute-batch") {
      if (dryRun) {
        print(await part2c.previewPhase15Part2CRemediation(prisma), json);
        return;
      }
      print(await part2c.executePhase15Part2CRemediation(prisma, actor), json);
      return;
    }

    if (mode === "quality-recalc") {
      if (dryRun) {
        print({ dryRun: true, would: "runPhase15QualityRecalculation" }, json);
        return;
      }
      print(await part2c.runPhase15QualityRecalculation(prisma, actor), json);
      return;
    }

    if (mode === "shadow-requalify") {
      if (dryRun) {
        print({ dryRun: true, would: "runPhase15ShadowRequalification" }, json);
        return;
      }
      print(await part2c.runPhase15ShadowRequalification(prisma, actor), json);
      return;
    }

    if (mode === "shadow-evaluate") {
      if (dryRun) {
        print({ dryRun: true, would: "runPhase15SyntheticEvaluationReport" }, json);
        return;
      }
      print(
        await part2c.runPhase15SyntheticEvaluationReport(prisma, actor),
        json
      );
      return;
    }

    if (mode === "pipeline") {
      if (dryRun) {
        print(
          {
            dryRun: true,
            steps: [
              "pre-baseline",
              "preview",
              "execute-batch",
              "quality",
              "shadow-requalify",
              "shadow-evaluate",
              "readiness",
            ],
          },
          json
        );
        return;
      }
      print(await part2c.runPhase15Part2CPipeline(prisma, actor), json);
      return;
    }

    throw new Error(
      `Unknown mode: ${mode}. Use baseline|list|refresh|preview|execute|apply|sources|verify-source|promote-source|quality|readiness|dashboard|pre-baseline|preview-batch|execute-batch|quality-recalc|shadow-requalify|shadow-evaluate|pipeline`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
