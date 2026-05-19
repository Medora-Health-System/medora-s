import {
  GOVERNANCE_REVIEW_FLAG_BLOCKED,
  isGovernanceBlocked,
  isGovernanceResolvedForPromotion,
  mergeGovernanceIntoRawJson,
  parsePriorityErGovernance,
} from "./priority-er-inventory-governance.util";

describe("priority-er-inventory-governance.util", () => {
  it("parses default UNREVIEWED governance from rawJson", () => {
    const gov = parsePriorityErGovernance({
      __preservation: { rule: "priority_er_inventory_exact_source" },
    });
    expect(gov.governanceDecision).toBe("UNREVIEWED");
  });

  it("mergeGovernanceIntoRawJson stores decision without mutating source trace", () => {
    const raw = {
      medication: "Acetaminophen",
      __sourceTrace: {
        sourceNameExact: "Acetaminophen",
        sourceStrengthExact: "100mg/100ml",
        sourceRouteExact: "Injection",
        exactSourceText: "Acetaminophen 100mg/100ml Injection",
      },
    };
    const merged = mergeGovernanceIntoRawJson(raw, {
      governanceDecision: "CREATE_NEW_APPROVED",
      duplicateResolutionNote: "Pharmacy approved new inactive canonical",
      reviewedByUserId: "user-1",
      reviewedAt: "2026-05-19T12:00:00.000Z",
    });
    expect((merged.__sourceTrace as { sourceNameExact: string }).sourceNameExact).toBe("Acetaminophen");
    expect(parsePriorityErGovernance(merged).governanceDecision).toBe("CREATE_NEW_APPROVED");
  });

  it("blocks promotion when governance is BLOCKED_DUPLICATE", () => {
    const gov = parsePriorityErGovernance(
      mergeGovernanceIntoRawJson({}, { governanceDecision: "BLOCKED_DUPLICATE" })
    );
    expect(isGovernanceBlocked(gov, [GOVERNANCE_REVIEW_FLAG_BLOCKED])).toBe(true);
    expect(isGovernanceResolvedForPromotion(gov, "POSSIBLE_DUPLICATE")).toBe(false);
  });

  it("requires link targets for LINK_TO_EXISTING", () => {
    const gov = parsePriorityErGovernance(
      mergeGovernanceIntoRawJson({}, { governanceDecision: "LINK_TO_EXISTING" })
    );
    expect(isGovernanceResolvedForPromotion(gov, "POSSIBLE_DUPLICATE")).toBe(false);
    const withLink = parsePriorityErGovernance(
      mergeGovernanceIntoRawJson(
        {},
        {
          governanceDecision: "LINK_TO_EXISTING",
          linkedProductId: "prod-1",
        }
      )
    );
    expect(isGovernanceResolvedForPromotion(withLink, "POSSIBLE_DUPLICATE")).toBe(true);
  });

  it("allows NEW_CANDIDATE with UNREVIEWED governance", () => {
    const gov = parsePriorityErGovernance({});
    expect(isGovernanceResolvedForPromotion(gov, "NEW_CANDIDATE")).toBe(true);
  });
});
