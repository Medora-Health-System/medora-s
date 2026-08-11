import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../../i18n/messages";
import { platformStaffApi } from "./api";
import {
  MEDORA_STAFF_PERSONA_CODES,
  MEDORA_STAFF_PERSONA_OPTIONS,
  parseMedoraStaffPersonaCode,
} from "./staffPersona";

const labels = ["Implementation", "Support", "Billing Operations", "Compliance / Security", "Platform Operations"];

afterEach(() => vi.unstubAllGlobals());

describe("Medora staff persona provisioning contract", () => {
  it.each([
    ["Implementation", "IMPLEMENTATION"],
    ["Support", "SUPPORT"],
  ] as const)("selecting %s submits canonical persona %s", async (_label, persona) => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetch);

    await platformStaffApi.provision("user-1", { persona, reason: "Medora Staff", ticketReference: `${persona}-001` });

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ persona });
  });

  it("maps all five localized labels exactly to canonical option values", () => {
    expect(MEDORA_STAFF_PERSONA_OPTIONS.map(({ value, labelKey }) => ({ label: en[labelKey], value }))).toEqual(
      labels.map((label, index) => ({ label, value: MEDORA_STAFF_PERSONA_CODES[index] })),
    );
  });

  it.each(labels)("rejects display label %s as an API-domain value", (label) => {
    expect(() => parseMedoraStaffPersonaCode(label)).toThrow("Invalid Medora staff persona code");
  });
});
