/** Valeur par défaut alignée avec l’API (création de consultation). */
export const DEFAULT_ENCOUNTER_ROOM_LABEL = "Salle d'attente";

export const ENCOUNTER_ROOM_OPTIONS: string[] = [
  DEFAULT_ENCOUNTER_ROOM_LABEL,
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
];
