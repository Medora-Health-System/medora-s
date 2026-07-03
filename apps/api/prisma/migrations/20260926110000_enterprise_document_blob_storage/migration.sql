-- Add durable document blob storage (DB-backed fallback for ephemeral FS)

CREATE TABLE "EnterpriseDocumentBlob" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseDocumentBlob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseDocumentBlob_documentId_key" ON "EnterpriseDocumentBlob"("documentId");

ALTER TABLE "EnterpriseDocumentBlob" ADD CONSTRAINT "EnterpriseDocumentBlob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EnterpriseDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
