import { FhirCapabilityRegistry } from "./fhir-capability.registry";
import { FhirMachineIdentityService } from "./fhir-machine-identity.service";

describe("FHIR machine provisioning contract", () => {
  test("connection metadata exposes only non-secret public endpoints", () => {
    const service = Object.create(FhirMachineIdentityService.prototype) as FhirMachineIdentityService;
    const info = service.connectionInfo();
    expect(info.fhirBaseUrl).toContain("/fhir");
    expect(info.tokenUrl).toContain("/fhir/auth/token");
    expect(JSON.stringify(info).toLowerCase()).not.toContain("clientsecret");
  });

  test("machine scopes remain exact registry capability codes", () => {
    const registry = new FhirCapabilityRegistry();
    const codes = registry.permissionOptions().map((option) => option.code);
    expect(codes).toContain("patient.read");
    expect(codes).toContain("observation.search");
    expect(codes).not.toContain("fhir.*");
  });
});
