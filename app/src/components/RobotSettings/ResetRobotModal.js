// @flow
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { useDispatchApiAction } from '../../robot-api'
import {
  fetchResetConfigOptions,
  getResetConfigOptions,
  resetConfig,
} from '../../robot-admin'

import { AlertModal } from '@opentrons/components'
import { Portal } from '../portal'
import { LabeledCheckbox } from '../controls'

import type { State, Dispatch } from '../../types'
import type { ResetConfigRequest } from '../../robot-admin/types'

type Props = {|
  robotName: string,
  closeModal: () => mixed,
|}

const TITLE = 'Robot Configuration Reset'

export default function ResetRobotModal(props: Props) {
  const { robotName, closeModal } = props
  const dispatch = useDispatch<Dispatch>()
  const dispatchReset = useDispatchApiAction({ onFinish: closeModal })
  const triggerReset = () => dispatchReset(resetConfig(robotName, request))

  const [request, setRequest] = React.useState<ResetConfigRequest>({})
  const options = useSelector((state: State) =>
    getResetConfigOptions(state, robotName)
  )

  React.useEffect(() => {
    dispatch(fetchResetConfigOptions(robotName))
  }, [robotName, dispatch])

  const buttons = [
    { onClick: closeModal, children: 'close' },
    { onClick: triggerReset, children: 'restart' },
  ]

  return (
    <Portal>
      <AlertModal heading={TITLE} buttons={buttons} alertOverlay>
        <p>
          Warning! Clicking <strong>restart</strong> will erase your selected
          configurations and <strong>restart your robot</strong>. This cannot be
          undone
        </p>
        {options.map(o => (
          <LabeledCheckbox
            label={o.name}
            onChange={() => setRequest({ ...request, [o.id]: !request[o.id] })}
            name={o.id}
            value={request[o.id]}
            key={o.id}
          >
            <p>{o.description}</p>
          </LabeledCheckbox>
        ))}
      </AlertModal>
    </Portal>
  )
}
