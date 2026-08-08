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
  /** Prisma department row code when assigned (MEDUI.AUTH.ROLE.2). */
  departmentCode?: string | null;
  departmentName?: string | null;
  /**
   * Phase 1 — freestanding-ER policy mirror : autorise la saisie d'un résultat de
   * `LAB_TEST` par un infirmier (RN) sur cet établissement. Optionnel pour rétrocompatibilité ;
   * le serveur reste seul juge — l'UI ne fait que masquer les contrôles quand `false` / absent.
   */
  allowRnLabResultSubmission?: boolean;
  /** IANA timezone for clinical time display (M1.8B.7K.10B.1). */
  timezone?: string;
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
  /** Plateforme : dérivé de l’état DB actif (capability + affectation MEDORA_SUPER_ADMIN), jamais de l’e-mail. */
  canCreateFacilities: boolean;
  /** Contexte MSPP national (dérivé de `msppRoles` / `facilityRoles`). */
  msppContext: MsppContextDto;
  /** Phase 9 — TOTP MFA state. */
  mfa: {
    enabled: boolean;
    /** True if any active facility role requires MFA per current policy. */
    required: boolean;
  };
};
