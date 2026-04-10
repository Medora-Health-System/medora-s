export type ImagingCatalogSeed = {
    code: string;
    displayNameFr: string;
    modality: string;
    bodyRegion: string;
    aliases: string[];
    searchText: string;
    isActive: boolean;
};
export declare const HAITI_IMAGING_CATALOG: ImagingCatalogSeed[];
export declare const HAITI_IMAGING_STUDIES: ImagingCatalogSeed[];
export type HaitiImagingStudySeed = ImagingCatalogSeed;
