export const DIGITAL_CARE_ARCHITECTURE_RULES = {
  forbidCrossDomainInternals: true,
  forbidOrmDependenciesInDomainAndContracts: true,
  forbidTransportDependenciesInDomainAndContracts: true,
  forbidExternalDeepImportsIntoDigitalCare: true,
  requirePublicContractsForCrossDomainIntegration: true,
  preserveCentralAuthorization: true,
} as const;

export const DIGITAL_CARE_PUBLIC_ENTRY_POINTS = [
  "digital-care.module.ts",
  "contracts/digital-care.contract.ts",
] as const;
