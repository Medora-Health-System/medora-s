export type JwtPayload = {
  sub: string; // userId
  username: string;
  iss: string;
  type: "access" | "refresh";
  jti?: string;
  /** Identifiant de session persistant (`AuthSession.id`) pour les jetons refresh multi-appareils. */
  sid?: string;
};

export type FacilityRoleDto = {
  facilityId: string;
  /** Nom de l’établissement (pour l’UI ; optionnel pour rétrocompatibilité). */
  facilityName?: string;
  defaultLanguage: string;
  role: string;
  departmentId: string | null;
};

/** Détection mode national MSPP vs accès établissement (lecture seule ; RBAC inchangé). */
export type MsppContextDto = {
  isMsppUser: boolean;
  hasFacilityAccess: boolean;
};

export type AuthUserDto = {
  id: string;
  username: string;
  fullName: string;
  preferredLang: string;
  facilityRoles: FacilityRoleDto[];
  /** Rôles portail MSPP national (`MsppUserRoleAssignment`), distincts des rôles par établissement. */
  msppRoles: string[];
  /** Plateforme : création d’établissements — vrai uniquement pour le compte principal fixe (`atranchant@medora.local`). */
  canCreateFacilities: boolean;
  /** Contexte MSPP national (dérivé de `msppRoles` / `facilityRoles`). */
  msppContext: MsppContextDto;
};

