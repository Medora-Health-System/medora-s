import { Controller, Get, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { FhirCapabilityRegistry, FHIR_MEDIA_TYPES, FHIR_VERSION } from "./fhir-capability.registry";
import { FhirDeploymentGuard } from "./fhir-context.guard";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirSearchService } from "./fhir-search";

const REFERENCE_SEARCH_PARAMS = new Set(["patient", "subject", "encounter", "organization", "practitioner", "based-on", "target", "agent"]);
const DATE_SEARCH_PARAMS = new Set(["birthdate", "date", "recorded-date", "authored", "recorded"]);
const STRING_SEARCH_PARAMS = new Set(["family", "given", "name", "_cursor"]);
const NUMBER_SEARCH_PARAMS = new Set(["_count"]);

export function fhirSearchParameterType(name: string): string {
  if (REFERENCE_SEARCH_PARAMS.has(name)) return "reference";
  if (DATE_SEARCH_PARAMS.has(name)) return "date";
  if (STRING_SEARCH_PARAMS.has(name)) return "string";
  if (NUMBER_SEARCH_PARAMS.has(name)) return "number";
  return "token";
}

@Controller("fhir")
@UseGuards(FhirDeploymentGuard)
@UseInterceptors(FhirMediaInterceptor)
@UseFilters(FhirOperationOutcomeFilter)
export class FhirController {
  constructor(private readonly registry: FhirCapabilityRegistry, private readonly search?: FhirSearchService) {}

  @Get("metadata")
  metadata() {
    const resources = new Map<string, { type: string; interaction: { code: string }[]; searchParam: { name: string; type: string }[] }>();
    for (const capability of this.registry.enabled()) {
      const entry = resources.get(capability.resourceType) ?? { type: capability.resourceType, interaction: [], searchParam: [] };
      if (!entry.interaction.some((interaction) => interaction.code === capability.interaction)) entry.interaction.push({ code: capability.interaction });
      for (const name of capability.searchParameters) {
        if (!entry.searchParam.some((param) => param.name === name)) entry.searchParam.push({ name, type: fhirSearchParameterType(name) });
      }
      resources.set(capability.resourceType, entry);
    }
    return {
      resourceType: "CapabilityStatement",
      status: "active",
      date: new Date().toISOString(),
      kind: "instance",
      software: { name: "Medora", version: process.env.MEDORA_RELEASE_VERSION ?? process.env.npm_package_version ?? "development" },
      implementation: { description: "Medora read/search FHIR R4 endpoint", ...(this.search ? { url: this.search.baseUrl() } : {}) },
      fhirVersion: FHIR_VERSION,
      format: [...FHIR_MEDIA_TYPES],
      rest: [{ mode: "server", resource: [...resources.values()] }],
    };
  }
}
