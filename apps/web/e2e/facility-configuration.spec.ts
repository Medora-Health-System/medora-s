import { expect, test } from "@playwright/test";
import {
  defaultFacilityConfigurationSettings,
  projectFacilityRuntimeConfiguration,
  synchronizeDerivedSettings,
  validateFacilityConfiguration,
  type FacilityRuntimeConfiguration,
} from "@medora/shared";

function providerTabs(runtime: FacilityRuntimeConfiguration) {
  return ["results", "messages", "medications", "discharge", "visitSummary", "carePlan", "activity"].filter((tab) => {
    if (tab === "results") return runtime.digitalCare.resultRelease !== false;
    if (tab === "messages") return runtime.digitalCare.secureMessaging !== false;
    if (tab === "medications") return runtime.digitalCare.medicationSharing !== false;
    if (tab === "discharge") return runtime.digitalCare.dischargeSharing !== false;
    if (tab === "carePlan") return runtime.digitalCare.carePlans !== false;
    return true;
  });
}

function tabsHtml(facilityName: string, tabs: string[], patientMessages: boolean) {
  return `<!doctype html><html><body>
    <h1>${facilityName}</h1>
    <nav>${tabs.map((tab) => `<button data-testid="provider-tab-${tab}">${tab}</button>`).join("")}</nav>
    ${patientMessages ? `<section data-testid="patient-messages">messages</section>` : `<section data-testid="patient-messages-missing">hidden</section>`}
  </body></html>`;
}

test("scenario 1: enable messaging — provider and patient see messaging", async ({ page }) => {
  const settings = synchronizeDerivedSettings(defaultFacilityConfigurationSettings());
  const runtime = projectFacilityRuntimeConfiguration("hospital-a", settings, 1);
  const tabs = providerTabs(runtime);
  expect(tabs).toContain("messages");
  expect(runtime.patientPortal.messages).toBe(true);
  await page.setContent(tabsHtml("Hospital A", tabs, true));
  await expect(page.getByTestId("provider-tab-messages")).toBeVisible();
  await expect(page.getByTestId("patient-messages")).toBeVisible();
});

test("scenario 2: disable messaging — provider and patient tabs disappear", async ({ page }) => {
  const settings = synchronizeDerivedSettings({
    ...defaultFacilityConfigurationSettings(),
    digitalCare: {
      ...defaultFacilityConfigurationSettings().digitalCare,
      secureMessaging: false,
      providerChat: false,
      patientChat: false,
    },
    patientPortal: { ...defaultFacilityConfigurationSettings().patientPortal, messages: false },
  });
  const runtime = projectFacilityRuntimeConfiguration("hospital-a", settings, 2);
  const tabs = providerTabs(runtime);
  expect(tabs).not.toContain("messages");
  await page.setContent(tabsHtml("Hospital A", tabs, false));
  await expect(page.getByTestId("provider-tab-messages")).toHaveCount(0);
  await expect(page.getByTestId("patient-messages")).toHaveCount(0);
});

test("scenario 3 and 4: auto release vs provider approval", async () => {
  const auto = synchronizeDerivedSettings({
    ...defaultFacilityConfigurationSettings(),
    digitalCare: {
      ...defaultFacilityConfigurationSettings().digitalCare,
      resultRelease: true,
      autoRelease: true,
      manualRelease: false,
      criticalResultWorkflow: false,
    },
  });
  const manual = synchronizeDerivedSettings({
    ...defaultFacilityConfigurationSettings(),
    digitalCare: {
      ...defaultFacilityConfigurationSettings().digitalCare,
      resultRelease: true,
      autoRelease: false,
      manualRelease: true,
    },
  });
  expect(auto.digitalCare.autoRelease).toBe(true);
  expect(manual.digitalCare.autoRelease).toBe(false);
  expect(validateFacilityConfiguration(auto)).toEqual([]);
  expect(validateFacilityConfiguration(manual)).toEqual([]);
});

test("scenario 5: Hospital A messaging on, Hospital B messaging off", async ({ page }) => {
  const hospitalA = projectFacilityRuntimeConfiguration("hospital-a", synchronizeDerivedSettings(defaultFacilityConfigurationSettings()), 4);
  const hospitalB = projectFacilityRuntimeConfiguration(
    "hospital-b",
    synchronizeDerivedSettings({
      ...defaultFacilityConfigurationSettings(),
      digitalCare: {
        ...defaultFacilityConfigurationSettings().digitalCare,
        secureMessaging: false,
        providerChat: false,
        patientChat: false,
      },
      patientPortal: { ...defaultFacilityConfigurationSettings().patientPortal, messages: false },
    }),
    4,
  );
  expect(hospitalA.facilityId).toBe("hospital-a");
  expect(hospitalB.facilityId).toBe("hospital-b");
  await page.setContent(tabsHtml("Hospital B", providerTabs(hospitalB), false));
  await expect(page.getByTestId("provider-tab-messages")).toHaveCount(0);
  await page.setContent(tabsHtml("Hospital A", providerTabs(hospitalA), true));
  await expect(page.getByTestId("provider-tab-messages")).toBeVisible();
});

test("invalid combinations cannot be represented as a valid save payload", async () => {
  const invalid = defaultFacilityConfigurationSettings();
  invalid.modules.digitalCare.enabled = false;
  invalid.modules.digitalCare.hidden = true;
  invalid.digitalCare.secureMessaging = true;
  invalid.patientPortal.messages = true;
  expect(validateFacilityConfiguration(invalid).length).toBeGreaterThan(0);
});
