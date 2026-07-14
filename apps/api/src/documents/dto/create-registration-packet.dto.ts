import { z } from "zod";

const facilitySchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
  })
  .nullable()
  .optional();

const patientSchema = z
  .object({
    id: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dob: z.string().nullable().optional(),
    mrn: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    addressLine1: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    stateProvince: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
  })
  .nullable();

const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  reviewed: z.boolean().optional(),
  reviewedAt: z.string().nullable().optional(),
  reviewedBy: z.string().nullable().optional(),
  required: z.boolean().optional(),
});

const signatureSchema = z.object({
  signerType: z.string(),
  signerName: z.string(),
  relationship: z.string().optional(),
  signedAt: z.string().optional(),
  attestation: z.string().optional(),
  signatureVectorHash: z.string().optional(),
  refusalReason: z.string().optional(),
});

export const structuredPacketModelSchema = z.object({
  packetType: z.string().min(1, "packetType is required"),
  packetVersion: z.string().optional().default("1.0"),
  locale: z.string().optional().default("en"),
  facility: facilitySchema,
  patient: patientSchema,
  encounter: z
    .object({
      id: z.string().optional(),
      number: z.string().optional(),
    })
    .nullable()
    .optional(),
  insurance: z
    .array(
      z.object({
        rank: z.string(),
        payerName: z.string().nullable().optional(),
        memberId: z.string().nullable().optional(),
        groupNumber: z.string().nullable().optional(),
      }),
    )
    .optional()
    .default([]),
  sections: z.array(sectionSchema).min(1, "sections are required"),
  signatures: z.array(signatureSchema).optional().default([]),
  attestations: z.array(z.string()).optional().default([]),
  generatedAt: z.string().optional(),
  finalizedAt: z.string().nullable().optional(),
});

export const createRegistrationPacketBodySchema = z.object({
  patientId: z.string().min(1, "patientId is required"),
  encounterId: z.string().optional(),
  title: z.string().optional(),
  structuredModel: structuredPacketModelSchema,
});

export type CreateRegistrationPacketBody = z.infer<typeof createRegistrationPacketBodySchema>;
export type StructuredPacketModelDto = z.infer<typeof structuredPacketModelSchema>;
