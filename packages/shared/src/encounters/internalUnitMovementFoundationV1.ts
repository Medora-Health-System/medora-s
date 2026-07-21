/**
 * D3E.6B — Internal unit movement foundation (not D3F enterprise transfers).
 * Preserves same Inpatient encounter, HospitalEpisode, and enterprise chart
 * ownership when reassigning clinical unit / room / bed.
 */

export type InternalUnitMovementRequestV1 = {
  encounterId: string;
  hospitalEpisodeId: string | null;
  fromUnitCode: string | null;
  toUnitCode: string;
  toRoomCode?: string | null;
  toBedKey?: string | null;
  reasonCode?: string | null;
};

export type InternalUnitMovementResultV1 = {
  ok: boolean;
  code: string;
  preservesEncounter: boolean;
  preservesHospitalEpisode: boolean;
  preservesOrdersResultsMar: boolean;
  updates: {
    currentUnitCode: string;
    roomCode: string | null;
    bedKey: string | null;
  };
};

/**
 * Validate a same-facility internal unit reassignment.
 * Does not implement full transfer workflow / bed cleaning / D3F.
 */
export function planInternalUnitMovement(
  req: InternalUnitMovementRequestV1
): InternalUnitMovementResultV1 {
  const encounterId = String(req.encounterId ?? "").trim();
  const toUnit = String(req.toUnitCode ?? "").trim().toUpperCase();
  if (!encounterId) {
    return {
      ok: false,
      code: "MISSING_ENCOUNTER",
      preservesEncounter: true,
      preservesHospitalEpisode: true,
      preservesOrdersResultsMar: true,
      updates: { currentUnitCode: "", roomCode: null, bedKey: null },
    };
  }
  if (!toUnit) {
    return {
      ok: false,
      code: "MISSING_DESTINATION_UNIT",
      preservesEncounter: true,
      preservesHospitalEpisode: true,
      preservesOrdersResultsMar: true,
      updates: { currentUnitCode: "", roomCode: null, bedKey: null },
    };
  }
  const from = (req.fromUnitCode ?? "").trim().toUpperCase();
  if (from && from === toUnit && !req.toRoomCode && !req.toBedKey) {
    return {
      ok: false,
      code: "NO_CHANGE",
      preservesEncounter: true,
      preservesHospitalEpisode: true,
      preservesOrdersResultsMar: true,
      updates: {
        currentUnitCode: toUnit,
        roomCode: req.toRoomCode ?? null,
        bedKey: req.toBedKey ?? null,
      },
    };
  }

  return {
    ok: true,
    code: "PLANNED",
    preservesEncounter: true,
    preservesHospitalEpisode: true,
    preservesOrdersResultsMar: true,
    updates: {
      currentUnitCode: toUnit,
      roomCode: req.toRoomCode?.trim() || null,
      bedKey: req.toBedKey?.trim() || null,
    },
  };
}

export function internalUnitMovementIsNotEnterpriseTransfer(): true {
  return true;
}
