-- Fix: replace singleton ClaimControlCounter with per-facility + type sequences (ISA / GS / ST).

DROP TABLE IF EXISTS "ClaimControlCounter";

CREATE TABLE "ClaimControlCounter" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimControlCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClaimControlCounter_facilityId_type_key" ON "ClaimControlCounter"("facilityId", "type");

ALTER TABLE "ClaimControlCounter" ADD CONSTRAINT "ClaimControlCounter_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
