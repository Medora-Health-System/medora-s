/**
 * MEDUI.PLATFORM.SEED_MODULARIZATION — seed mode resolution + production guards.
 *
 * Modes (MEDORA_SEED_MODE):
 * - core              roles + facility-independent geo metadata
 * - templates         registration packet templates
 * - clinical-content  ICD + medication/lab/imaging catalogs
 * - demo              Haiti demo facilities/users/patients/clinical rows
 * - all               core → clinical-content → templates → demo
 *
 * Defaults:
 * - production: core
 * - development/test/other: all (preserves local `prisma db seed` behavior)
 *
 * Backward-compat:
 * - MEDORA_SEED_PROFILE=enterprise → core+clinical-content+templates
 * - MEDORA_SEED_PROFILE=full → all
 */

export type MedoraSeedMode =
  | "core"
  | "templates"
  | "clinical-content"
  | "demo"
  | "all";

export type MedoraSeedStep =
  | "core"
  | "clinical-content"
  | "templates"
  | "demo";

const ALL_STEPS: MedoraSeedStep[] = ["core", "clinical-content", "templates", "demo"];

export function isProductionEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.NODE_ENV || "").trim().toLowerCase() === "production";
}

export function resolveMedoraSeedMode(env: NodeJS.ProcessEnv = process.env): MedoraSeedMode {
  const explicit = (env.MEDORA_SEED_MODE || "").trim().toLowerCase();
  if (
    explicit === "core" ||
    explicit === "templates" ||
    explicit === "clinical-content" ||
    explicit === "demo" ||
    explicit === "all"
  ) {
    return explicit;
  }

  // Backward compatibility with earlier MEDORA_SEED_PROFILE switch.
  const profile = (env.MEDORA_SEED_PROFILE || env.SEED_PROFILE || "").trim().toLowerCase();
  if (profile === "enterprise" || profile === "production" || profile === "prod") {
    return "core"; // callers should compose; orchestrator expands profile→steps below
  }
  if (profile === "full" || profile === "demo" || profile === "dev") {
    return "all";
  }

  return isProductionEnv(env) ? "core" : "all";
}

/**
 * Resolve ordered steps to execute for the active mode/profile.
 * Profile=enterprise runs core+clinical-content+templates (no demo).
 */
export function resolveMedoraSeedSteps(env: NodeJS.ProcessEnv = process.env): MedoraSeedStep[] {
  const profile = (env.MEDORA_SEED_PROFILE || "").trim().toLowerCase();
  if (
    !env.MEDORA_SEED_MODE &&
    (profile === "enterprise" || profile === "production" || profile === "prod")
  ) {
    return ["core", "clinical-content", "templates"];
  }

  const mode = resolveMedoraSeedMode(env);
  switch (mode) {
    case "core":
      return ["core"];
    case "templates":
      return ["templates"];
    case "clinical-content":
      return ["clinical-content"];
    case "demo":
      return ["demo"];
    case "all":
      return [...ALL_STEPS];
    default:
      return [...ALL_STEPS];
  }
}

export function assertDemoSeedAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (!isProductionEnv(env)) return;
  const allow = (env.MEDORA_ALLOW_DEMO_SEED_IN_PRODUCTION || "").trim().toLowerCase();
  if (allow === "true" || allow === "1" || allow === "yes") return;
  throw new Error(
    [
      "Refusing to run demo seed in production.",
      "Demo mode creates demo users, patients, and clinical rows.",
      "Set MEDORA_ALLOW_DEMO_SEED_IN_PRODUCTION=true to override (dangerous).",
    ].join(" "),
  );
}

export function seedStepEnabled(steps: MedoraSeedStep[], step: MedoraSeedStep): boolean {
  return steps.includes(step);
}
