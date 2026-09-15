import {
  filterHrefListForFreestandingErRnProviderSidebar,
  isHaitiPublicHealthJurisdiction,
  isNavigationAreaVisible,
  resolveCapabilityAwareNavigationAreas,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveClinicCareAwareSidebarHref,
  resolveClinicCareLabRadSidebarHref,
  resolveClinicCareAwarePharmacySidebarHref,
  type NavigationArea,
  type NavigationProfileInput,
} from "@medora/shared";
import type { SidebarNavItem } from "@/components/app-shell/sidebarNavConfig";

export type { NavigationArea, NavigationProfileInput };
export const HOSPITAL_CARE_NAV_HREF = "/app/hospitalisation";
export const OBSERVATION_BOARD_HREF = HOSPITAL_CARE_NAV_HREF;
export type CapabilityNavigationProfileInput = NavigationProfileInput & { careProfileJson?: unknown; facilityCountry?: string | null };

export function buildNavigationProfileFromSession(input:{roleCodes:readonly string[];departmentCode?:string|null;prismaDepartmentCode?:string|null;professionCodes?:readonly string[]|null;departmentCodes?:readonly string[]|null;facilityType?:string|null;facilityServiceLines?:readonly string[]|null;careProfileJson?:unknown;facilityCountry?:string|null}):CapabilityNavigationProfileInput{return{roleCodes:input.roleCodes,departmentCode:input.departmentCode??null,prismaDepartmentCode:input.prismaDepartmentCode??null,professionCodes:input.professionCodes??null,departmentCodes:input.departmentCodes??null,facilityType:input.facilityType??null,facilityServiceLines:input.facilityServiceLines??null,careProfileJson:input.careProfileJson,facilityCountry:input.facilityCountry??null}}

export function isFacilityPublicHealthSidebarVisible(profile:CapabilityNavigationProfileInput):boolean{const roleSet=new Set((profile.roleCodes??[]).map(code=>String(code??"").trim().toUpperCase()));return roleSet.has("ADMIN")||roleSet.has("MEDORA_SUPER_ADMIN")||isHaitiPublicHealthJurisdiction(profile.facilityCountry)}

export function applyClinicCareAwareSidebarHrefs(items:SidebarNavItem[],profile:CapabilityNavigationProfileInput):SidebarNavItem[]{const caps=resolveFacilityModuleCapabilitiesD4c1({facilityType:profile.facilityType,careProfileJson:profile.careProfileJson,serviceLines:profile.facilityServiceLines,facilityCountry:profile.facilityCountry});return items.map(item=>{const after7b=resolveClinicCareAwareSidebarHref(item.href,caps);const after7c=resolveClinicCareLabRadSidebarHref(after7b,caps);const nextHref=resolveClinicCareAwarePharmacySidebarHref(after7c,caps);return nextHref===item.href?item:{...item,href:nextHref}})}

export function filterSidebarNavItemsByNavigationAreas(items:SidebarNavItem[],profile:CapabilityNavigationProfileInput):SidebarNavItem[]{
 const roleSet=new Set((profile.roleCodes??[]).map(code=>String(code??"").trim().toUpperCase()));
 // Launch policy: facility ADMIN is an oversight role. Do not hide existing Medora menu
 // entries because of profession/department navigation-area filtering. This changes
 // navigation visibility only; backend RBAC remains authoritative for protected actions.
 if(roleSet.has("ADMIN")) return items;
 const visibleAreas=resolveCapabilityAwareNavigationAreas(profile);const publicHealthSidebarVisible=isFacilityPublicHealthSidebarVisible(profile);const areaFiltered=items.filter(item=>isNavigationAreaVisible(visibleAreas,item.navAreas)&&(item.group!=="sante_publique"||publicHealthSidebarVisible));const freestandingFiltered=filterHrefListForFreestandingErRnProviderSidebar(areaFiltered,{roleCodes:profile.roleCodes,facilityType:profile.facilityType,facilityServiceLines:profile.facilityServiceLines});return applyClinicCareAwareSidebarHrefs(freestandingFiltered,profile)
}

export function filterSidebarNavItemsForSession(items:SidebarNavItem[],input:{roleCodes:readonly string[];profile:CapabilityNavigationProfileInput}):SidebarNavItem[]{const roleSet=new Set(input.roleCodes.map(code=>code.trim().toUpperCase()));const roleFiltered=roleSet.has("ADMIN")?items.filter(item=>!item.platformAdminOnly):items.filter(item=>item.roles.some(role=>roleSet.has(role)));return filterSidebarNavItemsByNavigationAreas(roleFiltered,input.profile)}
export function navigationVisibilityUsesSharedResolver():boolean{return typeof resolveCapabilityAwareNavigationAreas==="function"}
