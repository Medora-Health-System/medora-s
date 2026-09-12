export type PatientPortalJwtPayload = {
  sub: string;
  sid: string;
  type: "patient_access";
  principal: "patient";
  iss?: string;
  jti?: string;
};

export type PatientPortalRefreshJwtPayload = {
  sub: string;
  sid: string;
  type: "patient_refresh";
  principal: "patient";
  iss?: string;
  jti?: string;
};

export type PatientPortalPrincipal = {
  portalAccountId: string;
  sessionId: string;
};

export type PatientPortalAccessContext = {
  portalAccountId: string;
  sessionId: string;
  patientId: string;
  facilityId: string;
};
