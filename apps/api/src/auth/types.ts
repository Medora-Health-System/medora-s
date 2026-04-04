export type JwtPayload = {
  sub: string; // userId
  username: string;
  iss: string;
  type: "access" | "refresh";
  jti?: string;
};

export type FacilityRoleDto = {
  facilityId: string;
  /** Nom de l’établissement (pour l’UI ; optionnel pour rétrocompatibilité). */
  facilityName?: string;
  defaultLanguage: string;
  role: string;
  departmentId: string | null;
};

export type AuthUserDto = {
  id: string;
  username: string;
  fullName: string;
  preferredLang: string;
  facilityRoles: FacilityRoleDto[];
  /** Plateforme : création d’établissements (hors RBAC par site). */
  canCreateFacilities: boolean;
};

