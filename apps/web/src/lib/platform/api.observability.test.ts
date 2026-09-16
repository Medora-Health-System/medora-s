import {describe,expect,it} from "vitest";
import {PlatformApiError,platformErrorDetails} from "./api";

describe("platform operational observability",()=>{
  it("preserves status, code, and request correlation id",()=>{
    const error=new PlatformApiError("Compliance projection failed",503,"COMPLIANCE_UNAVAILABLE","req-123");
    expect(platformErrorDetails(error)).toEqual({message:"Compliance projection failed",status:503,code:"COMPLIANCE_UNAVAILABLE",requestId:"req-123"});
  });
  it("does not invent correlation metadata for ordinary errors",()=>{
    expect(platformErrorDetails(new Error("network failed"))).toEqual({message:"network failed",status:undefined,code:undefined,requestId:undefined});
  });
  it("uses a safe generic message for unknown failures",()=>{
    expect(platformErrorDetails(null).message).toBe("The platform service could not complete this request.");
  });
});
