import type { PlatformCapability, PlatformContext, PrivilegedAction } from "@/lib/platform/api";
export type PlatformArea="facilities"|"staff"|"security"|"compliance"|"billing"|"catalog"|"system";
export const AREA_CAPABILITIES:Record<PlatformArea,readonly PlatformCapability[]>={
 facilities:["FACILITY_CREATE","FACILITY_CONFIGURE","FACILITY_ACTIVATE","FACILITY_HEALTH_VIEW"],
 staff:["STAFF_VIEW","STAFF_PROVISION","STAFF_GRANT_CAPABILITIES","STAFF_REVOKE_CAPABILITIES"],
 security:["SECURITY_ACCESS_VIEW","SECURITY_MFA_RECOVERY","SECURITY_PRIVILEGED_ACTIONS","SECURITY_AUDIT_VIEW","PRIVILEGED_ACTION_APPROVE"],
 compliance:["COMPLIANCE_AUDIT_VIEW","COMPLIANCE_EXPORT_MONITOR","COMPLIANCE_ROI_MONITOR","COMPLIANCE_CONTROLS_MANAGE"],
 billing:["BILLING_RCM_VIEW","BILLING_RCM_MANAGE"], catalog:["CATALOG_CONFIG_VIEW","CATALOG_CONFIG_MANAGE"],
 system:["SYSTEM_HEALTH_VIEW","SYSTEM_BACKUP_READINESS_VIEW","SYSTEM_GOLIVE_MONITOR"]};
export function can(ctx:PlatformContext|undefined,cap:PlatformCapability){return !!ctx&&(ctx.platformPrincipal||ctx.capabilities.includes(cap));}
export function canEnter(ctx:PlatformContext|undefined,area:PlatformArea){return !!ctx&&(ctx.platformPrincipal||AREA_CAPABILITIES[area].some(c=>ctx.capabilities.includes(c)));}
export function visibleAreas(ctx:PlatformContext|undefined){return (Object.keys(AREA_CAPABILITIES) as PlatformArea[]).filter(a=>canEnter(ctx,a));}
export function mayApprove(action:PrivilegedAction,actorId:string,ctx:PlatformContext){return can(ctx,"PRIVILEGED_ACTION_APPROVE")&&action.status==="PENDING"&&action.requesterUserId!==actorId&&action.targetUserId!==actorId;}
export function mayExecute(action:PrivilegedAction,actorId:string,ctx:PlatformContext){return action.status==="APPROVED"&&(ctx.platformPrincipal||action.requesterUserId===actorId);}
export function safeStepUpMessage(error:{status:number;message:string}){return error.status===403&&error.message.includes("RECENT_SESSION_MFA_REQUIRED")?"Recent MFA verification is required. Complete step-up verification, then retry.":error.message;}
