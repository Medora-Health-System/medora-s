import type { FhirObservation } from "../fhir-mapper/fhir-resource.types";

/** Minimal FHIR R4 Bundle for read-only search responses. */
export interface FhirBundle {
  resourceType: "Bundle";
  type: "searchset";
  total: number;
  entry: Array<{
    fullUrl?: string;
    resource: FhirObservation;
  }>;
}
