import { canonicalScope, hasFreshMfa, riskRequirements, scopeDigest } from "./privileged-action-policy";

describe("D4SEC.1C.4C authoritative high-risk policy", () => {
  it("derives MODERATE/HIGH/CRITICAL requirements centrally", () => {
    expect(riskRequirements("MODERATE")).toEqual({recentMfa:false,audit:true,dualControlEligible:false});
    expect(riskRequirements("HIGH")).toEqual({recentMfa:true,audit:true,dualControlEligible:false});
    expect(riskRequirements("CRITICAL")).toEqual({recentMfa:true,audit:true,dualControlEligible:true});
  });
  it("binds SHA-256 scope to operation, immutable target and capability", () => {
    const a:any={operationType:"STAFF_GRANT_CAPABILITY",targetUserId:"target-a",capabilityCode:"STAFF_VIEW"};
    expect(scopeDigest(a)).toMatch(/^[0-9a-f]{64}$/); expect(scopeDigest(a)).not.toBe(scopeDigest({...a,targetUserId:"target-b"})); expect(scopeDigest(a)).not.toBe(scopeDigest({...a,capabilityCode:"STAFF_PROVISION"}));
    expect(canonicalScope(a)).toBe('{"capabilityCode":"STAFF_VIEW","operationType":"STAFF_GRANT_CAPABILITY","targetUserId":"target-a"}');
  });
  it("accepts only fresh assurance belonging to the queried authoritative session", () => {
    const now=new Date(); expect(hasFreshMfa({mfaVerifiedAt:now,mfaMethod:"totp",expiresAt:new Date(now.getTime()+1000)},now)).toBe(true);
    expect(hasFreshMfa({mfaVerifiedAt:null,mfaMethod:null,expiresAt:new Date(now.getTime()+1000)},now)).toBe(false);
    expect(hasFreshMfa({mfaVerifiedAt:new Date(now.getTime()-301000),mfaMethod:"totp",expiresAt:new Date(now.getTime()+1000)},now)).toBe(false);
    expect(hasFreshMfa({mfaVerifiedAt:now,mfaMethod:"totp",revokedAt:now,expiresAt:new Date(now.getTime()+1000)},now)).toBe(false);
  });
});
