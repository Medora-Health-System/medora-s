/**
 * Routing certification for OB/GYN and urology ICD codes (Phase 17).
 *
 * Prefix maps align with planned Phase 17 discharge family IDs (Part 36) and existing
 * web resolver families where already present (kidney_stone, uti_urinary_symptoms, etc.).
 *
 *   pnpm --filter @medora/api icd:routing:obgyn-urology -- \
 *     --file=/path/to/zip --release=2026
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectGynecologicScopedCodes,
  selectGuTraumaScopedCodes,
  selectObGynUrologyScopedCodes,
  selectObstetricScopedCodes,
  selectUrologicScopedCodes,
} from "./icd10-obgyn-urology-scope";
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

/** Planned Phase 17 / existing web discharge family IDs. Longest-prefix wins. */
const OBGYN_UROLOGY_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  // Obstetric — ectopic / abnormal products / abortion
  { family: "obgyn_ectopic_pregnancy", prefixes: ["O00"] },
  { family: "obgyn_molar_pregnancy", prefixes: ["O01"] },
  { family: "obgyn_pregnancy_unknown_location", prefixes: ["O02.81"] },
  { family: "obgyn_abnormal_products", prefixes: ["O02"] },
  { family: "obgyn_spontaneous_abortion", prefixes: ["O03"] },
  { family: "obgyn_termination_complications", prefixes: ["O04", "O07", "O08"] },
  { family: "obgyn_hypertensive_disorders", prefixes: ["O10", "O11", "O12", "O13", "O14", "O15", "O16"] },
  { family: "obgyn_threatened_miscarriage", prefixes: ["O20.0"] },
  { family: "obgyn_early_pregnancy_bleeding", prefixes: ["O20"] },
  { family: "obgyn_hyperemesis", prefixes: ["O21"] },
  { family: "obgyn_gu_infection_pregnancy", prefixes: ["O23"] },
  { family: "obgyn_maternal_care_other", prefixes: ["O26"] },
  { family: "obgyn_prom_previa_abruption", prefixes: ["O42", "O44", "O45", "O46"] },
  { family: "obgyn_false_labor", prefixes: ["O47"] },
  { family: "obgyn_preterm_labor", prefixes: ["O60"] },
  { family: "obgyn_postpartum_hemorrhage", prefixes: ["O72"] },
  { family: "obgyn_retained_placenta", prefixes: ["O73"] },
  { family: "obgyn_puerperal_infection", prefixes: ["O85", "O86"] },
  { family: "obgyn_puerperal_complications", prefixes: ["O90"] },
  { family: "obgyn_labor_delivery_complications", prefixes: ["O62", "O63", "O64", "O65", "O66", "O67", "O68", "O69", "O70", "O71", "O74", "O75"] },
  { family: "obgyn_fetal_maternal_care", prefixes: ["O30", "O31", "O32", "O33", "O34", "O35", "O36", "O40", "O41", "O43", "O48"] },
  { family: "obgyn_maternal_disease", prefixes: ["O98", "O99"] },
  { family: "obgyn_gestation_weeks", prefixes: ["Z3A"] },
  { family: "obgyn_pregnancy_encounters", prefixes: ["Z32", "Z33", "Z34"] },
  { family: "obgyn_postpartum_encounter", prefixes: ["Z39"] },
  // Gynecologic
  // N70.0*/N70.03 claimed by TOA family (longer prefix); remaining N70* stay PID/salpingo-oophoritis.
  { family: "obgyn_pid", prefixes: ["N70", "N71", "N72", "N73", "N74"] },
  { family: "obgyn_tubo_ovarian_abscess", prefixes: ["N70.03"] },
  { family: "obgyn_bartholin", prefixes: ["N75"] },
  { family: "obgyn_vulvovaginal_inflammation", prefixes: ["N76"] },
  { family: "obgyn_endometriosis", prefixes: ["N80"] },
  { family: "obgyn_ovarian_torsion", prefixes: ["N83.5"] },
  { family: "obgyn_ovarian_cyst", prefixes: ["N83.2"] },
  { family: "obgyn_ovarian_disorders", prefixes: ["N83"] },
  { family: "obgyn_uterine_disorders", prefixes: ["N85"] },
  { family: "obgyn_menstrual_bleeding", prefixes: ["N92", "N93"] },
  { family: "obgyn_bleeding_pelvic_pain", prefixes: ["N94"] },
  { family: "obgyn_menopausal", prefixes: ["N95"] },
  { family: "obgyn_postprocedural", prefixes: ["N99"] },
  { family: "obgyn_iud_complication", prefixes: ["T83.3"] },
  { family: "obgyn_vaginitis", prefixes: ["A59.0", "B37.3", "A60"] },
  // Urologic — existing web families where applicable
  { family: "necrotizing_soft_tissue_infection_post_acute", prefixes: ["N49.3"] },
  { family: "urology_pyelonephritis", prefixes: ["N10", "N12"] },
  { family: "urology_obstructive_uropathy", prefixes: ["N13"] },
  { family: "kidney_stone", prefixes: ["N20", "N21", "N23"] },
  { family: "uti_urinary_symptoms", prefixes: ["N30", "N39", "R30"] },
  { family: "urology_prostatitis", prefixes: ["N41"] },
  { family: "urology_testicular_torsion", prefixes: ["N44"] },
  { family: "urology_epididymitis_orchitis", prefixes: ["N45"] },
  { family: "urology_scrotal_disorders", prefixes: ["N43", "N49", "N50"] },
  { family: "urology_prepuce", prefixes: ["N47"] },
  { family: "urology_penis_disorders", prefixes: ["N48"] },
  { family: "hematuria", prefixes: ["R31"] },
  { family: "urinary_retention", prefixes: ["R33"] },
  { family: "urology_urinary_symptoms", prefixes: ["R39"] },
  { family: "urology_gu_device_complication", prefixes: ["T83"] },
  // GU trauma overlap coverage
  { family: "gu_trauma_organ_injury", prefixes: ["S37"] },
  { family: "gu_trauma_genital_contusion", prefixes: ["S30.2"] },
  { family: "gu_trauma_genital_open_wound", prefixes: ["S31.2"] },
];

