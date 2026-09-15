import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Administration integrations foundation", () => {
  const source = readFileSync(resolve(process.cwd(), "app/app/admin/integrations/page.tsx"), "utf8");
  const provisioningSource = readFileSync(resolve(process.cwd(), "app/app/admin/integrations/[id]/page.tsx"), "utf8");
  const managerSource = readFileSync(resolve(process.cwd(), "app/app/admin/integrations/manage/page.tsx"), "utf8");
  const proxySource = readFileSync(resolve(process.cwd(), "src/lib/server/nestApiProxy.ts"), "utf8");

  test("wizard exposes six reviewed configuration steps and no credential input", () => {
    expect(source).toContain("Step {step} of 6");
    expect(source).toContain("PENDING_PROVISIONING");
    expect(source).not.toMatch(/clientSecret|apiKey|password/);
  });

  test("HL7 is visibly planned and capability choices are server supplied", () => {
    expect(source).toContain("HL7 v2 — Planned (not available)");
    expect(source).toContain("fetchIntegrationPermissions");
    expect(source).toContain("fetchIntegrationFacilities");
  });

  test("review is human-readable while retaining an optional technical payload", () => {
    expect(source).toContain("Primary Responsible Contact");
    expect(source).toContain("Authorized Medora Facilities");
    expect(source).toContain("Technical payload");
  });

  test("navigation preserves controlled form state and blocks empty grants", () => {
    expect(source).toContain("setStep(step - 1)");
    expect(source).toContain('4: ["facilityIds"]');
    expect(source).toContain('5: ["permissionCodes"]');
  });

  test("facility and permission option loading is independent so one failed request cannot blank the other step", () => {
    expect(source).toContain("Promise.allSettled");
    expect(source).toContain("rowsResult.status");
    expect(source).toContain("permissionsResult.status");
    expect(source).toContain("facilitiesResult.status");
  });

  test("Step 4 falls back to authenticated session facilities and can preselect the active facility", () => {
    expect(source).toContain("facilities: sessionFacilities");
    expect(source).toContain("sessionFallbackFacilities");
    expect(source).toContain("Select current facility");
    expect(source).toContain("facilityIds: [currentFacility.id]");
  });

  test("Steps 4 and 5 expose explicit reload and selection controls", () => {
    expect(source).toContain("Reload facility options");
    expect(source).toContain("Reload FHIR permissions");
    expect(source).toContain("Select all available");
  });

  test("FHIR provisioning is separated from registration and exposes one-time credentials", () => {
    expect(managerSource).toContain("FHIR Connection Manager");
    expect(provisioningSource).toContain("Generate");
    expect(provisioningSource).toContain("One-time credential display");
    expect(provisioningSource).toContain("Client ID");
    expect(provisioningSource).toContain("Client Secret");
    expect(provisioningSource).toContain("Test Credentials");
    expect(provisioningSource).toContain("Rotate Secret");
    expect(provisioningSource).toContain("Revoke Client");
  });

  test("P0.3H exposes credential inventory, per-key revocation, and client scope synchronization", () => {
    expect(provisioningSource).toContain("Credentials / Keys");
    expect(provisioningSource).toContain("Revoke Key");
    expect(provisioningSource).toContain("Sync Client Scopes");
    expect(provisioningSource).toContain("Scope update available");
    expect(provisioningSource).toContain("fetchFhirCredentials");
    expect(provisioningSource).toContain("revokeFhirCredential");
    expect(provisioningSource).toContain("updateFhirClientScopes");
  });

  test("credential inventory fan-out cannot block the base integration manager", () => {
    expect(provisioningSource).toContain("Promise.allSettled");
    expect(provisioningSource).toContain("failedCredentialLoads");
    expect(provisioningSource).toContain("Other integration controls remain available");
    expect(provisioningSource.indexOf("setIntegration(row)")).toBeLessThan(provisioningSource.indexOf("Promise.allSettled"));
  });

  test("FHIR permission manager can grant newly reconciled capabilities without reprovisioning an integration", () => {
    expect(provisioningSource).toContain("FHIR Permissions");
    expect(provisioningSource).toContain("Save FHIR Permissions");
    expect(provisioningSource).toContain("updateIntegrationPermissions");
    expect(provisioningSource).toContain("Removing a permission takes effect on machine requests immediately");
  });

  test("partner connection screen exposes machine endpoints and a token request example", () => {
    expect(provisioningSource).toContain("FHIR Base URL");
    expect(provisioningSource).toContain("Token URL");
    expect(provisioningSource).toContain("Partner token request example");
    expect(provisioningSource).toContain("client_credentials");
  });

  test("regression: platform integration endpoints do not require a selected clinical facility", () => {
    expect(proxySource).toContain("isPlatformIntegrationAdminPath");
    expect(proxySource).toMatch(/!isPlatformAnnouncementPath && !isPlatformIntegrationAdminPath/);
  });

  test("unauthorized platform users are denied in the UI", () => {
    expect(source).toMatch(/if\s*\(!canCreateFacilities\)/);
    expect(source).toContain("Access denied");
  });
});
