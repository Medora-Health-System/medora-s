import { Controller, Get, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { FhirCapabilityRegistry, FHIR_MEDIA_TYPES, FHIR_VERSION } from "./fhir-capability.registry";
import { FhirDeploymentGuard } from "./fhir-context.guard";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";

@Controller("fhir")
@UseGuards(FhirDeploymentGuard)
@UseInterceptors(FhirMediaInterceptor)
@UseFilters(FhirOperationOutcomeFilter)
export class FhirController {
  constructor(private readonly registry: FhirCapabilityRegistry) {}
  @Get("metadata")
  metadata() {
    const resources = new Map<string, { type: string; interaction: { code: string }[]; searchParam: { name: string; type: string }[] }>();
    for (const c of this.registry.enabled()) {
      const entry = resources.get(c.resourceType) ?? { type: c.resourceType, interaction: [], searchParam: [] };
      entry.interaction.push({ code: c.interaction });
      for (const name of c.searchParameters) if (!entry.searchParam.some((p) => p.name === name)) entry.searchParam.push({ name, type: name === "_count" ? "number" : "reference" });
      resources.set(c.resourceType, entry);
    }
    return { resourceType: "CapabilityStatement", status: "active", date: new Date().toISOString(), kind: "instance", fhirVersion: FHIR_VERSION, format: [...FHIR_MEDIA_TYPES], rest: [{ mode: "server", resource: [...resources.values()] }] };
  }
}
