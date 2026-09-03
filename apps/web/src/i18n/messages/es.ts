import { applyApprovedSpanishTerminology } from "@medora/shared";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import en from "./en";

/**
 * MEDUI.ES.1D Spanish product UI catalog.
 * Hidden placeholders from 1C, with APPROVED canon terms overlaid only.
 * Not user-selectable. Remaining keys stay UNLOCALIZED_ES::<path>.
 */
const { tree: esMessages } = applyApprovedSpanishTerminology(createHiddenSpanishCatalog(en));

export default esMessages;
