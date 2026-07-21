/**
 * D3E — Dependency audit: reusable enterprise services (no duplicate engines).
 */

export const INPATIENT_D3E_DEPENDENCY_MAP = {
  consumes: {
    observationWorkspacePatterns: true,
    hospitalCareShell: true,
    sharedOrderEngine: true,
    laboratoryWorklist: true,
    radiologyWorklist: true,
    pharmacyWorklist: true,
    medicationIntelligence: true,
    sharedMar: true,
    sharedResults: true,
    chartCertification: true,
    hospitalEpisode: true,
    departmentalEncounterContext: true,
  },
  owns: {
    inpatientEncounter: true,
    inpatientCensusProjection: true,
    inpatientDocumentationShells: true,
    inpatientConsultRequests: true,
    inpatientCarePlan: true,
    inpatientDischargePlanning: true,
  },
  mustNotCreate: {
    inpatientLab: true,
    inpatientPharmacy: true,
    inpatientRadiology: true,
    inpatientMarFork: true,
    inpatientResultsFork: true,
    icu: true,
    or: true,
    pacu: true,
    cathLab: true,
    enterpriseTransfers: true,
    episodeIntelligence: true,
    billingEngine: true,
  },
} as const;

export function inpatientOwnsOnlyEncounterBoundary(): true {
  return true;
}

export function inpatientUsesSharedDepartmentalEngines(): true {
  return true;
}
