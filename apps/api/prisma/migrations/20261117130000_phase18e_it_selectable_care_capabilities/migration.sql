-- Phase 18E — owner-selectable Technology / IT care-workspace authority.
-- Catalog rows alone grant no access. Authority requires an explicit active PlatformCapabilityGrant.
INSERT INTO "PlatformCapability" ("id","code","name","description","riskLevel","updatedAt") VALUES
('p18e-it-patient-records','IT_CARE_PATIENT_RECORDS','IT: Patient records','Patient registration and patient-record workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-orders','IT_CARE_ORDERS','IT: Orders','Order workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-emergency','IT_CARE_EMERGENCY','IT: Emergency care','Emergency-care workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-urgent-care','IT_CARE_URGENT_CARE','IT: Urgent care','Urgent-care workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-clinic','IT_CARE_CLINIC','IT: Clinic care','Clinic workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-observation','IT_CARE_OBSERVATION','IT: Observation','Observation workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-inpatient','IT_CARE_INPATIENT_HOSPITAL','IT: Inpatient hospital','Inpatient/hospital workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-lab','IT_CARE_LABORATORY','IT: Laboratory','Laboratory workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-radiology','IT_CARE_RADIOLOGY','IT: Radiology','Radiology/imaging workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-pharmacy','IT_CARE_PHARMACY','IT: Pharmacy','Pharmacy/medication workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-digital-care','IT_CARE_DIGITAL_CARE','IT: Digital Care','Digital Care workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-patient-portal','IT_CARE_PATIENT_PORTAL','IT: Patient portal','Patient-portal staff workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-scheduling','IT_CARE_SCHEDULING','IT: Scheduling','Scheduling workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-telemedicine','IT_CARE_TELEMEDICINE','IT: Telemedicine','Telemedicine workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-ai','IT_CARE_AI','IT: AI','AI workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP),
('p18e-it-billing','IT_CARE_BILLING','IT: Facility billing','Facility billing workflows for explicitly selected Technology / IT staff.','CRITICAL',CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "name"=EXCLUDED."name", "description"=EXCLUDED."description", "riskLevel"=EXCLUDED."riskLevel", "isActive"=TRUE, "updatedAt"=CURRENT_TIMESTAMP;
