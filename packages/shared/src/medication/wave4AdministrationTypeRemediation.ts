/**
 * M1.7C.6 — Wave 4 administration-type remediation (generator, validation, seed guard).
 */

export const WAVE4_SAFE_MAR_ADMIN_TYPES = new Set([
  "ORAL",
  "IM",
  "SQ",
  "PUSH",
  "INFUSION",
]);

export const WAVE4_ONDANSETRON_IV_CATALOG_CODE =
  "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION" as const;

/** M1.7C.5 — nebulizer / intranasal SKUs remain MAR-blocked at gate. */
export const WAVE4_KEEP_BLOCKED_RESPIRATORY_CATALOG_CODES = new Set<string>([
  "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION",
  "ALBUTEROL_0_5_SOLUTION_DE_NEBULISATION_INHALEE",
  "IPRATROPIUM_0_5_MG_2_5_ML_SOLUTION_DE_NEBULISATION_INHALEE",
  "RACEMIC_EPINEPHRINE_2_25_SOLUTION_DE_NEBULISATION_INHALEE",
  "MAGNESIUM_SULFATE_1_G_50_ML_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
  "BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE",
  "TERBUTALINE_0_25_MG_ML_SOLUTION_DE_NEBULISATION_INHALEE",
  "NALOXONE_4_MG_0_4_ML_INJECTABLE_INTRANASALE",
  "MIDAZOLAM_5_MG_0_5_ML_NASAL_SOLUTION_NASALE_NASALE",
  "ALBUTEROL_0_083_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
  "RACEMIC_EPINEPHRINE_0_25_ML_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
]);

/** M1.7C.6 — manifest remediated; MAR enable deferred pending clinical sign-off. */
export const WAVE4_CLINICAL_REVIEW_REQUIRED_CATALOG_CODES = new Set<string>([
  "SUCCINYLCHOLINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "SUCCINYLCHOLINE_100_MG_POUDRE_INTRAVEINEUSE",
  "ROCURONIUM_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "ROCURONIUM_50_MG_5_ML_INJECTABLE_INTRAVEINEUSE",
  "VECURONIUM_10_MG_POUDRE_INTRAVEINEUSE",
  "VECURONIUM_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "LIDOCAINE_1_INJECTABLE_INJECTABLE",
  "LIDOCAINE_2_INJECTABLE_INJECTABLE",
  "BUPIVACAINE_0_25_INJECTABLE_INJECTABLE",
  "BUPIVACAINE_0_5_INJECTABLE_INJECTABLE",
  "PHENYLEPHRINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "GLUCAGON_1_MG_POUDRE_INJECTABLE",
]);

const GATE_BLOCKED_ADMIN_TYPES = new Set(["INJECTION", "SUBCUTANEOUS"]);

const EXPLICIT_EMIT_TYPES = new Set([
  ...WAVE4_SAFE_MAR_ADMIN_TYPES,
  "INHALATION",
  "TOPICAL",
  "ORAL",
]);

export type Wave4GeneratorRowInput = {
  catalogCode: string;
  explicitAdministrationType?: string | null;
  route: string;
  dosageForm: string;
  therapeuticClass?: string;
};

export type Wave4CatalogAdministrationResolveResult = {
  value: string | null;
  conflict?: string;
  keptExisting?: boolean;
};

function normalizeAdministrationType(value: string | null | undefined): string | null {
  const upper = value?.trim().toUpperCase();
  if (!upper) return null;
  if (upper === "SUBCUTANEOUS") return "SQ";
  return upper;
}

function isInfusionContext(input: {
  dosageForm: string;
  route: string;
  therapeuticClass?: string;
}): boolean {
  const form = input.dosageForm.toLowerCase();
  const route = input.route.toLowerCase();
  const tc = (input.therapeuticClass ?? "").toLowerCase();
  if (form.includes("perfusion")) return true;
  if (route.includes("perfusion")) return true;
  if (tc.includes("perfusion") || tc.includes("drip") || tc.includes("pca")) return true;
  if (tc.includes("continuous") && tc.includes("infusion")) return true;
  return false;
}

