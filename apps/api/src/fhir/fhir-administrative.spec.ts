import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mapEncounterStatus } from "../fhir-mapper/encounter-to-fhir.mapper";
import { FHIR_CAPABILITIES, FhirCapabilityRegistry } from "./fhir-capability.registry";
import { FhirSearchService, searchBundle } from "./fhir-search";
import { parseFhirReference } from "./fhir-protocol";

describe("P0.3B administrative FHIR foundation", () => {
  const search = new FhirSearchService(new ConfigService({ FHIR_PUBLIC_BASE_URL: "https://interop.medora.example/fhir" }));

  test("FHIR-026 maps every canonical EncounterStatus explicitly", () => {
    expect([mapEncounterStatus("OPEN"), mapEncounterStatus("CLOSED"), mapEncounterStatus("CANCELLED")]).toEqual(["in-progress", "finished", "cancelled"]);
  });

  test("FHIR-043/044 creates stable bounded searchset links without totals", () => {
    const parsed = search.parse({ name: "Jean", _count: "1" }, ["name", "_count", "_cursor"]);
    expect(parsed).toEqual({ count: 1, values: { name: "Jean" } });
    const bundle = searchBundle(search.baseUrl(), "Patient", { name: "Jean", _count: "1" }, [{ resourceType: "Patient", id: "a" }], true);
    expect(bundle).toMatchObject({ resourceType: "Bundle", type: "searchset", link: [{ relation: "self" }, { relation: "next", url: expect.stringContaining("_cursor=a") }] });
    expect(bundle).not.toHaveProperty("total");
  });

  test("FHIR-045/046 uses only configured public URL and rejects unsafe URLs", () => {
    expect(search.baseUrl()).toBe("https://interop.medora.example/fhir");
    expect(() => new FhirSearchService(new ConfigService({ FHIR_PUBLIC_BASE_URL: "https://user:pass@example.test/fhir" })).baseUrl()).toThrow();
    const prior = process.env.NODE_ENV; process.env.NODE_ENV = "production";
    expect(() => new FhirSearchService(new ConfigService({ FHIR_PUBLIC_BASE_URL: "http://attacker.test/fhir" })).baseUrl()).toThrow();
    process.env.NODE_ENV = prior;
  });

  test("FHIR-027/044 rejects unknown, wildcard, repeated, oversized and malformed cursor input", () => {
    expect(() => search.parse({ unknown: "x" }, ["name"])).toThrow(BadRequestException);
    expect(() => search.parse({ name: "*" }, ["name"])).toThrow(BadRequestException);
    expect(() => search.parse({ name: ["a", "b"] }, ["name"])).toThrow(BadRequestException);
    expect(() => search.parse({ _count: "51" }, ["_count"])).toThrow(BadRequestException);
    expect(() => search.parse({ _cursor: "../../escape" }, ["_cursor"])).toThrow(BadRequestException);
  });

  test("FHIR-047/048 registry is the single read/search permission authority and has no writes", () => {
    process.env.MEDORA_INTEROP_ENABLED = "true";
    const registry = new FhirCapabilityRegistry();
    const expected = FHIR_CAPABILITIES.map((c) => c.futureM2mScope);
    expect(registry.permissionOptions().map((c) => c.code)).toEqual(expected);
    expect(FHIR_CAPABILITIES.every((c) => ["read", "search-type"].includes(c.interaction))).toBe(true);
    expect(() => registry.assertPermissionCodes(["patient.create"])).toThrow("UNSUPPORTED_INTEGRATION_PERMISSION");
  });

  test("REF-01/05/07/09 accepts only canonical typed relative references", () => {
    expect(parseFhirReference("Practitioner/abc123", "Practitioner")).toEqual({ resourceType: "Practitioner", id: "abc123" });
    expect(parseFhirReference("Organization/abc123", "Organization")).toEqual({ resourceType: "Organization", id: "abc123" });
    expect(parseFhirReference("Patient/abc123", "Patient")).toEqual({ resourceType: "Patient", id: "abc123" });
  });

  test.each([
    ["REF-02", "Patient/123", "Practitioner"],
    ["REF-03", "Practitioner/", "Practitioner"],
    ["REF-04", "Practitioner/../../escape", "Practitioner"],
    ["REF-06", "Practitioner/123", "Organization"],
    ["REF-08", "Organization/123", "Patient"],
    ["REF-10", "https://attacker.test/Practitioner/123", "Practitioner"],
    ["REF-11", "Practitioner/123/extra", "Practitioner"],
    ["REF-12a", "Practitioner/%2e%2e", "Practitioner"],
    ["REF-12b", "Practitioner/%2Fetc", "Practitioner"],
    ["REF-12c", "Practitioner/\u0000", "Practitioner"],
    ["REF-12d", "Practitioner/123?x=y", "Practitioner"],
    ["REF-12e", "Practitioner/123#fragment", "Practitioner"],
  ])("%s rejects malformed or wrong-type reference", (_id, value, expected) => {
    expect(() => parseFhirReference(value, expected as "Practitioner")).toThrow(BadRequestException);
  });
});
