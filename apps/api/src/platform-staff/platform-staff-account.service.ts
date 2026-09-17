import { ConflictException, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";

export type CreatePlatformStaffAccountInput = { firstName:string; lastName:string; email:string; password:string; reason:string; ticketReference?:string };

@Injectable()
export class PlatformStaffAccountService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  async create(actorUserId:string,input:CreatePlatformStaffAccountInput){
    const email=input.email.trim().toLowerCase();
    const existing=await this.prisma.user.findUnique({where:{email},select:{id:true}});
    if(existing)throw new ConflictException("A user with this email already exists");
    const passwordHash=await argon2.hash(input.password);
    return this.prisma.$transaction(async tx=>{
      const user=await tx.user.create({data:{email,firstName:input.firstName.trim(),lastName:input.lastName.trim(),passwordHash,isActive:true},select:{id:true,firstName:true,lastName:true,email:true,isActive:true,mfaEnabled:true}});
      await logSecurityAdminAudit(this.audit,AuditAction.CREATE,{event:"PLATFORM_STAFF_ACCOUNT_CREATED",actorUserId,entityType:"User",entityId:user.id,severity:"CRITICAL",outcome:"SUCCESS",sourceOperation:"platform.staff.account.create",evidence:{targetUserId:user.id,facilityIndependent:true,facilityRoleAssignmentsCreated:0,reason:input.reason,...(input.ticketReference?{ticketReference:input.ticketReference}:{})},tx});
      return user;
    });
  }
}
