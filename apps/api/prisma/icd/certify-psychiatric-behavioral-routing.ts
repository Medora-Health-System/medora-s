/**
 * Routing certification for psychiatric/behavioral ICD codes (Phase 18).
 *
 * Prefix maps align with planned Phase 18 discharge family IDs (Part 33) and existing
 * behavioral_health_* web resolver families where already present.
 *
 *   pnpm --filter @medora/api icd:routing:psychiatric-behavioral -- \
 *     --file=/path/to/zip --release=2026
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectDeliriumCognitiveScopedCodes,
  selectEatingDisorderScopedCodes,
  selectNeurodevelopmentalScopedCodes,
  selectPsychiatricBehavioralScopedCodes,
  selectPsychoticMoodAnxietyScopedCodes,
  selectPuerperalMentalScopedCodes,
  selectRefusalLegalScopedCodes,
  selectSuicideSelfHarmScopedCodes,
} from "./icd10-psychiatric-behavioral-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
const n = (code: string) => code.toUpperCase().replace(/\./g, "");
const starts = (code: string, prefix: string) => n(code).startsWith(n(prefix));
const descriptionOf = (row: { shortDescription: string; longDescription?: string }) =>
  `${row.shortDescription} ${row.longDescription ?? ""}`.toLowerCase();

/** Planned Phase 18 / Part 33 discharge family IDs (_v1 suffix matches web registry). Longest-prefix wins. */
const PSYCHIATRIC_BEHAVIORAL_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  // Suicide / self-harm — specific before broad
  { family: "suicidal_ideation_post_assessment_v1", prefixes: ["R45.851"] },
  { family: "suicide_attempt_post_acute_v1", prefixes: ["T14.91"] },
  {
    family: "self_harm_post_assessment_v1",
    prefixes: ["X71", "X72", "X73", "X74", "X75", "X76", "X77", "X78", "X80", "X81", "X82", "X83", "Z91.5", "Z91.51", "Z91.52"],
  },
  { family: "behavioral_agitation_post_acute_v1", prefixes: ["R45.1"] },
  // Psychosis / mood / anxiety
  { family: "catatonia_post_acute_v1", prefixes: ["F06.1", "F20.2"] },
  { family: "psychosis_post_acute_v1", prefixes: ["F20", "F21", "F22", "F23", "F24", "F25", "F28", "F29"] },
  { family: "mania_post_acute_v1", prefixes: ["F30", "F31"] },
  { family: "depression_crisis_v1", prefixes: ["F32", "F33", "F34", "F39"] },
  { family: "anxiety_panic_crisis_v1", prefixes: ["F40", "F41"] },
  { family: "acute_stress_reaction_v1", prefixes: ["F43"] },
  { family: "behavioral_health_crisis", prefixes: ["F42", "F44", "F45", "F48"] },
  // Delirium / cognitive
  { family: "delirium_post_acute_v1", prefixes: ["F05", "R41.0", "R41.82"] },
  { family: "dementia_behavior_change_v1", prefixes: ["F01", "F02", "F03", "R41.3"] },
  // Substance-induced behavioral crisis (coverage; Phase 16 retains primary tox routing)
  {
    family: "substance_induced_behavioral_crisis_v1",
    prefixes: ["F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19"],
  },
  // Eating / puerperal / pediatric
  { family: "eating_disorder_medical_followup_v1", prefixes: ["F50"] },
  { family: "postpartum_psychiatric_crisis_post_acute_v1", prefixes: ["F53"] },
  { family: "pediatric_behavioral_crisis_v1", prefixes: ["F84", "F90", "F91", "F98", "F70", "F71", "F72", "F73", "F78", "F79"] },
  // Refusal / legal / encounter context
  { family: "informed_refusal_v1", prefixes: ["Z53.2"] },
  { family: "against_medical_advice_v1", prefixes: ["Z53.9", "Z91.19"] },
  { family: "behavioral_health_safety_plan_v1", prefixes: ["Z04.6"] },
  { family: "crisis_resource_followup_v1", prefixes: ["Z75", "Z03.89"] },
  // Legacy behavioral health families (symptom overlap)
  { family: "behavioral_health_crisis", prefixes: ["R45.89", "R45.850"] },
  // Abuse/neglect coverage — forensic provenance preserved
  { family: "behavioral_health_crisis", prefixes: ["T74", "T76", "Y07"] },
];

function bestFamily(code: string): { family: string; length: number } | null {
  let best: { family: string; length: number } | null = null;
  for (const entry of PSYCHIATRIC_BEHAVIORAL_DISCHARGE_PREFIXES) {
    for (const prefix of entry.prefixes) {
      const length = n(prefix).length;
      if (n(code).startsWith(n(prefix)) && (!best || length > best.length)) {
        best = { family: entry.family, length };
      }
    }
  }
  return best;
}

