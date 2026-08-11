"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { InpatientNursingAssessmentSave, InpatientNursingAssessmentV1 } from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";

type CodedKey = "generalAppearance" | "neurologic" | "mentalStatus" | "airway" | "respiratory" | "cardiac" | "giAbdomen" | "gu" | "mobility" | "musculoskeletal" | "skinWounds" | "safety";
const rows: Array<{ key: CodedKey; label: string; options: string[] }> = [
  { key: "generalAppearance", label: "general", options: ["NORMAL", "CONCERN"] }, { key: "neurologic", label: "neurologic", options: ["NORMAL", "CONCERN"] },
  { key: "mentalStatus", label: "mental", options: ["ALERT", "DROWSY", "CONFUSED"] }, { key: "airway", label: "airway", options: ["PATENT", "CONCERN"] },
  { key: "respiratory", label: "respiratory", options: ["CLEAR", "DIMINISHED", "LABORED"] }, { key: "cardiac", label: "cardiac", options: ["REGULAR", "IRREGULAR", "CONCERN"] },
  { key: "giAbdomen", label: "gi", options: ["NORMAL", "SOFT_NON_TENDER", "CONCERN"] }, { key: "gu", label: "gu", options: ["NORMAL", "CONCERN"] },
  { key: "mobility", label: "mobility", options: ["INDEPENDENT", "ASSISTED", "IMPAIRED"] }, { key: "musculoskeletal", label: "musculoskeletal", options: ["INTACT", "IMPAIRED"] },
  { key: "skinWounds", label: "skin", options: ["INTACT", "CONCERN"] }, { key: "safety", label: "safety", options: ["NORMAL", "CONCERN"] },
];
const optionKey: Record<string, string> = { NORMAL:"normal", CONCERN:"concern", ALERT:"alert", DROWSY:"drowsy", CONFUSED:"confused", CLEAR:"clear", DIMINISHED:"diminished", LABORED:"labored", REGULAR:"regular", IRREGULAR:"irregular", SOFT_NON_TENDER:"soft", IMPAIRED:"impaired", INTACT:"intact", INDEPENDENT:"independent", ASSISTED:"assisted", LOW:"low", MODERATE:"moderate", HIGH:"high", NONE:"none", PATENT:"normal" };
const empty: InpatientNursingAssessmentSave = { status: "SAVED", orientation: [], ivAccess: [], linesDrainsDevices: [] };

