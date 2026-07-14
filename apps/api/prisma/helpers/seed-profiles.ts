/**
 * MEDUI.PLATFORM.SEED_MODULARIZATION — seed profile resolution.
 *
 * Profiles:
 * - full (default): enterprise configuration + Haiti demo users/patients/clinical data
 * - enterprise: roles, geo, bootstrap facilities, catalogs, ICD sample, packet templates
 *              (no demo credentials, patients, or clinical demo rows)
 *
 * Override via MEDORA_SEED_PROFILE=enterprise|full
 * Optional module list: MEDORA_SEED_MODULES=core,catalogs,templates,demo
 */

export type MedoraSeedProfile = "full" | "enterprise";

export type MedoraSeedModuleId =
  | "core"
  | "facilities"
  | "catalogs"
  | "icd10"
  | "templates"
  | "demo";

const ENTERPRISE_MODULES: MedoraSeedModuleId[] = [
  "core",
  "facilities",
  "catalogs",
  "icd10",
  "templates",
];

const FULL_MODULES: MedoraSeedModuleId[] = [...ENTERPRISE_MODULES, "demo"];

export function resolveMedoraSeedProfile(
  env: NodeJS.ProcessEnv = process.env,
): MedoraSeedProfile {
  const raw = (env.MEDORA_SEED_PROFILE || env.SEED_PROFILE || "full").trim().toLowerCase();
  if (raw === "enterprise" || raw === "production" || raw === "prod") return "enterprise";
  if (raw === "full" || raw === "demo" || raw === "dev") return "full";
  return "full";
}

export function resolveMedoraSeedModules(
  env: NodeJS.ProcessEnv = process.env,
): MedoraSeedModuleId[] {
  const explicit = (env.MEDORA_SEED_MODULES || "").trim();
  if (explicit) {
    const allowed = new Set<MedoraSeedModuleId>(FULL_MODULES);
    const parsed = explicit
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is MedoraSeedModuleId => allowed.has(s as MedoraSeedModuleId));
    if (parsed.length === 0) {
      throw new Error(
        `MEDORA_SEED_MODULES empty or invalid. Allowed: ${FULL_MODULES.join(", ")}`,
      );
    }
    return [...new Set(parsed)];
  }
  return resolveMedoraSeedProfile(env) === "enterprise" ? [...ENTERPRISE_MODULES] : [...FULL_MODULES];
}

export function seedModuleEnabled(
  modules: MedoraSeedModuleId[],
  id: MedoraSeedModuleId,
): boolean {
  return modules.includes(id);
}
