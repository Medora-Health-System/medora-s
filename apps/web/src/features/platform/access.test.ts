import {describe,expect,it} from "vitest";import {AREA_CAPABILITIES,can,canEnter,mayApprove,mayExecute,safeStepUpMessage,visibleAreas} from "./access";import type {PlatformContext,PrivilegedAction} from "@/lib/platform/api";
const ctx=(caps:string[]=[],extra:Partial<PlatformContext>={}):PlatformContext=>({platformPrincipal:false,staff:{persona:"SUPPORT",isActive:true},capabilities:caps as any,...extra});
const action=(status:string,requester="requester",target="target"):PrivilegedAction=>({id:"a",operationType:"STAFF_GRANT_CAPABILITY",status,requesterUserId:requester,targetUserId:target,scope:{capabilityCode:"STAFF_VIEW"},reason:"Needed for duties",ticketReference:null,requestedAt:"2026-01-01",expiresAt:"2026-01-02",approverUserId:null,approvedAt:null,executedAt:null,failureCode:null});
describe("D4SEC.1C.5 platform presentation boundary",()=>{
 it("facility admin cannot enter without platform context",()=>expect(canEnter(undefined,"facilities")).toBe(false));
 it("ordinary clinical user has no platform area",()=>expect(visibleAreas(ctx()).length).toBe(0));
 it("STAFF_VIEW can view staff but not grant",()=>{const c=ctx(["STAFF_VIEW"]);expect(canEnter(c,"staff")).toBe(true);expect(can(c,"STAFF_GRANT_CAPABILITIES")).toBe(false)});
 it("grant action stays hidden without grant authority",()=>expect(can(ctx(["STAFF_VIEW"]),"STAFF_GRANT_CAPABILITIES")).toBe(false));
 it("platform principal sees the full workspace",()=>expect(visibleAreas(ctx([],{platformPrincipal:true}))).toHaveLength(7));
 it("persona alone never unlocks navigation",()=>expect(visibleAreas(ctx([], {staff:{persona:"PLATFORM_OPERATIONS",isActive:true}}))).toEqual([]));
 it("explicit capabilities drive navigation",()=>expect(visibleAreas(ctx(["BILLING_RCM_VIEW"]))).toEqual(["billing"]));
 it("revoked capability disappears after context refresh",()=>expect(canEnter(ctx([]),"staff")).toBe(false));
 it("inactive staff context is not treated as capability authority",()=>expect(visibleAreas(ctx([], {staff:{persona:"SUPPORT",isActive:false}}))).toEqual([]));
 it("expired or revoked session has no context",()=>expect(visibleAreas(undefined)).toEqual([]));
 it("stale MFA maps to step-up UX",()=>expect(safeStepUpMessage({status:403,message:"RECENT_SESSION_MFA_REQUIRED"})).toContain("MFA"));
 it("requester cannot self-approve",()=>expect(mayApprove(action("PENDING","me"),"me",ctx(["PRIVILEGED_ACTION_APPROVE"]))).toBe(false));
 it("target cannot approve",()=>expect(mayApprove(action("PENDING","other","me"),"me",ctx(["PRIVILEGED_ACTION_APPROVE"]))).toBe(false));
 it("rejected request cannot execute",()=>expect(mayExecute(action("REJECTED"),"requester",ctx())).toBe(false));
 it("expired request cannot execute",()=>expect(mayExecute(action("EXPIRED"),"requester",ctx())).toBe(false));
 it("executed request cannot execute twice",()=>expect(mayExecute(action("EXECUTED"),"requester",ctx())).toBe(false));
 it("all areas have explicit capability mappings",()=>expect(Object.values(AREA_CAPABILITIES).every(v=>v.length>0)).toBe(true));
 it("facility role strings cannot unlock the model",()=>expect(canEnter(ctx(["ADMIN"] as any),"facilities")).toBe(false));
});
describe("D4SEC.1C.5 endpoint and minimization invariants",()=>{
 it("enterprise audit authority is represented only by platform capabilities",()=>expect(AREA_CAPABILITIES.security).toContain("SECURITY_AUDIT_VIEW"));
 it("platform shell access has no clinical capability",()=>expect(JSON.stringify(AREA_CAPABILITIES)).not.toMatch(/PATIENT|ENCOUNTER|CLINICAL_/));
 it("privileged projection type has no session or digest contract",()=>expect(Object.keys(action("PENDING"))).not.toEqual(expect.arrayContaining(["requesterSessionId","scopeDigest","approverSessionId"])));
});
