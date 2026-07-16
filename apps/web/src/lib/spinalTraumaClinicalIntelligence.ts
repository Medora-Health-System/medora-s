import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export type SpinalTraumaContext = {
  mechanisms: string[];
  regions: string[];
  findings: string[];
  dischargeFamilyId: string | null;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function resolveSpinalTraumaContext(input: { code?: string; displayName?: string; documentedFlags?: readonly string[] }): SpinalTraumaContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const mechanisms = [
    /motor vehicle|mvc|collision/.test(text) && "motor_vehicle_collision",
    /fall/.test(text) && "fall",
    /diving/.test(text) && "diving",
    /assault/.test(text) && "assault",
  ].filter(Boolean) as string[];
  const regions = [
    /cervical|s12|s14/.test(text) && "cervical",
    /thoracic|s22\.0|s22\.1|s24/.test(text) && "thoracic",
    /lumbar|s32\.0|s34/.test(text) && "lumbar",
  ].filter(Boolean) as string[];
  const findings = [
    /spinal cord injury|s14|s24|s34/.test(text) && "spinal_cord_injury",
    /central cord/.test(text) && "central_cord_syndrome",
    /anterior cord/.test(text) && "anterior_cord_syndrome",
    /posterior cord/.test(text) && "posterior_cord_syndrome",
    /brown.sequard/.test(text) && "brown_sequard_syndrome",
    /neurogenic shock/.test(text) && "neurogenic_shock",
    /spinal shock/.test(text) && "spinal_shock",
    /sciwora/.test(text) && "sciwora_descriptor",
  ].filter(Boolean) as string[];
  const dischargeFamilyId = /fracture|s12|s22\.0|s22\.1|s32\.0/.test(text)
    ? "stable_vertebral_fracture_followup"
    : mechanisms.length || findings.length ? "post_spinal_trauma_evaluation" : null;
  return { mechanisms, regions, findings, dischargeFamilyId };
}

export function adaptSpinalTraumaComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<SpinalTraumaContext, "mechanisms" | "regions" | "findings">,
): ProviderDocumentationComplaintIntelligence {
  const hints = [...context.mechanisms, ...context.regions, ...context.findings].map((value) => value.replace(/_/g, " "));
  const prioritize = (keys?: string[]) => keys?.slice().sort((a, b) =>
    Number(hints.some((hint) => b.toLowerCase().includes(hint))) - Number(hints.some((hint) => a.toLowerCase().includes(hint))));
  return { ...intel, hpi: prioritize(intel.hpi), rosRedFlags: prioritize(intel.rosRedFlags), mdmPlanSummary: prioritize(intel.mdmPlanSummary) };
}
