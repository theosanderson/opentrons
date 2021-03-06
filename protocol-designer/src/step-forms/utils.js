// @flow
import assert from 'assert'
import reduce from 'lodash/reduce'
import values from 'lodash/values'
import { getPipetteNameSpecs, type DeckSlotId } from '@opentrons/shared-data'
import { SPAN7_8_10_11_SLOT, TC_SPAN_SLOTS } from '../constants'
import type { LabwareDefByDefURI } from '../labware-defs'
import type {
  NormalizedPipette,
  NormalizedPipetteById,
  PipetteEntity,
  PipetteEntities,
  InitialDeckSetup,
  ModuleOnDeck,
  LabwareOnDeck as LabwareOnDeckType,
} from './types'
import type { DeckSlot } from '../types'

export function getIdsInRange<T: string | number>(
  orderedIds: Array<T>,
  startId: T,
  endId: T
): Array<T> {
  const startIdx = orderedIds.findIndex(id => id === startId)
  const endIdx = orderedIds.findIndex(id => id === endId)
  assert(
    startIdx !== -1,
    `start step "${String(startId)}" does not exist in orderedStepIds`
  )
  assert(
    endIdx !== -1,
    `end step "${String(endId)}" does not exist in orderedStepIds`
  )
  assert(
    endIdx >= startIdx,
    `expected end index to be greater than or equal to start index, got "${startIdx}", "${endIdx}"`
  )
  return orderedIds.slice(startIdx, endIdx + 1)
}

// NOTE: deck items include labware and modules
export function getDeckItemIdInSlot(
  itemIdToSlot: { [itemId: string]: DeckSlotId },
  slot: DeckSlotId
): ?string {
  const idsForSourceSlot = Object.entries(itemIdToSlot)
    .filter(([id, labwareSlot]) => labwareSlot === slot)
    .map(([id, labwareSlot]) => id)
  assert(
    idsForSourceSlot.length < 2,
    `multiple deck items in slot ${slot}, expected none or one`
  )
  return idsForSourceSlot[0]
}

export function denormalizePipetteEntities(
  pipetteInvariantProperties: NormalizedPipetteById,
  labwareDefs: LabwareDefByDefURI
): PipetteEntities {
  return reduce(
    pipetteInvariantProperties,
    (acc: PipetteEntities, pipette: NormalizedPipette): PipetteEntities => {
      const pipetteId = pipette.id
      const spec = getPipetteNameSpecs(pipette.name)
      if (!spec) {
        throw new Error(
          `no pipette spec for pipette id "${pipetteId}", name "${pipette.name}"`
        )
      }

      const pipetteEntity: PipetteEntity = {
        ...pipette,
        spec,
        tiprackLabwareDef: labwareDefs[pipette.tiprackDefURI],
      }
      return { ...acc, [pipetteId]: pipetteEntity }
    },
    {}
  )
}

export const getSlotsBlockedBySpanning = (
  initialDeckSetup: InitialDeckSetup
): Array<DeckSlot> => {
  // NOTE: Ian 2019-10-25 dumb heuristic since there's only one case this can happen now
  if (
    values(initialDeckSetup.modules).some(
      (module: ModuleOnDeck) =>
        module.type === 'thermocycler' && module.slot === SPAN7_8_10_11_SLOT
    )
  ) {
    return ['7', '8', '10', '11']
  }
  return []
}

export const getSlotIsEmpty = (
  initialDeckSetup: InitialDeckSetup,
  slot: string
): boolean => {
  if (slot === SPAN7_8_10_11_SLOT) {
    return TC_SPAN_SLOTS.every(slot => getSlotIsEmpty(initialDeckSetup, slot))
  }

  // NOTE: should work for both deck slots and module slots
  return (
    [
      ...values(initialDeckSetup.modules).filter(
        (module: ModuleOnDeck) => module.slot === slot
      ),
      ...values(initialDeckSetup.labware).filter(
        (labware: LabwareOnDeckType) => labware.slot === slot
      ),
    ].length === 0
  )
}
