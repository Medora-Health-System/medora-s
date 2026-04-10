export type HaitiMedicationSeed = {
    code?: string;
    genericName: string;
    displayNameFr: string;
    strength: string;
    dosageForm: string;
    route: string;
    therapeuticClass: string;
    commonAliases: string[];
    isEssential: boolean;
    isActive: boolean;
    sortPriority: number;
};
export declare const EXISTING_INVENTORY_CODES: readonly ["ASPIRIN_81", "IBUPROFEN_200", "ACETAMINOPHEN_500", "AMOXICILLIN_500", "LISINOPRIL_10", "METFORMIN_500", "OMEPRAZOLE_20", "CIPROFLOXACIN_500", "AZITHROMYCIN_250", "HYDROCHLOROTHIAZIDE_25", "LOSARTAN_50", "PREDNISONE_5", "ORAL_REHYDRATION", "ALBENDAZOLE_400", "CHLOROQUINE_250"];
export declare const HAITI_DEFAULT_FAVORITE_CODES: string[];
export declare const HAITI_MEDICATION_CATALOG: HaitiMedicationSeed[];
