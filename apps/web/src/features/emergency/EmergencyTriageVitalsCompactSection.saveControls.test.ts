import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  join(import.meta.dirname, "EmergencyTriageVitalsCompactSection.tsx"),
  "utf8"
);

describe("EmergencyTriageVitalsCompactSection save controls", () => {
  it("Save vitals and Clear are explicit type=button (not form submit)", () => {
    expect(src).toMatch(/onClick=\{onSaveVitals\}[\s\S]{0,40}type="button"|type="button"[\s\S]{0,40}onClick=\{onSaveVitals\}/);
    expect(src).toMatch(/onClick=\{onClearVitals\}[\s\S]{0,40}type="button"|type="button"[\s\S]{0,40}onClick=\{onClearVitals\}/);
    // Ensure both buttons declare type="button"
    const buttonTypes = [...src.matchAll(/<button[\s\S]*?>/g)].map((m) => m[0]);
    const saveBarButtons = buttonTypes.filter(
      (b) => b.includes("onSaveVitals") || b.includes("onClearVitals") || b.includes("vitals-save")
    );
    // Source-level: every button in the file that is near save actions uses type="button"
    expect(src.includes('type="button"\n            onClick={onSaveVitals}') || src.includes('type="button"\n            onClick={onSaveVitals}')).toBe(
      true
    );
    expect(src).toContain('type="button"');
    expect(src).toContain("onClick={onSaveVitals}");
    expect(src).toContain("onClick={onClearVitals}");
    const saveIdx = src.indexOf("onClick={onSaveVitals}");
    const clearIdx = src.indexOf("onClick={onClearVitals}");
    const saveWindow = src.slice(Math.max(0, saveIdx - 80), saveIdx + 40);
    const clearWindow = src.slice(Math.max(0, clearIdx - 80), clearIdx + 40);
    expect(saveWindow).toContain('type="button"');
    expect(clearWindow).toContain('type="button"');
  });

  it("error status uses assertive alert live region", () => {
    expect(src).toContain('role={statusTone === "error" ? "alert" : "status"}');
    expect(src).toContain('aria-live={statusTone === "error" ? "assertive" : "polite"}');
  });
});
