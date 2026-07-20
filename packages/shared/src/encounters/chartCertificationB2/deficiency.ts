import { advisoryEffects } from "../chartCertificationB1/deficiency.js";
import {
  CertificationModule,
  ChartCertificationOwner,
  ChartCertificationSeverity,
  ChartCertificationSourceAuthority,
  type ChartCertificationDeficiency,
  type ChartCertificationDeficiencyEffects,
  type ChartCertificationRemediation,
} from "../chartCertificationB1/types.js";

const RULE_VERSION = "b2-1.0.0";

export function makeB2Deficiency(input: {
  stableCode: string;
  module: CertificationModule;
  owner: ChartCertificationOwner;
  severity?: ChartCertificationSeverity;
  effects?: Partial<ChartCertificationDeficiencyEffects>;
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
    titleKey: `edLifecycle.certification.b2.codes.${input.stableCode}.title`,
    descriptionKey: `edLifecycle.certification.b2.codes.${input.stableCode}.description`,
    owner: input.owner,
    severity: input.severity ?? ChartCertificationSeverity.WARNING,
    sourceAuthority: ChartCertificationSourceAuthority.STAGE_B2_EVALUATED,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    deduplicationKey,
    effects: advisoryEffects(input.effects),
    remediation: input.remediation,
    evidence: input.evidence,
  };
}

export { advisoryEffects };