function bestFamily(code: string): { family: string; length: number } | null {
  let best: { family: string; length: number } | null = null;
  for (const entry of OBGYN_UROLOGY_DISCHARGE_PREFIXES) {
    for (const prefix of entry.prefixes) {
      const length = n(prefix).length;
      if (n(code).startsWith(n(prefix)) && (!best || length > best.length)) {
        best = { family: entry.family, length };
      }
    }
  }
  return best;
}

function hasTrimesterVariant(codes: Array<{ code: string; shortDescription: string; longDescription?: string }>): boolean {
  const trimesterMarkers = ["first trimester", "second trimester", "third trimester", "unspecified trimester"];
  const hits = new Set<string>();
  for (const row of codes) {
    const text = descriptionOf(row);
    for (const marker of trimesterMarkers) {
      if (text.includes(marker)) hits.add(marker);
    }
  }
  return hits.size >= 2;
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
  const scoped = selectObGynUrologyScopedCodes(rows, { billableOnly: true });
  const obstetric = selectObstetricScopedCodes(rows, { billableOnly: true });
  const gynecologic = selectGynecologicScopedCodes(rows, { billableOnly: true });
  const urologic = selectUrologicScopedCodes(rows, { billableOnly: true });
  const guTrauma = selectGuTraumaScopedCodes(rows, { billableOnly: true });

  const ownershipGaps = (
    [
      ["obstetric", obstetric],
      ["gynecologic", gynecologic],
      ["urologic", urologic],
      ["gu_trauma", guTrauma],
    ] as const
  )
    .filter(([, bucket]) => bucket.length === 0)
    .map(([id]) => id);

  const unexplainedRoutingFallbacks = scoped.filter((row) => !bestFamily(row.code)).map((row) => row.code);

  // O02.81 pregnancy of unknown location must not route to ectopic (O00*).
  const pulCodes = scoped.filter((row) => starts(row.code, "O02.81"));
  const ectopicCodes = scoped.filter((row) => starts(row.code, "O00"));
  const pregnancyUnknownLocationVsEctopic = [
    ...(pulCodes.length === 0 ? ["O02.81_missing_from_scope"] : []),
    ...(ectopicCodes.length === 0 ? ["O00_missing_from_scope"] : []),
    ...pulCodes
      .filter((row) => bestFamily(row.code)?.family === "obgyn_ectopic_pregnancy")
      .map((row) => row.code),
    ...ectopicCodes
      .filter((row) => bestFamily(row.code)?.family === "obgyn_pregnancy_unknown_location")
      .map((row) => row.code),
  ];

  // Threatened miscarriage (O20.0) must not collapse into spontaneous abortion (O03).
  const threatened = scoped.filter((row) => starts(row.code, "O20.0"));
  const spontaneousAbortion = scoped.filter((row) => starts(row.code, "O03"));
  const threatenedVsSpontaneousAbortionCollision = [
    ...(threatened.length === 0 ? ["O20.0_missing"] : []),
    ...(spontaneousAbortion.length === 0 ? ["O03_missing"] : []),
    ...threatened.filter((row) => bestFamily(row.code)?.family === "obgyn_spontaneous_abortion").map((row) => row.code),
    ...spontaneousAbortion.filter((row) => bestFamily(row.code)?.family === "obgyn_threatened_miscarriage").map((row) => row.code),
  ];

  // Trimester-specific obstetric codes must remain distinguishable in official release.
  const trimesterObstetric = obstetric.filter((row) => starts(row.code, "O00") || starts(row.code, "O03") || starts(row.code, "O14"));
  const trimesterPreservation =
    trimesterObstetric.length > 0 && !hasTrimesterVariant(trimesterObstetric) ? ["trimester_variants_missing"] : [];

  // Postpartum provenance buckets must remain distinct.
  const postpartumHemorrhage = scoped.filter((row) => starts(row.code, "O72"));
  const puerperalInfection = scoped.filter((row) => starts(row.code, "O85") || starts(row.code, "O86"));
  const puerperalComplications = scoped.filter((row) => starts(row.code, "O90"));
  const postpartumProvenance = [
    ...(postpartumHemorrhage.some((row) => bestFamily(row.code)?.family !== "obgyn_postpartum_hemorrhage")
      ? postpartumHemorrhage.filter((row) => bestFamily(row.code)?.family !== "obgyn_postpartum_hemorrhage").map((row) => row.code)
      : []),
    ...(puerperalInfection.some((row) => bestFamily(row.code)?.family !== "obgyn_puerperal_infection")
      ? puerperalInfection.filter((row) => bestFamily(row.code)?.family !== "obgyn_puerperal_infection").map((row) => row.code)
      : []),
    ...(puerperalComplications.some((row) => bestFamily(row.code)?.family !== "obgyn_puerperal_complications")
      ? puerperalComplications.filter((row) => bestFamily(row.code)?.family !== "obgyn_puerperal_complications").map((row) => row.code)
      : []),
  ];

  // Ovarian torsion N83.5 vs simple cyst N83.2.
  const ovarianTorsion = scoped.filter((row) => starts(row.code, "N83.5"));
  const ovarianCyst = scoped.filter((row) => starts(row.code, "N83.2"));
  const ovarianTorsionVsCyst = [
    ...(ovarianTorsion.length === 0 ? ["N83.5_missing"] : []),
    ...(ovarianCyst.length === 0 ? ["N83.2_missing"] : []),
    ...ovarianTorsion.filter((row) => bestFamily(row.code)?.family === "obgyn_ovarian_cyst").map((row) => row.code),
    ...ovarianCyst.filter((row) => bestFamily(row.code)?.family === "obgyn_ovarian_torsion").map((row) => row.code),
  ];

  // PID/salpingitis vs acute salpingo-oophoritis (clinical TOA pathway via N70.03).
  const toa = scoped.filter((row) => starts(row.code, "N70.03"));
  const pidGeneral = scoped.filter(
    (row) => (starts(row.code, "N73") || starts(row.code, "N70")) && !starts(row.code, "N70.03"),
  );
  const pidVsTuboOvarianAbscess = [
    ...toa.filter((row) => bestFamily(row.code)?.family === "obgyn_pid").map((row) => row.code),
    ...pidGeneral.filter((row) => bestFamily(row.code)?.family === "obgyn_tubo_ovarian_abscess").map((row) => row.code),
  ];

  // Stone N20 vs pyelonephritis N10 vs infected obstruction N13.
  const stones = scoped.filter((row) => starts(row.code, "N20") || starts(row.code, "N21") || starts(row.code, "N23"));
  const pyelo = scoped.filter((row) => starts(row.code, "N10"));
  const obstructive = scoped.filter((row) => starts(row.code, "N13"));
  const stonePyeloObstructionCollision = [
    ...(stones.length === 0 ? ["N20_missing"] : []),
    ...(pyelo.length === 0 ? ["N10_missing"] : []),
    ...(obstructive.length === 0 ? ["N13_missing"] : []),
    ...stones.filter((row) => bestFamily(row.code)?.family === "urology_pyelonephritis").map((row) => row.code),
    ...pyelo.filter((row) => bestFamily(row.code)?.family === "kidney_stone").map((row) => row.code),
    ...obstructive.filter((row) => bestFamily(row.code)?.family === "kidney_stone").map((row) => row.code),
  ];

  // Testicular torsion N44 vs epididymitis N45.
  const torsion = scoped.filter((row) => starts(row.code, "N44"));
  const epididymitis = scoped.filter((row) => starts(row.code, "N45"));
  const testicularTorsionVsEpididymitis = [
    ...(torsion.length === 0 ? ["N44_missing"] : []),
    ...(epididymitis.length === 0 ? ["N45_missing"] : []),
    ...torsion.filter((row) => bestFamily(row.code)?.family === "urology_epididymitis_orchitis").map((row) => row.code),
    ...epididymitis.filter((row) => bestFamily(row.code)?.family === "urology_testicular_torsion").map((row) => row.code),
  ];

  // Fournier N49.3 must route to Phase 13 NSTI family, not urology scrotal.
  const fournier = scoped.filter((row) => starts(row.code, "N49.3"));
  const fournierRoutingCollision = [
    ...(fournier.length === 0 ? ["N49.3_missing_from_scope"] : []),
    ...fournier
      .filter((row) => {
        const family = bestFamily(row.code)?.family;
        return family !== "necrotizing_soft_tissue_infection_post_acute";
      })
      .map((row) => row.code),
  ];

  // Animal bites must not appear in Phase 17 scope.
  const biteUnderRouting = scoped
    .filter((row) => starts(row.code, "W54") || starts(row.code, "W55") || starts(row.code, "W50"))
    .map((row) => row.code);

  const report = {
    unexplainedRoutingFallbacks,
    pregnancyUnknownLocationVsEctopic,
    threatenedVsSpontaneousAbortionCollision,
    trimesterPreservation,
    postpartumProvenance,
    ovarianTorsionVsCyst,
    pidVsTuboOvarianAbscess,
    stonePyeloObstructionCollision,
    testicularTorsionVsEpididymitis,
    fournierRoutingCollision,
    biteUnderRouting,
    ownershipGaps,
    counts: {
      scoped: scoped.length,
      obstetric: obstetric.length,
      gynecologic: gynecologic.length,
      urologic: urologic.length,
      guTrauma: guTrauma.length,
      pregnancyUnknownLocation: pulCodes.length,
      ectopic: ectopicCodes.length,
      threatenedMiscarriage: threatened.length,
      spontaneousAbortion: spontaneousAbortion.length,
      ovarianTorsion: ovarianTorsion.length,
      ovarianCyst: ovarianCyst.length,
      fournier: fournier.length,
    },
    certification: {
      pass:
        unexplainedRoutingFallbacks.length === 0 &&
        pregnancyUnknownLocationVsEctopic.length === 0 &&
        threatenedVsSpontaneousAbortionCollision.length === 0 &&
        trimesterPreservation.length === 0 &&
        postpartumProvenance.length === 0 &&
        ovarianTorsionVsCyst.length === 0 &&
        pidVsTuboOvarianAbscess.length === 0 &&
        stonePyeloObstructionCollision.length === 0 &&
        testicularTorsionVsEpididymitis.length === 0 &&
        fournierRoutingCollision.length === 0 &&
        biteUnderRouting.length === 0 &&
        ownershipGaps.length === 0,
    },
  };

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-obgyn-urology-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-obgyn-urology-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.certification.pass ? 0 : 2);
}

main();