function inferFromRouteAndForm(input: Wave4GeneratorRowInput): string {
  const route = input.route.toLowerCase();
  const form = input.dosageForm.toLowerCase();

  if (route.includes("intranasale") || route.includes("nasale")) return "INHALATION";
  if (form.includes("inhal") || form.includes("nébul") || form.includes("nebul") || route.includes("inhal")) {
    return "INHALATION";
  }
  if (route === "topique" || form.includes("topique")) return "TOPICAL";
  if (route === "orale" || form.includes("comprimé") || form.includes("comprime") || form.includes("sirop")) {
    return "ORAL";
  }
  if (route.includes("sous-cutan") || route.includes("subcut")) return "SQ";
  if (route.includes("intramusculaire")) return "IM";
  if (isInfusionContext(input)) return "INFUSION";
  if (route.includes("intraveineuse") || form.includes("injectable") || form.includes("poudre")) {
    return "PUSH";
  }
  if (route === "injectable") return "PUSH";
  return "ORAL";
}

/**
 * Generator inference — priority: safe explicit → prior wave → Haiti → route/form.
 * Never emits INJECTION or SUBCUTANEOUS.
 */
export function inferWave4AdministrationType(
  input: Wave4GeneratorRowInput,
  priorWaveAdminByCode: Readonly<Record<string, string | null | undefined>>,
  haitiAdminByCode: Readonly<Record<string, string | null | undefined>>
): string {
  const explicit = normalizeAdministrationType(input.explicitAdministrationType ?? null);
  if (explicit && EXPLICIT_EMIT_TYPES.has(explicit) && !GATE_BLOCKED_ADMIN_TYPES.has(explicit)) {
    return explicit;
  }

  const prior = normalizeAdministrationType(priorWaveAdminByCode[input.catalogCode]);
  if (prior && WAVE4_SAFE_MAR_ADMIN_TYPES.has(prior)) return prior;

  const haiti = normalizeAdministrationType(haitiAdminByCode[input.catalogCode]);
  if (haiti && WAVE4_SAFE_MAR_ADMIN_TYPES.has(haiti)) return haiti;

  return inferFromRouteAndForm(input);
}

/** Seed/catalog upsert — never downgrade an existing SAFE MAR type to a gate-blocked type. */
export function resolveWave4CatalogAdministrationType(input: {
  existingAdministrationType: string | null | undefined;
  incomingAdministrationType: string | null | undefined;
  mode: "CREATE" | "ENRICH";
  route: string;
  dosageForm?: string;
  catalogCode: string;
}): Wave4CatalogAdministrationResolveResult {
  const existing = normalizeAdministrationType(input.existingAdministrationType);
  const incoming = normalizeAdministrationType(input.incomingAdministrationType);

  if (!incoming) {
    return { value: existing };
  }

  if (existing && WAVE4_SAFE_MAR_ADMIN_TYPES.has(existing)) {
    if (GATE_BLOCKED_ADMIN_TYPES.has(incoming) || incoming === "INHALATION") {
      return {
        value: existing,
        keptExisting: true,
        conflict: `${input.catalogCode}: kept existing ${existing} over incoming ${incoming}`,
      };
    }
    if (existing === incoming) {
      return { value: existing };
    }
    if (WAVE4_SAFE_MAR_ADMIN_TYPES.has(incoming)) {
      return { value: incoming };
    }
    return {
      value: existing,
      keptExisting: true,
      conflict: `${input.catalogCode}: kept existing ${existing} over incoming ${incoming}`,
    };
  }

  if (GATE_BLOCKED_ADMIN_TYPES.has(incoming)) {
    const inferred = inferFromRouteAndForm({
      catalogCode: input.catalogCode,
      route: input.route,
      dosageForm: input.dosageForm ?? "",
    });
    return {
      value: inferred,
      conflict: `${input.catalogCode}: normalized incoming ${incoming} → ${inferred}`,
    };
  }

  return { value: incoming };
}

