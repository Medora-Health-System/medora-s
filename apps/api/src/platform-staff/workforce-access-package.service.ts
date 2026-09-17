import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { PlatformCapabilityCode } from "./platform-capabilities";
import { PlatformStaffService } from "./platform-staff.service";
import { PrivilegedActionService } from "./privileged-action.service";
import { PlatformOwnerControlService } from "./platform-owner-control.service";
import { WORKFORCE_ACCESS_PACKAGES } from "./workforce-access-packages";

type PackageActor = { userId: string; sessionId: string };
@Injectable()
export class WorkforceAccessPackageService {
  constructor(private readonly prisma: PrismaService,private readonly staff: PlatformStaffService,private readonly privileged: PrivilegedActionService,private readonly owner: PlatformOwnerControlService) {}
  async preview(targetUserId: string) {
    const staff = await this.prisma.medoraStaffProfile.findUnique({where:{userId:targetUserId},select:{isActive:true}});if(!staff?.isActive)throw new NotFoundException("Active Medora staff profile not found");
    const workforce=await this.prisma.$queryRawUnsafe<any[]>(`SELECT "department","jobTitle","employmentStatus" FROM "MedoraWorkforceProfile" WHERE "userId"=$1`,targetUserId);if(!workforce[0])throw new NotFoundException("Corporate workforce profile not found");
    const pkg=WORKFORCE_ACCESS_PACKAGES[workforce[0].department as keyof typeof WORKFORCE_ACCESS_PACKAGES];if(!pkg)throw new NotFoundException("Governed workforce access package not found");
    const [catalog,active]=await Promise.all([this.prisma.platformCapability.findMany({where:{code:{in:[...pkg.capabilities]},isActive:true},select:{code:true,riskLevel:true}}),this.prisma.platformCapabilityGrant.findMany({where:{userId:targetUserId,isActive:true},select:{capability:{select:{code:true}}}})]);
    const activeCodes=new Set(active.map(g=>g.capability.code));const byCode=new Map(catalog.map(c=>[c.code,c]));const missing=pkg.capabilities.filter(code=>!activeCodes.has(code));
    return {targetUserId,workforce:{department:workforce[0].department,jobTitle:workforce[0].jobTitle,employmentStatus:workforce[0].employmentStatus},package:{code:pkg.code,label:pkg.label,department:pkg.department},runtimeAuthority:"EXPLICIT_PLATFORM_CAPABILITY_GRANTS_ONLY" as const,automaticallyApplied:false as const,activePackageCapabilities:pkg.capabilities.filter(code=>activeCodes.has(code)),missingDirectGrantEligible:missing.filter(code=>byCode.get(code)?.riskLevel!=="CRITICAL"),missingDualControlRequired:missing.filter(code=>byCode.get(code)?.riskLevel==="CRITICAL"),catalogMismatch:pkg.capabilities.filter(code=>!byCode.has(code))};
  }
  async apply(actor:PackageActor,targetUserId:string,reason:string,ticketReference?:string){
    await this.owner.assertTargetVisibleTo(actor.userId,targetUserId);const before=await this.preview(targetUserId);if(before.workforce.employmentStatus!=="ACTIVE")throw new BadRequestException("WORKFORCE_NOT_ACTIVE");if(before.catalogMismatch.length>0)throw new BadRequestException("WORKFORCE_PACKAGE_CATALOG_MISMATCH");
    const actorIsOwner=await this.owner.isOwner(actor.userId);const directGrants:Array<{code:PlatformCapabilityCode;grantId:string;idempotent:boolean;ownerOverride?:boolean}>=[];
    for(const code of [...before.missingDirectGrantEligible,...(actorIsOwner?before.missingDualControlRequired:[])]){const grant:any=actorIsOwner?await this.owner.directGrantAsOwner(actor.userId,targetUserId,code,reason,ticketReference):await this.staff.grant(actor.userId,targetUserId,code,reason,ticketReference);directGrants.push({code,grantId:String(grant.id),idempotent:grant.idempotent===true,...(grant.ownerOverride?{ownerOverride:true}:{})});}
    const created:any[]=[];const reused:any[]=[];
    if(!actorIsOwner){const existing=await this.prisma.privilegedActionRequest.findMany({where:{operationType:"STAFF_GRANT_CAPABILITY",requesterUserId:actor.userId,targetUserId,status:{in:["PENDING","APPROVED"]},expiresAt:{gt:new Date()}},select:{id:true,status:true,scope:true,expiresAt:true}});for(const code of before.missingDualControlRequired){const found=existing.find(r=>{const s=r.scope as Record<string,unknown>|null;return s?.operationType==="STAFF_GRANT_CAPABILITY"&&s?.targetUserId===targetUserId&&s?.capabilityCode===code;});if(found){reused.push({code,requestId:found.id,status:String(found.status),expiresAt:found.expiresAt});continue;}const request=await this.privileged.create(actor,{operationType:"STAFF_GRANT_CAPABILITY",targetUserId,capabilityCode:code,reason,ticketReference});created.push({code,requestId:request.id,status:String(request.status),expiresAt:request.expiresAt});}}
    return {targetUserId,package:before.package,additiveOnly:true as const,runtimeAuthority:"EXPLICIT_PLATFORM_CAPABILITY_GRANTS_ONLY" as const,ownerDirectControl:actorIsOwner,directGrants,privilegedRequests:{created,reused},after:await this.preview(targetUserId)};
  }
}
