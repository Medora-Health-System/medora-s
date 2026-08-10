import type {FacilitySummary} from "@/lib/platform/api";
export function filterPlatformFacilities(rows:FacilitySummary[],query:string,status:"ALL"|"ACTIVE"|"INACTIVE"="ALL"){const q=query.trim().toLocaleLowerCase();return rows.filter(row=>(status==="ALL"||(status==="ACTIVE")===row.isActive)&&(!q||[row.name,row.code,row.country,row.facilityType].some(value=>value.toLocaleLowerCase().includes(q))))}
export function authorizedPlatformRedirect(value:string|null,authorized:boolean){return authorized&&value?.startsWith("/platform")&&!value.startsWith("//")?value:null}
export function resolvePostLoginWorkspace(facilityDestination:string,requested:string|null,platformAuthorized:boolean){return platformAuthorized?(authorizedPlatformRedirect(requested,true)??"/platform"):facilityDestination}
