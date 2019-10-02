// @flow
import * as React from 'react'

import { AlertModal } from '@opentrons/components'
import { Portal } from '../portal'

type Props = {
  incompatiblePipettes: Array<Pipette>,
  loudMismatchPipettes: Array<Pipette>,
  close: () => mixed,
}

export default function ExitAlertModal(props: Props) {
  const problemType =
    props.incompatiblePipettes.length > 0 ? 'incompatibility' : 'mismatch'
  const heading = `Pipette ${problemType} detected`
  return (
    <Portal>
      <AlertModal
        heading={heading}
        buttons={[{ children: 'OK', onClick: close }]}
        alertOverlay
      >
        <p>Doing so will exit pipette setup and home your robot.</p>
      </AlertModal>
    </Portal>
  )
}
