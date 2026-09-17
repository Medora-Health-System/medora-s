"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {platformFacilitiesApi,platformPrivilegedActionsApi,isRecentMfaError,type FacilityLifecyclePreflight} from "@/lib/platform/api";
import {Page,Badge} from "@/features/platform/PlatformUi";
import {usePlatformStepUp} from "@/features/platform/PlatformStepUp";
import {usePlatform} from "@/features/platform/PlatformContext";
import {can} from "@/features/platform/access";
import {productUiLanguageSelectOptions} from "@/i18n/config";
import {useI18n} from "@/i18n/I18nProvider";

const WARNING_LABELS:Record<string,string>={
  OPEN_ENCOUNTERS_PRESENT:"Open encounters are still present. Coordinate operational closure before executing deactivation.",
  ACTIVE_USER_ASSIGNMENTS_PRESENT:"Active facility assignments remain. Deactivation does not delete or revoke those assignments.",
  LIFECYCLE_REQUEST_ALREADY_PENDING:"A lifecycle request is already pending or approved. Do not create a duplicate request.",
};

export default function FacilityDetail(){
  const{t}=useI18n();
  const{id}=useParams<{id:string}>(),{context}=usePlatform(),step=usePlatformStepUp();
  const[row,setRow]=useState<any>(),[config,setConfig]=useState<any>(),[preflight,setPreflight]=useState<FacilityLifecyclePreflight>(),[error,setError]=useState(""),[lifecycleState,setLifecycleState]=useState<"true"|"false">("false"),[acknowledged,setAcknowledged]=useState(false),[requesting,setRequesting]=useState(false);

  const load=async()=>{
    try{
      setError("");
      const facility=await platformFacilitiesApi.detail(id);
      setRow(facility);
      setLifecycleState(facility.isActive?"false":"true");
      if(can(context,"FACILITY_CONFIGURE"))setConfig(await platformFacilitiesApi.configuration(id));
      if(can(context,"FACILITY_ACTIVATE"))setPreflight(await platformFacilitiesApi.lifecyclePreflight(id));
    }catch(e){if(isRecentMfaError(e))await step(load);else setError(e instanceof Error?e.message:"Unable to load facility")}
  };
  useEffect(()=>{void load()},[id,context]);

  async function secured(run:()=>Promise<unknown>){
    try{setError("");await run();await load()}
    catch(e){if(isRecentMfaError(e))await step(async()=>{await run();await load()});else setError(e instanceof Error?e.message:"Operation denied")}
  }
  async function saveCore(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);await secured(()=>platformFacilitiesApi.serviceConfig(id,{facilityType:String(f.get("facilityType")),timezone:String(f.get("timezone")),country:String(f.get("country"))}))}
  async function saveBilling(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);await secured(()=>platformFacilitiesApi.billingIdentity(id,{billingLegalName:String(f.get("billingLegalName")||"")||null,billingNpi:String(f.get("billingNpi")||"")||null,billingCountry:String(f.get("billingCountry")||"")||null}))}
  async function saveWorkflow(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);await secured(()=>platformFacilitiesApi.billingWorkflow(id,{billingClassificationMode:String(f.get("billingClassificationMode"))||null,allowUrgentCareToEmergencyUpgrade:f.get("allowUrgentCareToEmergencyUpgrade")==="on",requireUcToEdPatientAcknowledgement:f.get("requireUcToEdPatientAcknowledgement")==="on",showEncounterBillingControls:f.get("showEncounterBillingControls")==="on"}))}
  async function requestActivation(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget),desired=f.get("isActive")==="true";
    if(!desired){
      if(!preflight){setError("Lifecycle preflight must be verified before requesting deactivation.");return}
      if(preflight.deactivation.pendingPrivilegedActions>0){setError("A lifecycle request is already pending or approved for this facility.");return}
      if(!acknowledged){setError("Acknowledge the non-destructive deactivation notice before continuing.");return}
    }
    setRequesting(true);
    try{await secured(()=>platformPrivilegedActionsApi.create({operationType:"FACILITY_ACTIVATION_CHANGE",targetFacilityId:id,isActive:desired,reason:String(f.get("reason")),...(f.get("ticketReference")?{ticketReference:String(f.get("ticketReference"))}:{})}))}
    finally{setRequesting(false)}
  }

  const deactivating=lifecycleState==="false";
  const duplicateLifecycleRequest=(preflight?.deactivation.pendingPrivilegedActions??0)>0;
  return <Page area="facilities" title={row?.name||t("facility.detailFallback")} subtitle={t("facility.detailSubtitle")}>
    {error&&<p className="platform-error" role="alert">{error}</p>}
    {row&&<section className="platform-panel"><dl className="platform-details"><dt>Facility ID</dt><dd><code>{row.id}</code></dd><dt>Code</dt><dd>{row.code}</dd><dt>Type / country</dt><dd>{row.facilityType} / {row.country}</dd><dt>Timezone / language</dt><dd>{row.timezone} / {row.defaultLanguage}</dd><dt>Status</dt><dd><Badge value={row.isActive?"ACTIVE":"INACTIVE"}/></dd></dl></section>}
    {config&&can(context,"FACILITY_CONFIGURE")&&<><section className="platform-panel"><h2>Operational configuration</h2><form className="platform-form" onSubmit={saveCore}><label>Facility type<input name="facilityType" defaultValue={config.facility.facilityType}/></label><label>Country<input name="country" defaultValue={config.facility.country}/></label><label>Timezone<input name="timezone" defaultValue={config.facility.timezone}/></label><label>Language<select defaultValue={config.facility.defaultLanguage} onChange={e=>void secured(()=>platformFacilitiesApi.language(id,e.target.value))}>{productUiLanguageSelectOptions().map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label><button className="button">Save authoritative configuration</button></form></section><section className="platform-panel"><h2>Billing identity</h2><form className="platform-form" onSubmit={saveBilling}><label>Legal name<input name="billingLegalName" defaultValue={config.billingIdentity.billingLegalName??""}/></label><label>NPI<input name="billingNpi" defaultValue={config.billingIdentity.billingNpi??""}/></label><label>Billing country<input name="billingCountry" defaultValue={config.billingIdentity.billingCountry??""}/></label><button className="button">Save billing identity</button></form><h3>Billing workflow</h3><form className="platform-form" onSubmit={saveWorkflow}><label>Classification mode<select name="billingClassificationMode" defaultValue={config.billingWorkflow.billingClassificationMode??""}><option value="">Inferred default</option><option value="CLINIC_ONLY">Clinic only</option><option value="URGENT_CARE_ONLY">Urgent care only</option><option value="EMERGENCY_ONLY">Emergency only</option><option value="HYBRID_UC_ED">Hybrid UC / ED</option><option value="HOSPITAL_ENTERPRISE">Hospital enterprise</option></select></label><label><input type="checkbox" name="allowUrgentCareToEmergencyUpgrade" defaultChecked={config.billingWorkflow.allowUrgentCareToEmergencyUpgrade}/> Allow UC-to-ED upgrade</label><label><input type="checkbox" name="requireUcToEdPatientAcknowledgement" defaultChecked={config.billingWorkflow.requireUcToEdPatientAcknowledgement}/> Require acknowledgement</label><label><input type="checkbox" name="showEncounterBillingControls" defaultChecked={config.billingWorkflow.showEncounterBillingControls}/> Show billing controls</label><button className="button">Save billing workflow</button></form><h3>Departments</h3><ul>{config.departments.map((d:any)=><li key={d.id}><b>{d.name}</b> — {d.code}</li>)}</ul></section></>}
    <section className="platform-panel"><h2>Users &amp; access boundaries</h2><div className="two-col"><article><h3>Facility users</h3><p>Customer roles remain scoped to this facility and are administered from the care workspace by a facility ADMIN. Platform capability does not grant that role.</p><a className="button" href="/app/admin/users">Open facility Users &amp; Access</a></article><article><h3>Medora Staff</h3><p>Global Medora staff personas and platform capability grants remain independent.</p><a className="button" href="/platform/staff">Open Medora Staff</a></article></div></section>
    {row&&can(context,"FACILITY_ACTIVATE")&&<section className="platform-panel"><h2>Facility lifecycle</h2><p className="notice">Activation changes are CRITICAL. Submission creates a 15-minute immutable request for a distinct approver.</p>
      <h3>Deactivation preflight</h3>
      {!preflight?<p className="notice">Lifecycle evidence has not been verified. Deactivation cannot be requested until preflight succeeds.</p>:<><dl className="platform-details"><dt>Open encounters</dt><dd>{preflight.deactivation.openEncounters}</dd><dt>Active facility assignments</dt><dd>{preflight.deactivation.activeAssignments}</dd><dt>Pending / approved lifecycle requests</dt><dd>{preflight.deactivation.pendingPrivilegedActions}</dd><dt>Data handling</dt><dd><Badge value="NON-DESTRUCTIVE"/></dd></dl>{preflight.deactivation.warnings.length>0?<ul>{preflight.deactivation.warnings.map(w=><li key={w}>{WARNING_LABELS[w]??w}</li>)}</ul>:<p className="notice">No lifecycle preflight warnings detected.</p>}</>}
      <form className="platform-form" onSubmit={requestActivation}><label>Desired state<select name="isActive" value={lifecycleState} onChange={e=>{setLifecycleState(e.target.value as "true"|"false");setAcknowledged(false)}}><option value="true">Active</option><option value="false">Inactive</option></select></label>{deactivating&&<label><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/> I understand deactivation is non-destructive and does not delete patient, encounter, chart, billing, or audit records.</label>}<label>Reason<textarea name="reason" required minLength={3}/></label><label>Ticket/reference<input name="ticketReference"/></label><button className="button high-risk" disabled={requesting||(deactivating&&(!preflight||!acknowledged||duplicateLifecycleRequest))}>{requesting?"Submitting…":"Request activation change"}</button></form>
    </section>}
  </Page>
}
