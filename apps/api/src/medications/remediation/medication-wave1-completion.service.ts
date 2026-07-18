/**
 * Phase 15 Part 2A — Wave 1 completion orchestrator (infra only).
 * Seeds remediation from Phase 14B gaps and optionally recalculates quality.
 * Does not complete clinical domains without authoritative evidence.
 */
import type { PrismaClient } from "@prisma/client";
import {
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  assertDomainHasAuthoritativeProvenance,
  assertPhase15NoFabricatedFacts,
  assertPhase15Wave1Only,
} from "@medora/shared";
import { recalculateWave1QualityAfterRemediation } from "./medication-quality-recalculation.service";
import {
  createOrGetRemediationProgram,
  getRemediationProgramSnapshot,
  seedRemediationWorkItemsFromPhase14BGaps,
} from "./medication-remediation.service";
import type { RemediationActor } from "./medication-source-lifecycle.service";

export async function initializeWave1RemediationInfrastructure(
  prisma: PrismaClient,
  actor: RemediationActor,
  options?: { recalculateQuality?: boolean }
) {
  assertPhase15Wave1Only(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.expandBeyondWave1
  );
  assertPhase15NoFabricatedFacts(
    PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.fabricateUnsupportedFacts
  );

  const program = await createOrGetRemediationProgram(prisma, actor);
  const seeded = await seedRemediationWorkItemsFromPhase14BGaps(prisma, actor);

  let quality: Awaited<
    ReturnType<typeof recalculateWave1QualityAfterRemediation>
  > | null = null;
  if (options?.recalculateQuality) {
    quality = await recalculateWave1QualityAfterRemediation(prisma, actor);
  }

  const snapshot = await getRemediationProgramSnapshot(prisma);

  return {
    program,
    seededWorkItems: seeded.workItems.length,
    qualityRecalculated: Boolean(quality),
    snapshot,
    note: "Domains without authoritative provenance remain DEFERRED — no inferred facts.",
  };
}

/** Guard helper for Part 2B domain completion paths. */
export function assertWave1DomainCompletionAllowed(input: {
  hasAuthoritativeSourceLink: boolean;
  domainStatus: string;
}) {
  assertDomainHasAuthoritativeProvenance(input);
}
