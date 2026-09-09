/** Minimal FHIR R4 Bundle for read-only search responses. */
export interface FhirBundle {
  resourceType: "Bundle";
  type: "searchset";
  total?: number;
  link?: Array<{ relation: string; url: string }>;
  entry: Array<{
    fullUrl?: string;
    resource: { resourceType: string; id?: string };
    search?: { mode: "match" };
  }>;
}
