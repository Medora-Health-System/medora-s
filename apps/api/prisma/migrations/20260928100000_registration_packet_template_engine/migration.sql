-- Enterprise registration packet template engine
-- Templates / versions / sections / fields / rules / themes / answers
-- Links optional templateVersionId on EnterpriseDocumentPacketSource

CREATE TYPE "RegistrationPacketTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "RegistrationPacketFieldType" AS ENUM (
  'STATIC_TEXT',
  'CHECKBOX',
  'RADIO',
  'TEXT',
  'TEXTAREA',
  'SIGNATURE',
  'DATE',
  'ADDRESS',
  'PHONE',
  'INSURANCE',
  'RELATIONSHIP',
  'EMERGENCY_CONTACT',
  'WITNESS',
  'LANGUAGE',
  'DEMOGRAPHICS_BLOCK',
  'ACKNOWLEDGEMENT'
);

CREATE TABLE "RegistrationPacketTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "facilityTypeScope" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationPacketTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationPacketTemplate_code_key" ON "RegistrationPacketTemplate"("code");

CREATE TABLE "RegistrationPacketTemplateVersion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" "RegistrationPacketTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "localeDefault" TEXT NOT NULL DEFAULT 'en',
  "supportedLocales" JSONB NOT NULL DEFAULT '["en","fr"]',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationPacketTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationPacketTemplateVersion_templateId_version_key"
  ON "RegistrationPacketTemplateVersion"("templateId", "version");
CREATE INDEX "RegistrationPacketTemplateVersion_status_idx"
  ON "RegistrationPacketTemplateVersion"("status");

CREATE TABLE "RegistrationPacketSection" (
  "id" TEXT NOT NULL,
  "templateVersionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "sortOrder" INT NOT NULL,
  "titleJson" JSONB NOT NULL,
  "helpTextJson" JSONB,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationPacketSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationPacketSection_templateVersionId_key_key"
  ON "RegistrationPacketSection"("templateVersionId", "key");
CREATE INDEX "RegistrationPacketSection_templateVersionId_sortOrder_idx"
  ON "RegistrationPacketSection"("templateVersionId", "sortOrder");

CREATE TABLE "RegistrationPacketField" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "fieldType" "RegistrationPacketFieldType" NOT NULL,
  "sortOrder" INT NOT NULL,
  "labelJson" JSONB,
  "helpTextJson" JSONB,
  "contentJson" JSONB,
  "optionsJson" JSONB,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationPacketField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationPacketField_sectionId_key_key"
  ON "RegistrationPacketField"("sectionId", "key");
CREATE INDEX "RegistrationPacketField_sectionId_sortOrder_idx"
  ON "RegistrationPacketField"("sectionId", "sortOrder");

CREATE TABLE "RegistrationPacketConditionalRule" (
  "id" TEXT NOT NULL,
  "templateVersionId" TEXT NOT NULL,
  "sectionId" TEXT,
  "fieldId" TEXT,
  "name" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "conditionKey" TEXT NOT NULL,
  "conditionEquals" BOOLEAN NOT NULL DEFAULT true,
  "expressionJson" JSONB,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationPacketConditionalRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationPacketConditionalRule_templateVersionId_idx"
  ON "RegistrationPacketConditionalRule"("templateVersionId");
CREATE INDEX "RegistrationPacketConditionalRule_conditionKey_idx"
  ON "RegistrationPacketConditionalRule"("conditionKey");

CREATE TABLE "RegistrationPacketTheme" (
  "id" TEXT NOT NULL,
  "templateId" TEXT,
  "templateVersionId" TEXT,
  "facilityId" TEXT,
  "name" TEXT NOT NULL DEFAULT 'default',
  "logoUrl" TEXT,
  "facilityNameOverride" TEXT,
  "addressLine" TEXT,
  "phone" TEXT,
  "footerJson" JSONB,
  "legalNoticesJson" JSONB,
  "brandingJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationPacketTheme_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationPacketTheme_templateId_idx" ON "RegistrationPacketTheme"("templateId");
CREATE INDEX "RegistrationPacketTheme_templateVersionId_idx" ON "RegistrationPacketTheme"("templateVersionId");
CREATE INDEX "RegistrationPacketTheme_facilityId_idx" ON "RegistrationPacketTheme"("facilityId");

CREATE TABLE "RegistrationPacketAnswer" (
  "id" TEXT NOT NULL,
  "packetSourceId" TEXT NOT NULL,
  "fieldId" TEXT,
  "fieldKey" TEXT NOT NULL,
  "sectionKey" TEXT,
  "valueJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationPacketAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationPacketAnswer_packetSourceId_fieldKey_key"
  ON "RegistrationPacketAnswer"("packetSourceId", "fieldKey");
CREATE INDEX "RegistrationPacketAnswer_packetSourceId_idx" ON "RegistrationPacketAnswer"("packetSourceId");
CREATE INDEX "RegistrationPacketAnswer_fieldId_idx" ON "RegistrationPacketAnswer"("fieldId");

ALTER TABLE "EnterpriseDocumentPacketSource"
  ADD COLUMN "templateVersionId" TEXT;

CREATE INDEX "EnterpriseDocumentPacketSource_templateVersionId_idx"
  ON "EnterpriseDocumentPacketSource"("templateVersionId");

ALTER TABLE "RegistrationPacketTemplateVersion"
  ADD CONSTRAINT "RegistrationPacketTemplateVersion_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "RegistrationPacketTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketSection"
  ADD CONSTRAINT "RegistrationPacketSection_templateVersionId_fkey"
  FOREIGN KEY ("templateVersionId") REFERENCES "RegistrationPacketTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketField"
  ADD CONSTRAINT "RegistrationPacketField_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "RegistrationPacketSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketConditionalRule"
  ADD CONSTRAINT "RegistrationPacketConditionalRule_templateVersionId_fkey"
  FOREIGN KEY ("templateVersionId") REFERENCES "RegistrationPacketTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketConditionalRule"
  ADD CONSTRAINT "RegistrationPacketConditionalRule_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "RegistrationPacketSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketConditionalRule"
  ADD CONSTRAINT "RegistrationPacketConditionalRule_fieldId_fkey"
  FOREIGN KEY ("fieldId") REFERENCES "RegistrationPacketField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketTheme"
  ADD CONSTRAINT "RegistrationPacketTheme_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "RegistrationPacketTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketTheme"
  ADD CONSTRAINT "RegistrationPacketTheme_templateVersionId_fkey"
  FOREIGN KEY ("templateVersionId") REFERENCES "RegistrationPacketTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketTheme"
  ADD CONSTRAINT "RegistrationPacketTheme_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketAnswer"
  ADD CONSTRAINT "RegistrationPacketAnswer_packetSourceId_fkey"
  FOREIGN KEY ("packetSourceId") REFERENCES "EnterpriseDocumentPacketSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPacketAnswer"
  ADD CONSTRAINT "RegistrationPacketAnswer_fieldId_fkey"
  FOREIGN KEY ("fieldId") REFERENCES "RegistrationPacketField"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EnterpriseDocumentPacketSource"
  ADD CONSTRAINT "EnterpriseDocumentPacketSource_templateVersionId_fkey"
  FOREIGN KEY ("templateVersionId") REFERENCES "RegistrationPacketTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
