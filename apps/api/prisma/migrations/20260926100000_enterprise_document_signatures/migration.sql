-- Add signature infrastructure to enterprise documents

ALTER TABLE "EnterpriseDocument" ADD COLUMN "signatureStatus" TEXT;
ALTER TABLE "EnterpriseDocument" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "EnterpriseDocument" ADD COLUMN "lockedById" TEXT;

CREATE TABLE "EnterpriseDocumentSignature" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signerType" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerRole" TEXT,
    "relationship" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureData" JSONB NOT NULL,
    "attestation" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseDocumentSignature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnterpriseDocumentSignature_documentId_idx" ON "EnterpriseDocumentSignature"("documentId");
CREATE INDEX "EnterpriseDocumentSignature_signerType_idx" ON "EnterpriseDocumentSignature"("signerType");
CREATE INDEX "EnterpriseDocumentSignature_signedAt_idx" ON "EnterpriseDocumentSignature"("signedAt");
CREATE INDEX "EnterpriseDocument_signatureStatus_idx" ON "EnterpriseDocument"("signatureStatus");

ALTER TABLE "EnterpriseDocumentSignature" ADD CONSTRAINT "EnterpriseDocumentSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EnterpriseDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseDocumentSignature" ADD CONSTRAINT "EnterpriseDocumentSignature_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnterpriseDocument" ADD CONSTRAINT "EnterpriseDocument_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
