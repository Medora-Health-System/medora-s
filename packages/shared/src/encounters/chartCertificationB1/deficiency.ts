import {
  CertificationModule,
  ChartCertificationOwner,
  ChartCertificationSeverity,
  ChartCertificationSourceAuthority,
  type ChartCertificationDeficiency,
  type ChartCertificationDeficiencyEffects,
  type ChartCertificationRemediation,
} from "./types.js";

const RULE_VERSION = "b1-1.0.0";

export function advisoryEffects(
  partial?: Partial<ChartCertificationDeficiencyEffects>
): ChartCertificationDeficiencyEffects {
  return {
    blocksClinicalClosure: false,
    blocksDisposition: false,
    blocksBilling: false,
    suggestsProviderReview: false,
    suggestsNursingReview: false,
    suggestsDocumentationReview: false,
    ...partial,
  };
}

/** Established workflow may set blocking effects; Stage B1 evaluators must not. */
export function establishedEffects(
  partial?: Partial<ChartCertificationDeficiencyEffects>
): ChartCertificationDeficiencyEffects {
  return {
    blocksClinicalClosure: true,
    blocksDisposition: true,
    blocksBilling: false,
    suggestsProviderReview: false,
    suggestsNursingReview: false,
    suggestsDocumentationReview: true,
    ...partial,
  };
}

export function makeDeficiency(input: {
  stableCode: string;
  module: CertificationModule;
  owner: ChartCertificationOwner;
  severity?: ChartCertificationSeverity;
  sourceAuthority: ChartCertificationSourceAuthority;
  effects: ChartCertificationDeficiencyEffects;
  remediation: ChartCertificationRemediation;
  sourceEntityType?: string;
  sourceEntityId?: string;
  evidence?: ChartCertificationDeficiency["evidence"];
  deduplicationKey?: string;
}): ChartCertificationDeficiency {
  const entity = (input.sourceEntityId ?? "").trim();
  const deduplicationKey =
    input.deduplicationKey ??
    (entity ? `${input.stableCode}::${entity}` : input.stableCode);
  return {
    stableCode: input.stableCode,
    ruleVersion: RULE_VERSION,
    module: input.module,
    titleKey: `edLifecycle.certification.b1.codes.${input.stableCode}.title`,
    descriptionKey: `edLifecycle.certification.b1.codes.${input.stableCode}.description`,
    owner: input.owner,
    severity: input.severity ?? ChartCertificationSeverity.WARNING,
    sourceAuthority: input.sourceAuthority,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    deduplicationKey,
    effects: input.effects,
    remediation: input.remediation,
    evidence: input.evidence,
  };
}

export const SOURCE_AUTHORITY_RANK: Record<ChartCertificationSourceAuthority, number> = {
  [ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW]: 4,
  [ChartCertificationSourceAuthority.STAGE_B1_EVALUATED]: 3,
  [ChartCertificationSourceAuthority.STAGE_A_ADVISORY]: 2,
  [ChartCertificationSourceAuthority.HEURISTIC_FALLBACK]: 1,
};