export function InpatientNursingAssessmentPanel({ encounterId, facilityId, patientId, isLocked, onSaved }: { encounterId:string; facilityId:string; patientId:string; isLocked:boolean; onSaved:()=>void|Promise<void> }) {
  const { t } = useI18n(); const k = (s:string) => t(`inpatientNursingAssessmentInp1b.${s}`);
  const [draft,setDraft] = useState<InpatientNursingAssessmentSave>(empty); const [history,setHistory] = useState<InpatientNursingAssessmentV1[]>([]);
  const [profile,setProfile] = useState<Record<string,any>>({}); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  const load = useCallback(async()=>{ try {
    const [enc,events,patient] = await Promise.all([
      apiFetch(`/encounters/${encodeURIComponent(encounterId)}`,{facilityId}), apiFetch(`/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessment-events`,{facilityId}), apiFetch(`/patients/${encodeURIComponent(patientId)}`,{facilityId})
    ]);
    const root=asApiObject<any>(enc)?.nursingAssessment; const current=root?.inpatientNursingAssessmentV1;
    if(current) { const {version,sessionId,authoredAt,authorUserId,authorDisplayName,authorRole,...clinical}=current; setDraft(clinical); }
    setHistory((asApiObject<any>(events)?.entries??[]).map((x:any)=>x.assessment)); setProfile(asApiObject<any>(patient)?.clinicalHistoryProfileJson??{}); setMessage("");
  } catch { setMessage(k("loadError")); } },[encounterId,facilityId,patientId]);
  useEffect(()=>{void load()},[load]);
  const findings=(a:InpatientNursingAssessmentV1)=>rows.flatMap(r=>a[r.key]?.code?[`${k(`domains.${r.label}`)}: ${k(`options.${optionKey[a[r.key]!.code]??"concern"}`)}`]:[]);
  const allergyText=profile?.allergies?.allergyNote || profile?.allergies?.erV1?.medicationAllergiesDetail;
  const historyFields = useMemo(()=>[{section:"medicalHistory",field:"pastMedicalHistory"},{section:"surgicalHistory",field:"pastSurgicalHistory"},{section:"homeMedications",field:"medicationsSummary"},{section:"tobacco",field:"smokingStatus"},{section:"alcohol",field:"alcoholUse"},{section:"substances",field:"marijuanaUse"},{section:"socialHistory",field:"historySocialComments"}],[]);
  async function save(){setBusy(true);try{await apiFetch(`/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessments`,{method:"POST",facilityId,body:JSON.stringify(draft)});setMessage(k("saved"));await load();await onSaved();}finally{setBusy(false)}}
  async function updateHistory(section:string,field:string,value:string){const body=section==="substances"?{section,value:{marijuanaUse:value}}:{section,value:{[field]:value}};await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/${section}`,{method:"PATCH",facilityId,body:JSON.stringify(body)});await load();}
  return <section data-testid="inpatient-native-nursing-assessment" style={{display:"grid",gap:16}}>
    <header><h2 style={{margin:0}}>{k("title")}</h2><p>{k("subtitle")}</p></header>{message&&<p role="status">{message}</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:10}}>{rows.map(r=><label key={r.key} style={{display:"grid",gap:4,fontWeight:600}}>{k(`domains.${r.label}`)}<select data-testid={`inpatient-assessment-${r.key}`} disabled={isLocked} value={draft[r.key]?.code??""} onChange={e=>setDraft(d=>({...d,[r.key]:e.target.value?{code:e.target.value}:undefined}))}><option value="">{k("options.select")}</option>{r.options.map(o=><option value={o} key={o}>{k(`options.${optionKey[o]}`)}</option>)}</select></label>)}</div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><label>{k("domains.orientation")}<select disabled={isLocked} value={draft.orientation?.[0]??""} onChange={e=>setDraft(d=>({...d,orientation:e.target.value?[e.target.value]:[]}))}><option value="">{k("options.select")}</option><option value="PERSON_PLACE_TIME">Person / Place / Time</option><option value="IMPAIRED">{k("options.impaired")}</option></select></label><label>{k("domains.pain")}<input type="number" min={0} max={10} disabled={isLocked} value={draft.pain?.score??""} onChange={e=>setDraft(d=>({...d,pain:e.target.value?{score:Number(e.target.value)}:undefined}))}/></label><label>{k("domains.fall")}<select disabled={isLocked} value={draft.fallRisk?.level??""} onChange={e=>setDraft(d=>({...d,fallRisk:e.target.value?{level:e.target.value as "LOW"|"MODERATE"|"HIGH"}:undefined}))}><option value="">{k("options.select")}</option>{["LOW","MODERATE","HIGH"].map(o=><option key={o} value={o}>{k(`options.${optionKey[o]}`)}</option>)}</select></label></div>
    <label style={{display:"grid",gap:4}}>{k("domains.devices")}<input disabled={isLocked} value={draft.linesDrainsDevices?.[0]?.note??""} onChange={e=>setDraft(d=>({...d,linesDrainsDevices:e.target.value?[{code:"PRESENT",note:e.target.value}]:[]}))}/></label><label style={{display:"grid",gap:4}}>{k("narrative")}<textarea rows={4} disabled={isLocked} value={draft.narrative??""} onChange={e=>setDraft(d=>({...d,narrative:e.target.value}))}/></label>
    {!isLocked&&<button type="button" disabled={busy} onClick={save}>{busy?k("saving"):k("save")}</button>}
    <section><h3>{k("longitudinal")}</h3><p><strong>{k("allergies")}:</strong> {allergyText||k("notDocumented")}</p>{historyFields.map(({section,field})=><HistoryEditor key={section} label={k(`historySections.${section}`)} value={profile?.[section]?.[field]??""} disabled={isLocked} button={k("updateHistory")} onSave={v=>updateHistory(section,field,v)}/>)}</section>
    <section data-testid="inpatient-assessment-history"><h3>{k("history")}</h3>{history.length===0?<p>{k("noHistory")}</p>:history.slice().reverse().map(a=><article key={a.sessionId} style={{borderTop:"1px solid #cbd5e1",padding:"10px 0"}}><strong>{new Date(a.authoredAt).toLocaleString()} — {a.authorDisplayName} ({a.authorRole}) — {a.status}</strong><p>{findings(a).join(" · ")||k("notDocumented")}</p>{a.narrative&&<p>{a.narrative}</p>}</article>)}</section>
  </section>;
}
function HistoryEditor({label,value,disabled,button,onSave}:{label:string;value:string;disabled:boolean;button:string;onSave:(v:string)=>Promise<void>}){const [v,setV]=useState(value);useEffect(()=>setV(value),[value]);return <label style={{display:"grid",gridTemplateColumns:"minmax(150px,1fr) 3fr auto",gap:8,marginBottom:8,alignItems:"center"}}><strong>{label}</strong><textarea rows={2} disabled={disabled} value={v} onChange={e=>setV(e.target.value)}/>{!disabled&&<button type="button" onClick={()=>void onSave(v)}>{button}</button>}</label>}
