-- Phase 4.6: Emergency E/M + supply auto-billing source modules
ALTER TYPE "BillingSourceModule" ADD VALUE 'ENCOUNTER_EM';
ALTER TYPE "BillingSourceModule" ADD VALUE 'SUPPLY';
