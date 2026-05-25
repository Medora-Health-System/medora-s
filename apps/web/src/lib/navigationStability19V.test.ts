import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ENCOUNTER_UI_STATE_TTL_MS,
  assertEncounterUiStatePayloadSafe,
  clearEncounterUiState,
  encounterUiStateContainsForbiddenKeys,
  encounterUiStateStorageKey,
  isEncounterUiStateExpired,
  mergeEncounterUiState,
  parseEncounterUiState,
  readEncounterUiState,
  writeEncounterUiState,
} from "./encounterUiState";
import {
  DEFAULT_POST_LOGIN_PATH,
  getLandingRouteForRoles,
  getPostLoginDestination,
  getRouteGuardRedirect,
} from "./landingRoute";

const WORKSPACE_SOURCE = readFileSync(
  new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
  "utf8"
);

const ENCOUNTER_PAGE_SOURCE = readFileSync(
  new URL("../../app/app/encounters/[id]/page.tsx", import.meta.url),
  "utf8"
);

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("encounterUiState (19V)", () => {
  it("uses the expected sessionStorage key", () => {
    expect(encounterUiStateStorageKey("enc-123")).toBe("medora:encounter-ui-state:enc-123");
  });

  it("persists and restores active tab for the same encounter", () => {
    const storage = createMemoryStorage();
    writeEncounterUiState(storage, "enc-1", { activeTab: "clinic" });
    const restored = readEncounterUiState(storage, "enc-1");
    expect(restored?.activeTab).toBe("clinic");
    expect(restored?.encounterId).toBe("enc-1");
  });

  it("ignores expired UI state", () => {
    const storage = createMemoryStorage();
    const expiredAt = Date.now() - ENCOUNTER_UI_STATE_TTL_MS - 1;
    storage.setItem(
      encounterUiStateStorageKey("enc-1"),
      JSON.stringify({
        version: 1,
        encounterId: "enc-1",
        savedAt: expiredAt,
        activeTab: "clinic",
      })
    );
    expect(readEncounterUiState(storage, "enc-1")).toBeNull();
    expect(isEncounterUiStateExpired(expiredAt)).toBe(true);
  });

  it("does not restore UI state for a different encounter id", () => {
    const parsed = parseEncounterUiState(
      {
        version: 1,
        encounterId: "enc-a",
        savedAt: Date.now(),
        activeTab: "clinic",
      },
      "enc-b"
    );
    expect(parsed).toBeNull();
  });

  it("does not store PHI-like keys in persisted payloads", () => {
    const storage = createMemoryStorage();
    const state = writeEncounterUiState(storage, "enc-1", {
      activeTab: "clinic",
      activeDocSection: "hpi",
      expandedAccordionSections: ["hpi", "ros"],
      scrollY: 240,
      templateId: "chest_pain",
    });
    expect(assertEncounterUiStatePayloadSafe(state)).toBe(true);
    expect(encounterUiStateContainsForbiddenKeys(JSON.parse(storage.getItem(encounterUiStateStorageKey("enc-1"))!))).toBe(
      false
    );
    expect(encounterUiStateContainsForbiddenKeys({ patientName: "Jane Doe" })).toBe(true);
    expect(encounterUiStateContainsForbiddenKeys({ hpi: "secret text" })).toBe(true);
  });

  it("merges patches without dropping prior safe fields", () => {
    const merged = mergeEncounterUiState(
      "enc-1",
      {
        version: 1,
        encounterId: "enc-1",
        savedAt: 1,
        activeTab: "clinic",
        scrollY: 100,
      },
      { activeDocSection: "ros" },
      2
    );
    expect(merged.activeTab).toBe("clinic");
    expect(merged.scrollY).toBe(100);
    expect(merged.activeDocSection).toBe("ros");
    expect(merged.savedAt).toBe(2);
  });

  it("clears stored UI state", () => {
    const storage = createMemoryStorage();
    writeEncounterUiState(storage, "enc-1", { activeTab: "clinic" });
    clearEncounterUiState(storage, "enc-1");
    expect(readEncounterUiState(storage, "enc-1")).toBeNull();
  });
});

describe("landingRoute post-login (19V)", () => {
  it("sends clinical roles to the ED trackboard by default", () => {
    expect(getLandingRouteForRoles(["PROVIDER"])).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getLandingRouteForRoles(["RN"])).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getLandingRouteForRoles(["ADMIN"])).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("keeps specialty roles on their worklist landing pages", () => {
    expect(getLandingRouteForRoles(["PHARMACY"])).toBe("/app/pharmacy");
    expect(getLandingRouteForRoles(["LAB"])).toBe("/app/lab-worklist");
    expect(getLandingRouteForRoles(["FRONT_DESK"])).toBe("/app/registration");
  });

  it("redirects /app root to trackboard for clinical roles", () => {
    expect(getRouteGuardRedirect("/app", ["PROVIDER"])).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("preserves intentional deep-link redirect after login when allowed", () => {
    const dest = getPostLoginDestination(["PROVIDER"], "/app/encounters/abc-123");
    expect(dest).toBe("/app/encounters/abc-123");
  });

  it("falls back to trackboard when deep-link redirect is not allowed", () => {
    const dest = getPostLoginDestination(["PHARMACY"], "/app/admin");
    expect(dest).toBe("/app/pharmacy");
  });
});

describe("navigation stability — provider documentation (19V)", () => {
  it("does not call scrollIntoView inside autosave or readiness passive effects", () => {
    const passiveEffectPatterns = [
      /useEffect\(\(\) => \{[\s\S]*?shouldAutosaveProviderDocumentation[\s\S]*?\}, \[[^\]]*\]\);/g,
      /useEffect\(\(\) => \{[\s\S]*?setAutosaveStatus[\s\S]*?\}, \[[^\]]*\]\);/g,
      /useEffect\(\(\) => \{[\s\S]*?highlightedDictationTargetId[\s\S]*?\}, \[[^\]]*\]\);/g,
      /useEffect\(\(\) => \{[\s\S]*?uiStatePersistReadyRef[\s\S]*?\}, \[[^\]]*\]\);/g,
    ];
    for (const pattern of passiveEffectPatterns) {
      const matches = WORKSPACE_SOURCE.match(pattern) ?? [];
      for (const block of matches) {
        expect(block).not.toContain("scrollIntoView");
        expect(block).not.toContain(".focus(");
      }
    }
  });

  it("keeps explicit section navigation scroll behavior", () => {
    expect(WORKSPACE_SOURCE).toContain("focusDictationSection");
    expect(WORKSPACE_SOURCE).toContain("scrollIntoView");
    expect(WORKSPACE_SOURCE).toContain("jumpToGuardrailSection");
  });

  it("does not reset provider workspace draft on every encounter refresh", () => {
    expect(ENCOUNTER_PAGE_SOURCE).toContain("clinicEncounterSyncRef");
    expect(ENCOUNTER_PAGE_SOURCE).not.toMatch(
      /syncClinicFieldsFromEncounter[\s\S]*encounter\.updatedAt/
    );
  });
});
