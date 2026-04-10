import { PrismaClient } from "@prisma/client";
import type { LabCatalogSeed } from "../data/haiti-lab-tests";
import type { ImagingCatalogSeed } from "../data/haiti-imaging-studies";
export declare function seedHaitiLabImagingCatalog(prisma: PrismaClient, labs: LabCatalogSeed[], imaging: ImagingCatalogSeed[]): Promise<void>;
