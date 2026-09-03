import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import en from "./en";

/**
 * MEDUI.ES.1C hidden Spanish product UI catalog.
 * Key-parity with EN via explicit UNLOCALIZED_ES::<path> placeholders.
 * Not user-selectable. Clinical Spanish canon is MEDUI.ES.1D.
 */
const esMessages = createHiddenSpanishCatalog(en);

export default esMessages;
