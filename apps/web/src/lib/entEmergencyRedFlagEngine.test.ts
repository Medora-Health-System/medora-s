import { describe, expect, it } from "vitest";
import {
  entEmergencyRedFlagWarnings,
  isEntAirwayEmergencyFlagged,
  resolveEntEmergencyRedFlags,
} from "./entEmergencyRedFlagEngine";

describe("entEmergencyRedFlagEngine", () => {
  it("does not invent red flags from empty documentation", () => {
    expect(resolveEntEmergencyRedFlags({}).categories).toEqual([]);
    expect(entEmergencyRedFlagWarnings({})).toEqual([]);
    expect(isEntAirwayEmergencyFlagged({})).toBe(false);
  });

  it("screens malignant otitis externa concern", () => {
    const result = resolveEntEmergencyRedFlags({
      documentedFlags: ["malignant otitis externa", "diabetic patient"],
    });
    expect(result.categories).toContain("malignant_otitis_externa");
  });

  it("screens mastoiditis concern", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["postauricular swelling", "protruding auricle"] });
    expect(result.categories).toContain("mastoiditis");
  });

  it("screens sudden hearing loss concern", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["sudden sensorineural hearing loss"] });
    expect(result.categories).toContain("sudden_hearing_loss");
  });

  it("screens central vertigo concern and references HINTS safety module without ruling out stroke", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["direction-changing nystagmus", "truncal ataxia"] });
    expect(result.categories).toContain("central_vertigo");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/never a validated automated stroke rule-out/);
  });

  it("screens peritonsillar abscess concern distinct from uncomplicated pharyngitis", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["trismus with uvular deviation"] });
    expect(result.categories).toContain("peritonsillar_abscess");
  });

  it("screens retropharyngeal abscess concern", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["widened prevertebral space"] });
    expect(result.categories).toContain("retropharyngeal_abscess");
  });

  it("screens deep neck infection concern", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["rapidly progressive neck swelling"] });
    expect(result.categories).toContain("deep_neck_infection");
  });

  it("screens Ludwig angina concern and flags it as an airway emergency", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["bilateral submandibular swelling", "tongue elevation with floor of mouth swelling"] });
    expect(result.categories).toContain("ludwig_angina");
    expect(isEntAirwayEmergencyFlagged({ documentedFlags: ["ludwig's angina"] })).toBe(true);
  });

  it("screens epiglottitis concern and prioritizes avoiding oropharyngeal instrumentation", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["thumbprint sign", "stridor with drooling"] });
    expect(result.categories).toContain("epiglottitis");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/avoid agitating the patient or instrumenting the oropharynx/);
    expect(isEntAirwayEmergencyFlagged({ documentedFlags: ["epiglottitis suspected"] })).toBe(true);
  });

  it("screens airway compromise concern", () => {
    expect(isEntAirwayEmergencyFlagged({ documentedFlags: ["stridor at rest"] })).toBe(true);
  });

  it("screens posterior epistaxis concern distinct from anterior epistaxis", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["posterior epistaxis", "failed anterior packing"] });
    expect(result.categories).toContain("posterior_epistaxis");
  });

  it("screens button battery foreign body concern as more urgent than typical foreign body", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["button battery in nose"] });
    expect(result.categories).toContain("button_battery_foreign_body");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/urgent removal/);
  });

  it("screens facial nerve central concern distinct from isolated peripheral palsy", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["facial droop with limb weakness"] });
    expect(result.categories).toContain("facial_nerve_central_concern");
  });

  it("screens Ramsay Hunt concern distinct from isolated Bell's palsy", () => {
    const result = resolveEntEmergencyRedFlags({ documentedFlags: ["vesicles on the auricle", "facial weakness"] });
    expect(result.categories).toContain("ramsay_hunt");
  });

  it("never autonomously starts antibiotics, manages the airway, requests a consult, or sets disposition", () => {
    const prompts = entEmergencyRedFlagWarnings({
      documentedFlags: ["ludwig's angina", "epiglottitis suspected", "malignant otitis externa"],
    }).join(" ");
    expect(prompts.toLowerCase()).toMatch(/does not autonomously/);
    expect(prompts.toLowerCase()).not.toMatch(/antibiotics (started|ordered|administered)\b/);
    expect(prompts.toLowerCase()).not.toMatch(/consult (requested|placed) automatically/);
  });
});
