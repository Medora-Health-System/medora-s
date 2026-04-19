-- Optional U.S. CPT/HCPCS-style default for billing documentation only; not enforced in application logic.
ALTER TABLE "CatalogLabTest" ADD COLUMN "billingCodeDefault" TEXT;
