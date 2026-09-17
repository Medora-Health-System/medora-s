import { NotFoundException } from "@nestjs/common";
import { PlatformOwnerControlService } from "./platform-owner-control.service";

describe("Phase 14 protected platform owner",()=>{
 const principalUser={id:"owner",isActive:true,canCreateFacilities:true,userRoles:[{id:"r"}]};
 const delegatedUser={id:"staff",isActive:true,canCreateFacilities:false,userRoles:[]};
 const prisma:any={user:{findUnique:jest.fn(({where}:any)=>Promise.resolve(where.id==="owner"?principalUser:delegatedUser))}};
 const service=new PlatformOwnerControlService(prisma,{} as any);
 beforeEach(()=>jest.clearAllMocks());
 it("conceals authoritative owner from delegated targets",async()=>{await expect(service.assertTargetVisibleTo("staff","owner")).rejects.toBeInstanceOf(NotFoundException);});
 it("allows owner to administer delegated staff",async()=>{await expect(service.assertTargetVisibleTo("owner","staff")).resolves.toBeUndefined();});
 it("filters owner from delegated user projections",async()=>{await expect(service.filterProtectedUsers("staff",[{id:"owner"},{id:"staff"}])).resolves.toEqual([{id:"staff"}]);});
 it("does not hide owner from their own administrative projection",async()=>{await expect(service.filterProtectedUsers("owner",[{id:"owner"},{id:"staff"}])).resolves.toHaveLength(2);});
});
