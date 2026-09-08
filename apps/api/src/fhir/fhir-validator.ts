import { Injectable } from "@nestjs/common";

export type FhirValidationIssue = { severity: "error" | "warning"; path: string; message: string };
export interface FhirValidator { readonly provenance: string; validate(resource: unknown): readonly FhirValidationIssue[]; }

/** Offline structural boundary. Normative package validation remains deliberately deferred. */
@Injectable()
export class FhirR4StructuralValidator implements FhirValidator {
  readonly provenance = "Medora structural validator 0.1 / FHIR R4 4.0.1 (non-normative)";
  validate(resource: unknown): readonly FhirValidationIssue[] {
    if (!resource || typeof resource !== "object" || Array.isArray(resource)) return [{ severity: "error", path: "$", message: "Resource must be an object" }];
    const r = resource as Record<string, unknown>;
    if (typeof r.resourceType !== "string") return [{ severity: "error", path: "resourceType", message: "resourceType is required" }];
    if ("id" in r && (typeof r.id !== "string" || !/^[A-Za-z0-9\-.]{1,64}$/.test(r.id))) return [{ severity: "error", path: "id", message: "Invalid logical id" }];
    return [];
  }
}
