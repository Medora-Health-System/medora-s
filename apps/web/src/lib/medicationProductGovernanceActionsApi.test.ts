import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "medicationProductGovernanceActionsApi.ts"),
  "utf8"
);

const pageSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../app/app/admin/medication-governance/page.tsx"
  ),
  "utf8"
);

const queueSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../components/admin/GovernanceActivationReviewQueue.tsx"
  ),
  "utf8"
);

describe("medicationProductGovernanceActionsApi (19G.2C)", () => {
  it("targets pending-activation-review and approve/block via apiFetchResponse", () => {
    expect(apiSource).toContain("/pending-activation-review");
    expect(apiSource).toContain("/approve/");
    expect(apiSource).toContain("/block/");
    expect(apiSource).toContain("apiFetchResponse");
    expect(apiSource).toContain("confirmExactSourcePreserved");
    expect(apiSource).not.toContain("enable-order-search");
    expect(apiSource).not.toContain("enable-mar");
  });

  it("governance dashboard embeds activation review queue", () => {
    expect(pageSource).toContain("GovernanceActivationReviewQueue");
    expect(pageSource).toContain("activationReview");
    expect(queueSource).toContain("approveProductForActivationReview");
    expect(queueSource).toContain("blockProductActivationReview");
  });

  it("has a single section state defaulting to activationReview", () => {
    const sectionStateMatches = pageSource.match(
      /const \[section, setSection\] = useState<SectionId>\([^)]+\)/g
    );
    expect(sectionStateMatches).toHaveLength(1);
    expect(sectionStateMatches?.[0]).toContain('"activationReview"');
    expect(pageSource).toContain('setSection(s.id)');
    expect(pageSource).toContain("onQueueLoaded={(count) => setPendingReviewCount(count)}");
    expect(pageSource).not.toMatch(
      /const \[section, setSection\][\s\S]*const \[section, setSection\]/
    );
  });

  it("renders promotion and activation review sections without shared loading gate", () => {
    expect(pageSource).toContain('section === "activationReview"');
    expect(pageSource).toContain('section === "promotion"');
    expect(pageSource).toContain("summaryLoading");
    expect(pageSource).toContain("sectionLoading");
    expect(pageSource).not.toContain("const [loading, setLoading]");
  });
});
