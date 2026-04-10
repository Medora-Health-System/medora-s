import { PrismaClient } from "@prisma/client";
import type { HaitiMedicationSeed } from "../data/haiti-medications";
export declare function deriveMedicationCode(row: {
    genericName: string;
    strength: string;
    dosageForm: string;
    route: string;
}): string;
export declare function seedHaitiMedicationCatalog(prisma: PrismaClient, catalog: HaitiMedicationSeed[]): Promise<Record<string, string>>;
