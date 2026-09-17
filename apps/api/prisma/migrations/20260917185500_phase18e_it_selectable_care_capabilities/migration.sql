-- Phase 18E — owner-selectable Technology / IT care-workspace authority.
-- Catalog rows alone grant no access. Authority requires an explicit active
-- PlatformCapabilityGrant created/revoked through the existing governed staff workflow.
INSERT INTO "PlatformCapability" ("id","code","name","description","riskLevel","updatedAt") VALUES
('p18e-it-patient-records','IT_CARE_PATIENT_RECORDS','IT: Patient records','Allow explicitly selected Technology / IT staff to use patient registration and patient-record workflows in an active facility context.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-orders','IT_CARE_ORDERS','IT: Orders','Allow explicitly selected Technology / IT staff to use order workflows in an active facility context.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-emergency','IT_CARE_EMERGENCY','IT: Emergency care','Allow explicitly selected Technology / IT staff to use emergency-care workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-urgent-care','IT_CARE_URGENT_CARE','IT: Urgent care','Allow explicitly selected Technology / IT staff to use urgent-care workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-clinic','IT_CARE_CLINIC','IT: Clinic care','Allow explicitly selected Technology / IT staff to use clinic workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-observation','IT_CARE_OBSERVATION','IT: Observation','Allow explicitly selected Technology / IT staff to use observation workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-inpatient','IT_CARE_INPATIENT_HOSPITAL','IT: Inpatient hospital','Allow explicitly selected Technology / IT staff to use inpatient/hospital workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-lab','IT_CARE_LABORATORY','IT: Laboratory','Allow explicitly selected Technology / IT staff to use laboratory workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-radiology','IT_CARE_RADIOLOGY','IT: Radiology','Allow explicitly selected Technology / IT staff to use radiology/imaging workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-pharmacy','IT_CARE_PHARMACY','IT: Pharmacy','Allow explicitly selected Technology / IT staff to use pharmacy/medication workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-digital-care','IT_CARE_DIGITAL_CARE','IT: Digital Care','Allow explicitly selected Technology / IT staff to use Digital Care workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-patient-portal','IT_CARE_PATIENT_PORTAL','IT: Patient portal','Allow explicitly selected Technology / IT staff to use patient-portal staff workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-scheduling','IT_CARE_SCHEDULING','IT: Scheduling','Allow explicitly selected Technology / IT staff to use scheduling workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-telemedicine','IT_CARE_TELEMEDICINE','IT: Telemedicine','Allow explicitly selected Technology / IT staff to use telemedicine workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-ai','IT_CARE_AI','IT: AI','Allow explicitly selected Technology / IT staff to use AI workflows.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-billing','IT_CARE_BILLING','IT: Facility billing','Allow explicitly selected Technology / IT staff to use facility billing workflows.','CRITICAL',CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "riskLevel" = EXCLUDED."riskLevel",
  "isActive" = TRUE,
  "updatedAt" = CURRENT_TIMESTAMP;
