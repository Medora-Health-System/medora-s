import { describe, expect, it } from "vitest";
import { defaultFacilityConfigurationSettings } from "@medora/shared";
import { facilityConfigurationOverlayKeyParity } from "@/i18n/messages/facilityConfigurationOverrides";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import {
  facilityConfigurationIsDirty,
  facilityConfigurationSaveEnabled,
  facilityConsoleEnabledProgress,
  setFacilityModuleRuntime,
} from "./facilityConfigurationConsoleView";

describe("Facility configuration console", () => {
  it("tracks dirty state from a real settings clone", () => {
    const saved = defaultFacilityConfigurationSettings();
    const draft = structuredClone(saved);
    expect(facilityConfigurationIsDirty(saved, draft)).toBe(false);
    draft.digitalCare.secureMessaging = false;
    expect(facilityConfigurationIsDirty(saved, draft)).toBe(true);
  });

  it("computes live module progress", () => {
    const settings = defaultFacilityConfigurationSettings();
    settings.modules.billing.enabled = false;
    settings.modules.billing.hidden = true;
    const progress = facilityConsoleEnabledProgress(settings.modules);
    expect(progress.total).toBe(14);
    expect(progress.enabled).toBeLessThan(progress.total);
  });

  it("keeps hidden/visible flags consistent when enabling a module", () => {
    const next = setFacilityModuleRuntime(
      { enabled: false, visible: false, maintenance: false, readOnly: false, hidden: true },
      { enabled: true },
    );
    expect(next.enabled).toBe(true);
    expect(next.hidden).toBe(false);
    expect(next.visible).toBe(true);
  });

  it("keeps overlay keys aligned across French, English, and Spanish", () => {
    expect(facilityConfigurationOverlayKeyParity()).toEqual([]);
    expect(i18nMessage("fr", "facilityConfig.title")).toBe("Configuration de l’établissement");
    expect(i18nMessage("en", "facilityConfig.title")).toBe("Facility configuration");
    expect(i18nMessage("es", "facilityConfig.title")).toBe("Configuración del establecimiento");
    expect(i18nMessage("fr", "facilityConfig.save")).not.toBe(i18nMessage("en", "facilityConfig.save"));
    expect(i18nMessage("en", "facilityConfig.conflict")).toBe("This configuration changed. Reload?");
    expect(i18nMessage("fr", "facilityConfig.conflict")).toContain("Recharger");
  });

  it("disables save while the draft is invalid or unchanged", () => {
    expect(facilityConfigurationSaveEnabled({ dirty: true, busy: false, issueCount: 0 })).toBe(true);
    expect(facilityConfigurationSaveEnabled({ dirty: true, busy: false, issueCount: 1 })).toBe(false);
    expect(facilityConfigurationSaveEnabled({ dirty: false, busy: false, issueCount: 0 })).toBe(false);
    expect(facilityConfigurationSaveEnabled({ dirty: true, busy: true, issueCount: 0 })).toBe(false);
  });
});
