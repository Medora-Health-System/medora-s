"use client";
import {useState} from "react";
import {usePlatform} from "./PlatformContext";
import {usePlatformStepUp} from "./PlatformStepUp";
import {can} from "./access";
import {isRecentMfaError,platformCapabilitiesApi,platformPrivilegedActionsApi,platformStaffApi} from "@/lib/platform/api";
import {TECHNOLOGY_IT_ADMIN_PACKAGE} from "@/lib/platform/staffAccessPackages";
import type {MedoraStaffPersonaCode} from "@/lib/platform/staffPersona";

const DEPARTMENTS=[
  {code:"TECHNOLOGY_IT_ADMIN",label:"Technology / IT Administration",persona:"PLATFORM_OPERATIONS" as MedoraStaffPersonaCode,detail:"Broad Medora technical administration across facilities. No facility assignment is created."},
  {code:"IMPLEMENTATION",label:"Implementation",persona:"IMPLEMENTATION" as MedoraStaffPersonaCode,detail:"Enterprise implementation and onboarding operations."},
  {code:"SUPPORT",label:"Support",persona:"SUPPORT" as MedoraStaffPersonaCode,detail:"Day-to-day Medora support operations."},
  {code:"COMPLIANCE_SECURITY",label:"Compliance / Security",persona:"COMPLIANCE_SECURITY" as MedoraStaffPersonaCode,detail:"Compliance and security operations."},
  {code:"BILLING_OPERATIONS",label:"Billing Operations",persona:"BILLING_OPERATIONS" as MedoraStaffPersonaCode,detail:"Revenue-cycle platform operations."},
  {code:"PLATFORM_OPERATIONS",label:"Platform Operations",persona:"PLATFORM_OPERATIONS" as MedoraStaffPersonaCode,detail:"General Medora platform operations."},
] as const;

export function GlobalStaffOnboarding(){
  const{context}=usePlatform(),step=usePlatformStepUp();
  const[open,setOpen]=useState(false),[department,setDepartment]=useState<(typeof DEPARTMENTS)[number]["code"]>("TECHNOLOGY_IT_ADMIN"),[error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
  if(!can(context,"STAFF_PROVISION"))return null;
  const selected=DEPARTMENTS.find(x=>x.code===department)!;
  async function runWithStepUp(run:()=>Promise<void>){try{await run()}catch(e){if(isRecentMfaError(e))return step(run);throw e}}
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");setSuccess("");setBusy(true);
    const f=new FormData(e.currentTarget);const reason=String(f.get("reason"));const ticket=String(f.get("ticketReference")||"")||undefined;
    try{
      await runWithStepUp(async()=>{
        const user=await platformStaffApi.createAccount({firstName:String(f.get("firstName")),lastName:String(f.get("lastName")),email:String(f.get("email")),password:String(f.get("password")),reason,ticketReference:ticket});
        await platformStaffApi.provision(user.id,{persona:selected.persona,reason,ticketReference:ticket});
        if(department==="TECHNOLOGY_IT_ADMIN"){
          const catalog=await platformCapabilitiesApi.list();const risk=new Map(catalog.map(c=>[c.code,c.riskLevel]));
          for(const code of TECHNOLOGY_IT_ADMIN_PACKAGE.capabilities){
            if(risk.get(code)==="CRITICAL")await platformPrivilegedActionsApi.create({operationType:"CAPABILITY_GRANT",targetUserId:user.id,capabilityCode:code,reason,...(ticket?{ticketReference:ticket}:{})});
            else await platformStaffApi.grant(user.id,{code,reason,ticketReference:ticket});
          }
        }
        setSuccess(department==="TECHNOLOGY_IT_ADMIN"?"IT administrator created without a facility assignment. Standard IT access is active; critical grants are queued for independent approval.":`${selected.label} staff account created without a facility assignment.`);
        setOpen(false);
      });
    }catch(e){setError(e instanceof Error?e.message:"Unable to create Medora staff account")}finally{setBusy(false)}
  }
  return <section className="platform-panel">
    <div className="panel-heading"><div><h2>Medora corporate staff</h2><p>Create Medora employees by department without assigning them to a customer facility.</p></div><button className="button high-risk" onClick={()=>setOpen(v=>!v)}>{open?"Cancel":"Add global Medora staff"}</button></div>
    <p className="notice"><b>Facility-independent:</b> these accounts belong to Medora operations. They receive no facility role, patient chart authority, or clinical assignment from this workflow.</p>
    {success&&<p role="status" className="notice">{success}</p>}{error&&<p role="alert" className="platform-error">{error}</p>}
    {open&&<form className="platform-form" onSubmit={submit}>
      <div className="two-col"><label>First name<input name="firstName" required/></label><label>Last name<input name="lastName" required/></label></div>
      <label>Work email<input name="email" type="email" required/></label><label>Temporary password<input name="password" type="password" minLength={8} required/></label>
      <label>Department / access package<select value={department} onChange={e=>setDepartment(e.currentTarget.value as typeof department)}>{DEPARTMENTS.map(d=><option key={d.code} value={d.code}>{d.label}</option>)}</select></label>
      <p className="notice">{selected.detail}{department==="TECHNOLOGY_IT_ADMIN"&&<> Critical IT powers still require dual-control approval. Billing/financial and patient-chart authority remain separate.</>}</p>
      <label>Reason<textarea name="reason" minLength={3} required defaultValue="Medora corporate staff onboarding"/></label><label>Ticket/reference<input name="ticketReference"/></label>
      <button className="button high-risk" disabled={busy}>{busy?"Creating account…":"Create Medora staff account"}</button>
    </form>}
  </section>;
}
