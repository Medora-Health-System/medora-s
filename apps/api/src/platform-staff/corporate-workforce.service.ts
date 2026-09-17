import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { PrismaService } from "../prisma/prisma.service";

export const CORPORATE_DEPARTMENTS = ["TECHNOLOGY_IT","ENGINEERING","IMPLEMENTATION","SUPPORT","COMPLIANCE_SECURITY","BILLING_RCM","PRODUCT_QA","PLATFORM_OPERATIONS","EXECUTIVE_ADMINISTRATION"] as const;
export const EMPLOYEE_TYPES = ["FULL_TIME","PART_TIME","CONTRACTOR","CONSULTANT","INTERN"] as const;
export const EMPLOYMENT_STATUSES = ["ACTIVE","LEAVE","SUSPENDED","TERMINATED"] as const;
export type WorkforceInput={department:(typeof CORPORATE_DEPARTMENTS)[number];jobTitle:string;managerUserId?:string|null;employeeType:(typeof EMPLOYEE_TYPES)[number];employmentStatus:(typeof EMPLOYMENT_STATUSES)[number];startDate:string;endDate?:string|null;reason:string;ticketReference?:string};

@Injectable()
export class CorporateWorkforceService {
  constructor(private readonly prisma:PrismaService,private readonly audit:AuditService){}
  private date(value:string,label:string){const d=new Date(value);if(Number.isNaN(d.getTime()))throw new BadRequestException(`${label} is invalid`);return d;}
  async upsert(actorUserId:string,targetUserId:string,input:WorkforceInput){
    const staff=await this.prisma.medoraStaffProfile.findUnique({where:{userId:targetUserId},select:{id:true,isActive:true}});
    if(!staff)throw new NotFoundException("Medora staff profile not found");
    const start=this.date(input.startDate,"startDate"),end=input.endDate?this.date(input.endDate,"endDate"):null;
    if(end&&end<start)throw new BadRequestException("endDate must not precede startDate");
    if(input.managerUserId===targetUserId)throw new BadRequestException("An employee cannot manage themselves");
    if(input.managerUserId){const manager=await this.prisma.medoraStaffProfile.findUnique({where:{userId:input.managerUserId},select:{isActive:true}});if(!manager?.isActive)throw new BadRequestException("Manager must be active Medora staff");}
    const id=randomUUID();
    const rows=await this.prisma.$queryRawUnsafe<any[]>(`INSERT INTO "MedoraWorkforceProfile" ("id","staffProfileId","department","jobTitle","managerUserId","employeeType","employmentStatus","startDate","endDate","createdByUserId","updatedByUserId","createdAt","updatedAt") VALUES ($1::uuid,$2::uuid,$3::"MedoraCorporateDepartment",$4,$5::uuid,$6::"MedoraEmployeeType",$7::"MedoraEmploymentStatus",$8,$9,$10::uuid,$10::uuid,NOW(),NOW()) ON CONFLICT ("staffProfileId") DO UPDATE SET "department"=EXCLUDED."department","jobTitle"=EXCLUDED."jobTitle","managerUserId"=EXCLUDED."managerUserId","employeeType"=EXCLUDED."employeeType","employmentStatus"=EXCLUDED."employmentStatus","startDate"=EXCLUDED."startDate","endDate"=EXCLUDED."endDate","updatedByUserId"=EXCLUDED."updatedByUserId","updatedAt"=NOW() RETURNING *`,id,staff.id,input.department,input.jobTitle.trim(),input.managerUserId??null,input.employeeType,input.employmentStatus,start,end,actorUserId);
    const row=rows[0];
    await logSecurityAdminAudit(this.audit,AuditAction.UPDATE,{event:"MEDORA_WORKFORCE_PROFILE_UPSERTED",actorUserId,entityType:"MedoraWorkforceProfile",entityId:String(row.id),severity:"CRITICAL",outcome:"SUCCESS",sourceOperation:"platform.staff.workforce.upsert",evidence:{targetUserId,department:input.department,jobTitle:input.jobTitle,managerUserId:input.managerUserId??null,employeeType:input.employeeType,employmentStatus:input.employmentStatus,startDate:start.toISOString(),endDate:end?.toISOString()??null,reason:input.reason,...(input.ticketReference?{ticketReference:input.ticketReference}:{})}});
    return row;
  }
  async get(targetUserId:string){
    const rows=await this.prisma.$queryRawUnsafe<any[]>(`SELECT w.*, u."firstName" AS "managerFirstName", u."lastName" AS "managerLastName" FROM "MedoraWorkforceProfile" w JOIN "MedoraStaffProfile" s ON s.id=w."staffProfileId" LEFT JOIN "User" u ON u.id=w."managerUserId" WHERE s."userId"=$1::uuid`,targetUserId);
    return rows[0]??null;
  }
}
