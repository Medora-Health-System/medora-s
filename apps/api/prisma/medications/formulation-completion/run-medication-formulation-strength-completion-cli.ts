/**
 *   pnpm medication:formulation:audit
 *   pnpm medication:formulation:dry-run
 *   pnpm medication:formulation:apply
 *   pnpm medication:formulation:verify
 *   pnpm medication:formulation:report
 */
import { PrismaClient } from "@prisma/client";
import {
  collectFormulationBaseline,
  runFormulationStrengthCompletion,
  writeFormulationCompletionArtifact,
  type FormulationCompletionMode,
} from "./medication-formulation-strength-completion";

const prisma = new PrismaClient();

function parseMode(raw: string | undefined): FormulationCompletionMode {
  const m = (raw ?? "AUDIT").trim().toUpperCase();
  if (
    m === "AUDIT" ||
    m === "DRY_RUN" ||
    m === "APPLY" ||
    m === "VERIFY" ||
    m === "REPORT"
  ) {
    return m;
  }
  throw new Error(`Unknown formulation-completion mode: ${raw}`);
}

async function main() {
  const mode = parseMode(process.argv[2]);

  if (mode === "AUDIT") {
    const baseline = await collectFormulationBaseline(prisma);
    const path = writeFormulationCompletionArtifact(
      "medication-formulation-strength-completion-baseline.json",
      {
        title: "Medication Formulation & Strength Completion — Baseline",
        ...baseline,
      }
    );
    const audited = await runFormulationStrengthCompletion(prisma, "AUDIT");
    writeFormulationCompletionArtifact(
      "medication-formulation-strength-completion-audit.json",
      audited
    );
    console.log(
      JSON.stringify(
        {
          path,
          baseline: {
            catalogActive: baseline.catalogActive,
            distinctGenerics: baseline.distinctGenerics,
            distinctStrengths: baseline.distinctStrengths,
            distinctDosageForms: baseline.distinctDosageForms,
            distinctRoutes: baseline.distinctRoutes,
            distinctFormulations: baseline.distinctFormulations,
            genericsSingleStrength: baseline.genericsSingleStrength,
            genericsMultiStrength: baseline.genericsMultiStrength,
          },
          familySearch: audited.familySearch,
          candidatesVariants: audited.candidatesVariants,
        },
        null,
        2
      )
    );
    return;
  }

  const result = await runFormulationStrengthCompletion(prisma, mode);
  // Preserve first successful APPLY metrics; idempotent reruns write a separate artifact.
  const artifactName =
    mode === "APPLY" && result.variantsCreated === 0
      ? "medication-formulation-strength-completion-apply-idempotent.json"
      : `medication-formulation-strength-completion-${mode.toLowerCase()}.json`;
  const path = writeFormulationCompletionArtifact(artifactName, result);
  console.log(
    JSON.stringify(
      {
        path,
        mode: result.mode,
        sourceChecksumSha256: result.sourceChecksumSha256,
        candidatesConcepts: result.candidatesConcepts,
        candidatesVariants: result.candidatesVariants,
        variantsCreated: result.variantsCreated,
        variantsSkippedExisting: result.variantsSkippedExisting,
        aliasesCreated: result.aliasesCreated,
        rejectedNewGeneric: result.rejectedNewGeneric,
        familySearch: result.familySearch,
        baselineBefore: result.baselineBefore
          ? {
              distinctFormulations: result.baselineBefore.distinctFormulations,
              distinctStrengths: result.baselineBefore.distinctStrengths,
              genericsMultiStrength: result.baselineBefore.genericsMultiStrength,
            }
          : null,
        baselineAfter: result.baselineAfter
          ? {
              distinctFormulations: result.baselineAfter.distinctFormulations,
              distinctStrengths: result.baselineAfter.distinctStrengths,
              distinctDosageForms: result.baselineAfter.distinctDosageForms,
              distinctRoutes: result.baselineAfter.distinctRoutes,
              genericsMultiStrength: result.baselineAfter.genericsMultiStrength,
              catalogActive: result.baselineAfter.catalogActive,
            }
          : null,
        productsActivated: result.productsActivated,
        orderMutations: result.orderMutations,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
