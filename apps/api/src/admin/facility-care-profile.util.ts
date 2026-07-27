import {
  applyOptionalModulesToServiceLines,
  buildFacilityCareProfileJson,
  getDefaultOptionalModulesForProfile,
  getTypeDefaultServiceLinesForCareProfile,
  parseFacilityCareProfileJson,
  resolveFacilityCareProfile,
  type FacilityCareProfile,
  type FacilityCareProfileJson,
  type FacilityOptionalModules,
  type MedoraFacilityType,
  type MedoraServiceLine,
  type UpdateFacilityServiceConfigDto,
  type CreateFacilityDto,
} from "@medora/shared";
import { getDefaultServiceLinesForFacilityType } from "@medora/shared";

/** Strip client-controlled ownership / capability escalation fields (none accepted from client). */
export function listForbiddenFacilityEscalationKeys(): readonly string[] {
  return ["ownerUserId", "capabilities", "isPlatformAdmin", "facilityId", "roleCodes"] as const;
}

export function careProfileFromFacilityType(facilityType: MedoraFacilityType): FacilityCareProfile {
  return resolveFacilityCareProfile({ facilityType, serviceLines: null });
}

export function buildCareProfileJsonFromDto(
  dto: Partial<CreateFacilityDto> | Partial<UpdateFacilityServiceConfigDto>,
  facilityType: MedoraFacilityType
): FacilityCareProfileJson {
  const profile =
    (dto.careProfile as FacilityCareProfile | null | undefined) ??
    careProfileFromFacilityType(facilityType);
  const defaults = getDefaultOptionalModulesForProfile(profile);
  const modules: FacilityOptionalModules = {
    laboratory: dto.optionalModules?.laboratory ?? defaults.laboratory,
    radiology: dto.optionalModules?.radiology ?? defaults.radiology,
    pharmacy: dto.optionalModules?.pharmacy ?? defaults.pharmacy,
    publicHealth: dto.optionalModules?.publicHealth ?? defaults.publicHealth,
    billing: dto.optionalModules?.billing ?? defaults.billing,
  };
  return buildFacilityCareProfileJson({
    profile,
    operatingMode: dto.ambulatoryOperatingMode ?? null,
    subtype: dto.ambulatorySubtype ?? null,
    optionalModules: modules,
    address: dto.operationalAddress ?? null,
    printDisplayName: dto.printDisplayName ?? null,
  });
}

export function resolveServiceLinesForCareConfig(input: {
  facilityType: MedoraFacilityType;
  dto: Partial<UpdateFacilityServiceConfigDto> | Partial<CreateFacilityDto>;
  existingServiceLines?: MedoraServiceLine[] | null;
  existingCareProfileJson?: unknown;
}): MedoraServiceLine[] {
  const profile =
    (input.dto.careProfile as FacilityCareProfile | null | undefined) ??
    resolveFacilityCareProfile({
      facilityType: input.facilityType,
      careProfileJson: input.existingCareProfileJson,
      serviceLines: input.existingServiceLines,
    });

  const reset =
    "resetToTypeDefaults" in input.dto && input.dto.resetToTypeDefaults === true;

  let base: MedoraServiceLine[];
  if (reset) {
    const ambulatoryDefaults = getTypeDefaultServiceLinesForCareProfile(profile);
    base =
      ambulatoryDefaults.length > 0
        ? ambulatoryDefaults
        : getDefaultServiceLinesForFacilityType(input.facilityType);
  } else if (input.dto.serviceLines != null) {
    base = [...input.dto.serviceLines] as MedoraServiceLine[];
  } else if (input.existingServiceLines != null && input.existingServiceLines.length > 0) {
    base = [...input.existingServiceLines];
  } else {
    const ambulatoryDefaults = getTypeDefaultServiceLinesForCareProfile(profile);
    base =
      ambulatoryDefaults.length > 0
        ? ambulatoryDefaults
        : getDefaultServiceLinesForFacilityType(input.facilityType);
  }

  const careJson = buildCareProfileJsonFromDto(input.dto, input.facilityType);
  const modules = {
    ...getDefaultOptionalModulesForProfile(profile),
    ...(careJson.optionalModules ?? {}),
  } as FacilityOptionalModules;

  if (input.dto.optionalModules != null || reset) {
    return applyOptionalModulesToServiceLines(base, modules);
  }
  return base;
}

export function mergeCareProfileJson(
  existing: unknown,
  dto: Partial<UpdateFacilityServiceConfigDto> | Partial<CreateFacilityDto>,
  facilityType: MedoraFacilityType
): FacilityCareProfileJson {
  const prev = parseFacilityCareProfileJson(existing);
  const next = buildCareProfileJsonFromDto(dto, facilityType);
  return {
    schemaVersion: 1,
    careSetting: next.careSetting ?? prev?.careSetting ?? null,
    operatingMode: next.operatingMode ?? prev?.operatingMode ?? null,
    subtype: next.subtype ?? prev?.subtype ?? null,
    profile: next.profile ?? prev?.profile ?? null,
    optionalModules: next.optionalModules ?? prev?.optionalModules ?? null,
    address: next.address ?? prev?.address ?? null,
    printDisplayName: next.printDisplayName ?? prev?.printDisplayName ?? null,
  };
}
