import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
export type AmputationRegion = "finger_thumb" | "hand_upper_extremity" | "toe" | "foot_lower_extremity" | "unspecified";
export type AmputationExtent = "partial" | "complete" | "multiple_digits" | "unknown";
export type AmputationModifier = "crush_mechanism" | "sharp" | "contaminated" | "hemorrhage_risk" | "replantation_consideration";
export type AmputationDispositionRecommendationId = "discharge" | "observation" | "admission" | "transfer" | "hand_surgery" | "orthopedics" | "plastics" | "vascular";
export type AmputationDispositionRecommendation = { id: AmputationDispositionRecommendationId; rationale: string };
export type AmputationDiagnosisInput = { code?: string; displayName?: string };
export type AmputationContext = { regions: AmputationRegion[]; extent: AmputationExtent; modifiers: AmputationModifier[]; dischargeFamilyId: string | null; dispositionRecommendations: AmputationDispositionRecommendation[] };
const n = (s = "") => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function resolveAmputationContextFromDiagnosis(input: AmputationDiagnosisInput): AmputationContext {
 const code=(input.code??"").replace(/\s/g,"").toUpperCase(), text=n(`${input.displayName??""} ${code}`); let regions:AmputationRegion[]=[];
 if(code.startsWith("S68")||/finger|thumb|doigt|pouce/.test(text)) regions=["finger_thumb"];
 else if(code.startsWith("S48")||code.startsWith("S58")||/hand|upper extremity|main|bras|forearm|avant-bras/.test(text)) regions=["hand_upper_extremity"];
 else if((code.startsWith("S98.1")||code.startsWith("S98.2"))||(/toe|orteil/.test(text)&&!/foot|pied/.test(text))) regions=["toe"];
 else if(code.startsWith("S78")||code.startsWith("S88")||code.startsWith("S98")||/foot|lower extremity|pied|jambe/.test(text)) regions=["foot_lower_extremity"];
 else if(code.startsWith("S08")||code.startsWith("S28.1")||code.startsWith("S28.2")||code.startsWith("S38.2")||/amputation|traumatic amputation|amputation traumatique/.test(text)) regions=["unspecified"];
 const modifiers:AmputationModifier[]=[]; if(/crush|ecras/.test(text))modifiers.push("crush_mechanism");if(/sharp|knife|cut|tranch/.test(text))modifiers.push("sharp");if(/contamin|soil|dirty|souill/.test(text))modifiers.push("contaminated");if(/hemorrhag|bleeding|saign/.test(text))modifiers.push("hemorrhage_risk");if(/replant/.test(text)||regions.some(r=>r==="finger_thumb"||r==="hand_upper_extremity"))modifiers.push("replantation_consideration");
 // Prefer site-specific ICD families over keyword-only partial/complete when a region is known.
 const extent:AmputationExtent=/multiple|several|plusieurs/.test(text)?"multiple_digits":/partial|partielle/.test(text)?"partial":/complete|totale?/.test(text)?"complete":"unknown";
 const dischargeFamilyId=!regions.length?null:regions.includes("finger_thumb")?"trauma_amputation_finger_thumb":regions.includes("hand_upper_extremity")?"trauma_amputation_hand_upper_extremity":regions.includes("toe")?"trauma_amputation_toe":regions.includes("foot_lower_extremity")?"trauma_amputation_foot_lower_extremity":regions.includes("unspecified")?"trauma_amputation_generic":extent==="partial"?"trauma_amputation_partial":extent==="complete"?"trauma_amputation_complete":"trauma_amputation_generic";
 return {regions,extent,modifiers,dischargeFamilyId,dispositionRecommendations:computeAmputationDispositionRecommendations(regions,extent,modifiers)};
}
export function computeAmputationDispositionRecommendations(regions:readonly AmputationRegion[],extent:AmputationExtent,modifiers:readonly AmputationModifier[]):AmputationDispositionRecommendation[] {
 const r:AmputationDispositionRecommendation[]=[{id:"transfer",rationale:"Traumatic amputation may require time-sensitive specialty and operative capability."},{id:"admission",rationale:"Traumatic amputation requires hemorrhage control, analgesia, tetanus assessment, and serial neurovascular care."}];
 if(regions.some(x=>x==="finger_thumb"||x==="hand_upper_extremity"))r.push({id:"hand_surgery",rationale:"Digit or hand amputation warrants urgent hand-surgery assessment for replantation or revision."},{id:"plastics",rationale:"Reconstructive options should be assessed promptly when tissue is potentially salvageable."});
 if(modifiers.includes("hemorrhage_risk"))r.push({id:"vascular",rationale:"Ongoing hemorrhage or perfusion concern warrants vascular assessment."});
 if(regions.some(x=>x==="foot_lower_extremity"||x==="toe"))r.push({id:"orthopedics",rationale:"Lower-extremity amputation requires orthopedic assessment for function and wound management."});
 return [...new Map(r.map(x=>[x.id,x])).values()];
}
export function adaptAmputationComplaintIntel(intel:ProviderDocumentationComplaintIntelligence,context:Pick<AmputationContext,"regions">):ProviderDocumentationComplaintIntelligence { const h=context.regions.includes("finger_thumb")?["finger","thumb"]:context.regions.includes("toe")?["toe","foot"]:[];const s=(v?:string[])=>v?.slice().sort((a,b)=>Number(h.some(x=>b.toLowerCase().includes(x)))-Number(h.some(x=>a.toLowerCase().includes(x))));return {...intel,hpi:s(intel.hpi),mdmPlanSummary:s(intel.mdmPlanSummary)}; }