function isSubstancePsychoticOrWithdrawalDelirium(code: string, text: string): boolean {
  if (!/^F(1[0-9])/.test(n(code))) return false;
  return text.includes("psychotic") || text.includes("withdrawal delirium") || text.includes("delirium tremens");
}

function main() {
  const file = getArg("file");
  const release = getArg("release") ?? "2026";
  if (!file) {
    console.error("Missing --file");
    process.exit(1);
  }
  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: hasFlag("allow-dev-sample"),
    skipChecksum: hasFlag("skip-checksum"),
  });
  if (!validation.ok || !validation.parse) {
    console.error("Validation failed");
    for (const e of validation.errors) console.error(`- ${e}`);
    process.exit(1);
  }

  const rows = validation.parse.rows;
  const scoped = selectPsychiatricBehavioralScopedCodes(rows, { billableOnly: true });
  const suicideSelfHarm = selectSuicideSelfHarmScopedCodes(rows, { billableOnly: true });
  const psychoticMoodAnxiety = selectPsychoticMoodAnxietyScopedCodes(rows, { billableOnly: true });
  const deliriumCognitive = selectDeliriumCognitiveScopedCodes(rows, { billableOnly: true });
  const neurodevelopmental = selectNeurodevelopmentalScopedCodes(rows, { billableOnly: true });
  const eatingDisorder = selectEatingDisorderScopedCodes(rows, { billableOnly: true });
  const puerperalMental = selectPuerperalMentalScopedCodes(rows, { billableOnly: true });
  const refusalLegal = selectRefusalLegalScopedCodes(rows, { billableOnly: true });

  const ownershipGaps = (
    [
      ["suicide_self_harm", suicideSelfHarm],
      ["psychotic_mood_anxiety", psychoticMoodAnxiety],
      ["delirium_cognitive", deliriumCognitive],
      ["neurodevelopmental", neurodevelopmental],
      ["eating_disorder", eatingDisorder],
      ["puerperal_mental", puerperalMental],
      ["refusal_legal", refusalLegal],
    ] as const
  )
    .filter(([, bucket]) => bucket.length === 0)
    .map(([id]) => id);

  const unexplainedRoutingFallbacks = scoped.filter((row) => !bestFamily(row.code)).map((row) => row.code);

  // R45.851 suicidal ideation must not route to suicide attempt (T14.91) or self-harm external cause.
  const suicidalIdeation = scoped.filter((row) => starts(row.code, "R45.851"));
  const suicideAttempt = scoped.filter((row) => starts(row.code, "T14.91"));
  const selfHarmExternal = scoped.filter((row) =>
    ["X71", "X72", "X73", "X74", "X75", "X76", "X77", "X78", "X80", "X81", "X82", "X83"].some((prefix) =>
      starts(row.code, prefix),
    ),
  );
  const suicidalIdeationVsAttemptCollision = [
    ...(suicidalIdeation.length === 0 ? ["R45.851_missing_from_scope"] : []),
    ...(suicideAttempt.length === 0 ? ["T14.91_missing_from_scope"] : []),
    ...suicidalIdeation
      .filter((row) => {
        const family = bestFamily(row.code)?.family;
        return family === "suicide_attempt_post_acute_v1" || family === "self_harm_post_assessment_v1";
      })
      .map((row) => row.code),
    ...suicideAttempt
      .filter((row) => bestFamily(row.code)?.family === "suicidal_ideation_post_assessment_v1")
      .map((row) => row.code),
    ...selfHarmExternal
      .filter((row) => bestFamily(row.code)?.family === "suicidal_ideation_post_assessment_v1")
      .map((row) => row.code),
  ];

  // F29 psychosis vs F05 delirium must remain distinct.
  const psychosis = scoped.filter((row) => starts(row.code, "F29") || starts(row.code, "F20"));
  const delirium = scoped.filter((row) => starts(row.code, "F05"));
  const psychosisVsDeliriumCollision = [
    ...(psychosis.length === 0 ? ["F20/F29_missing"] : []),
    ...(delirium.length === 0 ? ["F05_missing"] : []),
    ...psychosis.filter((row) => bestFamily(row.code)?.family === "delirium_post_acute_v1").map((row) => row.code),
    ...delirium.filter((row) => bestFamily(row.code)?.family === "psychosis_post_acute_v1").map((row) => row.code),
  ];

  // F30/F31 mania vs R45.1 agitation.
  const mania = scoped.filter((row) => starts(row.code, "F30") || starts(row.code, "F31"));
  const agitation = scoped.filter((row) => starts(row.code, "R45.1"));
  const maniaVsAgitationCollision = [
    ...(mania.length === 0 ? ["F30/F31_missing"] : []),
    ...(agitation.length === 0 ? ["R45.1_missing"] : []),
    ...mania.filter((row) => bestFamily(row.code)?.family === "behavioral_agitation_post_acute_v1").map((row) => row.code),
    ...agitation.filter((row) => bestFamily(row.code)?.family === "mania_post_acute_v1").map((row) => row.code),
  ];

  // F53 postpartum mental vs OB O* postpartum provenance — F53 must not route to obstetric families.
  const puerperalMentalCodes = scoped.filter((row) => starts(row.code, "F53"));
  const postpartumPsychiatricProvenance = [
    ...(puerperalMentalCodes.length === 0 ? ["F53_missing_from_scope"] : []),
    ...puerperalMentalCodes
      .filter((row) => bestFamily(row.code)?.family !== "postpartum_psychiatric_crisis_post_acute_v1")
      .map((row) => row.code),
  ];

  // F1x.x5 substance psychosis retains substance provenance.
  const substancePsychotic = scoped.filter((row) => isSubstancePsychoticOrWithdrawalDelirium(row.code, descriptionOf(row)));
  const substancePsychosisProvenance = [
    ...(substancePsychotic.length === 0 ? ["substance_psychotic_missing"] : []),
    ...substancePsychotic
      .filter((row) => {
        const family = bestFamily(row.code)?.family;
        return family !== "substance_induced_behavioral_crisis_v1" && family !== "delirium_post_acute_v1";
      })
      .map((row) => row.code),
    ...substancePsychotic
      .filter((row) => {
        const text = descriptionOf(row);
        return text.includes("psychotic") && bestFamily(row.code)?.family === "delirium_post_acute_v1";
      })
      .map((row) => row.code),
  ];

  // NSSI Z91.51 vs suicide attempt T14.91.
  const nssiHistory = scoped.filter((row) => starts(row.code, "Z91.51"));
  const nssiVsSuicideAttemptCollision = [
    ...nssiHistory.filter((row) => bestFamily(row.code)?.family === "suicide_attempt_post_acute_v1").map((row) => row.code),
    ...suicideAttempt.filter((row) => bestFamily(row.code)?.family === "self_harm_post_assessment_v1").map((row) => row.code),
  ];

  // Capacity/refusal Z53 must not steal underlying psychiatric diagnosis routing.
  const refusalCodes = scoped.filter((row) => starts(row.code, "Z53.2") || starts(row.code, "Z53.9"));
  const refusalStealsUnderlyingDiagnosis = refusalCodes
    .filter((row) => {
      const family = bestFamily(row.code)?.family;
      return family !== "informed_refusal_v1" && family !== "against_medical_advice_v1";
    })
    .map((row) => row.code);

  // Cross-phase codes must not appear in Phase 18 scope under routing.
  const crossPhaseUnderRouting = scoped
    .filter(
      (row) =>
        starts(row.code, "T67") ||
        starts(row.code, "T68") ||
        starts(row.code, "W54") ||
        starts(row.code, "T58") ||
        starts(row.code, "N49.3") ||
        /^T(3[6-9]|4[0-9]|50)/.test(n(row.code)) ||
        /^O/.test(n(row.code)),
    )
    .map((row) => row.code);

  const report = {
    unexplainedRoutingFallbacks,
    suicidalIdeationVsAttemptCollision,
    psychosisVsDeliriumCollision,
    maniaVsAgitationCollision,
    postpartumPsychiatricProvenance,
    substancePsychosisProvenance,
    nssiVsSuicideAttemptCollision,
    refusalStealsUnderlyingDiagnosis,
    crossPhaseUnderRouting,
    ownershipGaps,
    counts: {
      scoped: scoped.length,
      suicideSelfHarm: suicideSelfHarm.length,
      psychoticMoodAnxiety: psychoticMoodAnxiety.length,
      deliriumCognitive: deliriumCognitive.length,
      neurodevelopmental: neurodevelopmental.length,
      eatingDisorder: eatingDisorder.length,
      puerperalMental: puerperalMental.length,
      refusalLegal: refusalLegal.length,
      suicidalIdeation: suicidalIdeation.length,
      suicideAttempt: suicideAttempt.length,
      selfHarmExternal: selfHarmExternal.length,
      psychosis: psychosis.length,
      delirium: delirium.length,
      mania: mania.length,
      agitation: agitation.length,
      substancePsychotic: substancePsychotic.length,
      nssiHistory: nssiHistory.length,
      refusalCodes: refusalCodes.length,
    },
    certification: {
      pass:
        unexplainedRoutingFallbacks.length === 0 &&
        suicidalIdeationVsAttemptCollision.length === 0 &&
        psychosisVsDeliriumCollision.length === 0 &&
        maniaVsAgitationCollision.length === 0 &&
        postpartumPsychiatricProvenance.length === 0 &&
        substancePsychosisProvenance.length === 0 &&
        nssiVsSuicideAttemptCollision.length === 0 &&
        refusalStealsUnderlyingDiagnosis.length === 0 &&
        crossPhaseUnderRouting.length === 0 &&
        ownershipGaps.length === 0,
    },
  };

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-psychiatric-behavioral-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-psychiatric-behavioral-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.certification.pass ? 0 : 2);
}

main();