export function isWave4ClinicalReviewRequired(catalogCode: string): boolean {
  return WAVE4_CLINICAL_REVIEW_REQUIRED_CATALOG_CODES.has(catalogCode);
}

export function isWave4KeepBlockedRespiratory(catalogCode: string): boolean {
  return WAVE4_KEEP_BLOCKED_RESPIRATORY_CATALOG_CODES.has(catalogCode);
}

export function validateWave4OndansetronAdministrationType(
  administrationType: string | null | undefined
): string[] {
  const admin = normalizeAdministrationType(administrationType);
  if (admin !== "PUSH") {
    return [
      `${WAVE4_ONDANSETRON_IV_CATALOG_CODE}: ondansetron IV must be PUSH (got ${administrationType ?? "null"})`,
    ];
  }
  return [];
}

export function validateWave4MarAdministrationTypePolicy(
  entries: ReadonlyArray<{ catalogCode: string; administrationType?: string | null }>
): string[] {
  const errors: string[] = [];

  for (const entry of entries) {
    const admin = normalizeAdministrationType(entry.administrationType ?? null);

    if (admin === "SUBCUTANEOUS") {
      errors.push(`${entry.catalogCode}: SUBCUTANEOUS must be SQ`);
    }

    if (admin === "INJECTION") {
      errors.push(`${entry.catalogCode}: INJECTION is gate-blocked — use PUSH/IM/SQ/INFUSION`);
    }

    if (isWave4KeepBlockedRespiratory(entry.catalogCode)) {
      if (admin !== "INHALATION") {
        errors.push(`${entry.catalogCode}: respiratory/intranasal SKU must remain INHALATION`);
      }
      continue;
    }

    if (admin && !WAVE4_SAFE_MAR_ADMIN_TYPES.has(admin) && admin !== "INHALATION" && admin !== "TOPICAL") {
      errors.push(`${entry.catalogCode}: unsupported administrationType ${admin}`);
    }
  }

  const ondansetron = entries.find((e) => e.catalogCode === WAVE4_ONDANSETRON_IV_CATALOG_CODE);
  if (ondansetron) {
    errors.push(...validateWave4OndansetronAdministrationType(ondansetron.administrationType));
  } else {
    errors.push(`${WAVE4_ONDANSETRON_IV_CATALOG_CODE}: missing from Wave 4 manifest`);
  }

  return errors;
}

export function validateWave4ClinicalReviewQueue(
  entries: ReadonlyArray<{ catalogCode: string; administrationType?: string | null }>
): string[] {
  const errors: string[] = [];
  const byCode = new Map(entries.map((e) => [e.catalogCode, e]));

  for (const code of WAVE4_CLINICAL_REVIEW_REQUIRED_CATALOG_CODES) {
    const entry = byCode.get(code);
    if (!entry) {
      errors.push(`${code}: missing from clinical review queue manifest`);
      continue;
    }
    const admin = normalizeAdministrationType(entry.administrationType ?? null);
    if (!admin || !WAVE4_SAFE_MAR_ADMIN_TYPES.has(admin)) {
      errors.push(`${code}: clinical review SKU must have gate-safe administrationType (got ${admin ?? "null"})`);
    }
  }

  return errors;
}

export function countWave4RemediationAdministrationTypes(
  entries: ReadonlyArray<{ catalogCode: string; administrationType?: string | null }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const admin = normalizeAdministrationType(entry.administrationType ?? null) ?? "MISSING";
    counts[admin] = (counts[admin] ?? 0) + 1;
  }
  return counts;
}

/** Product row admin type derived from remediated catalog value (never INJECTION/SUBCUTANEOUS). */
export function resolveWave4ProductAdministrationType(
  resolvedCatalogAdministrationType: string | null | undefined
): string {
  const admin = normalizeAdministrationType(resolvedCatalogAdministrationType);
  if (!admin) return "OTHER";
  if (admin === "INJECTION") return "PUSH";
  return admin;
}
