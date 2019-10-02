// @flow
// setup pipettes component
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { selectors as robotSelectors } from '../../robot'
import { fetchPipettes, getPipettesState } from '../../robot-api'
import { getPipetteModelSpecs } from '@opentrons/shared-data'
import InstrumentItem from './InstrumentItem'
import { SectionContentHalf } from '../layout'
import InfoSection from './InfoSection'
import InstrumentWarning from './InstrumentWarning'
import PipetteCompatWarningModal from './PipetteCompatWarningModal'

import type { Pipette } from '../../robot'
import type { PipettesState } from '../../robot-api'
import type { Robot } from '../../discovery'

type PipetteCompat =
  | 'match'
  | 'silentMismatch'
  | 'loudMismatch'
  | 'incompatible'

const TITLE = 'Required Pipettes'

const LOUD_MISMATCH_MAP = {
  p10_single: 'p20_single_gen2',
  p300_single: 'p300_single_gen2',
  p1000_single: 'p1000_single_gen2',
}
const INCOMPAT_MAP = {
  p300_single_gen2: 'p300_single',
  p1000_single_gen2: 'p1000_single',
}

type Props = {| robot: Robot |}

function ProtocolPipettes(props: Props) {
  const pipettes: Array<Pipette> = useSelector(robotSelectors.getPipettes)
  const actualPipettes: PipettesState = useSelector(state =>
    getPipettesState(state, props.robot.name)
  )
  // TODO(mc, 2018-10-10): pass this as prop down from page
  const changePipetteUrl = `/robots/${props.robot.name}/instruments`
  const dispatch = useDispatch()
  React.useEffect(() => {
    dispatch(fetchPipettes(props.robot))
  }, [])

  const pipetteInfo = pipettes.map(p => {
    const pipetteConfig = p.modelSpecs
    const actualPipetteConfig = getPipetteModelSpecs(
      actualPipettes[p.mount]?.model || ''
    )
    const displayName = pipetteConfig?.displayName || 'N/A'

    let compatibility: PipetteCompat = 'match'

    if (pipetteConfig && pipetteConfig.name !== actualPipetteConfig?.name) {
      compatibility = 'silentMismatch'
      if (INCOMPAT_MAP[pipetteConfig.name] === actualPipetteConfig?.name) {
        compatibility = 'incompatible'
      } else if (
        LOUD_MISMATCH_MAP[pipetteConfig.name] === actualPipetteConfig?.name
      ) {
        compatibility = 'loudMismatch'
      }
    }

    return {
      ...p,
      displayName,
      compatibility,
    }
  })

  const pipettesMatch = pipetteInfo.every(p => p.compatibility === 'match')

  const [isWarningModalOpen, setIsWarningModalOpen] = React.useState(
    !pipettesMatch
  )

  if (pipettes.length === 0) return null

  const incompatiblePipettes = pipetteInfo.filter(
    p => p.compatibility === 'incompatible'
  )
  const loudMismatchPipettes = pipetteInfo.filter(
    p => p.compatibility === 'loudMismatch'
  )

  return (
    <InfoSection title={TITLE}>
      <SectionContentHalf>
        {pipetteInfo.map(p => (
          <InstrumentItem
            key={p.mount}
            match={p.compatibility === 'match'}
            mount={p.mount}
          >
            {p.displayName}
          </InstrumentItem>
        ))}
      </SectionContentHalf>
      {!pipettesMatch && (
        <InstrumentWarning instrumentType="pipette" url={changePipetteUrl} />
      )}
      {isWarningModalOpen && (
        <PipetteCompatWarningModal
          incompatiblePipettes={incompatiblePipettes}
          loudMismatchPipettes={loudMismatchPipettes}
          close={() => setIsWarningModalOpen(false)}
        />
      )}
    </InfoSection>
  )
}

export default ProtocolPipettes
