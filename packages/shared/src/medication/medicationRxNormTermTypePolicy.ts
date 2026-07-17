/** RxNorm term types referenced by Medora medication intelligence. */
export const RXNORM_TERM_TYPE_VALUES = [
  "IN",
  "PIN",
  "MIN",
  "SCD",
  "SBD",
  "SCDF",
  "SBDF",
  "SCDG",
  "SBDG",
  "GPCK",
  "BPCK",
  "BN",
  "DF",
  "DFG",
] as const;

export type RxNormTermType = (typeof RXNORM_TERM_TYPE_VALUES)[number];

export type RxNormTermTypePolicyDisposition = "supported" | "deferred" | "excluded";

export type RxNormTermTypeMappingTarget =
  | "MEDICATION_CONCEPT"
  | "MEDICATION_PRODUCT"
  | "REFERENCE_ONLY"
  | "NONE";

export type RxNormTermTypePolicy = {
  termType: RxNormTermType;
  disposition: RxNormTermTypePolicyDisposition;
  mappingTarget: RxNormTermTypeMappingTarget;
  mayBecomeCanonical: boolean;
  referenceOnly: boolean;
  searchableReference: boolean;
  candidateMatching: boolean;
  /** Phase 3: always false — staged RxNorm rows must not become orderable. */
  everOrderable: false;
  notes?: string;
};

const BASE_POLICY: Omit<RxNormTermTypePolicy, "termType" | "disposition" | "mappingTarget" | "notes"> = {
  mayBecomeCanonical: false,
  referenceOnly: true,
  searchableReference: false,
  candidateMatching: false,
  everOrderable: false,
};

/** Phase 3 staging policy — synthetic certification fixture only. */
export const RXNORM_TERM_TYPE_POLICIES: Record<RxNormTermType, RxNormTermTypePolicy> = {
  IN: {
    ...BASE_POLICY,
    termType: "IN",
    disposition: "supported",
    mappingTarget: "MEDICATION_CONCEPT",
    candidateMatching: true,
  },
  PIN: {
    ...BASE_POLICY,
    termType: "PIN",
    disposition: "supported",
    mappingTarget: "MEDICATION_CONCEPT",
    candidateMatching: true,
  },
  MIN: {
    ...BASE_POLICY,
    termType: "MIN",
    disposition: "supported",
    mappingTarget: "MEDICATION_CONCEPT",
    candidateMatching: true,
  },
  SCD: {
    ...BASE_POLICY,
    termType: "SCD",
    disposition: "supported",
    mappingTarget: "MEDICATION_PRODUCT",
    candidateMatching: true,
  },
  SBD: {
    ...BASE_POLICY,
    termType: "SBD",
    disposition: "supported",
    mappingTarget: "MEDICATION_PRODUCT",
    candidateMatching: true,
  },
  SCDF: {
    ...BASE_POLICY,
    termType: "SCDF",
    disposition: "supported",
    mappingTarget: "MEDICATION_PRODUCT",
    candidateMatching: true,
  },
  SBDF: {
    ...BASE_POLICY,
    termType: "SBDF",
    disposition: "supported",
    mappingTarget: "MEDICATION_PRODUCT",
    candidateMatching: true,
  },
  BN: {
    ...BASE_POLICY,
    termType: "BN",
    disposition: "supported",
    mappingTarget: "MEDICATION_CONCEPT",
    candidateMatching: true,
  },
  DF: {
    ...BASE_POLICY,
    termType: "DF",
    disposition: "supported",
    mappingTarget: "REFERENCE_ONLY",
    candidateMatching: false,
  },
  GPCK: {
    ...BASE_POLICY,
    termType: "GPCK",
    disposition: "supported",
    mappingTarget: "MEDICATION_PRODUCT",
    candidateMatching: true,
  },
  BPCK: {
    ...BASE_POLICY,
    termType: "BPCK",
    disposition: "deferred",
    mappingTarget: "MEDICATION_PRODUCT",
    notes: "Brand pack staging deferred until NDC linkage workflow exists.",
  },
  SCDG: {
    ...BASE_POLICY,
    termType: "SCDG",
    disposition: "excluded",
    mappingTarget: "NONE",
    notes: "Generic dose form group excluded from Phase 3 synthetic staging.",
  },
  SBDG: {
    ...BASE_POLICY,
    termType: "SBDG",
    disposition: "excluded",
    mappingTarget: "NONE",
    notes: "Branded dose form group excluded from Phase 3 synthetic staging.",
  },
  DFG: {
    ...BASE_POLICY,
    termType: "DFG",
    disposition: "deferred",
    mappingTarget: "REFERENCE_ONLY",
    notes: "Dose form group deferred — reference metadata only in later phase.",
  },
};

export function getRxNormTermTypePolicy(termType: string): RxNormTermTypePolicy | null {
  const key = termType.trim().toUpperCase() as RxNormTermType;
  return RXNORM_TERM_TYPE_POLICIES[key] ?? null;
}

export function isSupportedTermTypeForStaging(termType: string): boolean {
  const policy = getRxNormTermTypePolicy(termType);
  return policy?.disposition === "supported";
}
