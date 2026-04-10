export type LabCatalogSeed = {
    code: string;
    displayNameFr: string;
    category: string;
    aliases: string[];
    searchText: string;
    isActive: boolean;
};
export declare const HAITI_LAB_CATALOG: LabCatalogSeed[];
export declare const HAITI_LAB_TESTS: LabCatalogSeed[];
export type HaitiLabTestSeed = LabCatalogSeed;
