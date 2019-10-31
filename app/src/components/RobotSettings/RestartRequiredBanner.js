// @flow
import * as React from 'react'
import { useDispatch } from 'react-redux'
import { AlertItem, OutlineButton } from '@opentrons/components'

import { restartRobot } from '../../robot-admin'
import styles from './styles.css'

import type { Dispatch } from '../../types'

export type RestartRequiredBannerProps = {|
  robotName: string,
|}

// TODO(mc, 2019-10-24): i18n
const TITLE = 'Robot restart required'
const MESSAGE =
  'You must restart your robot for your settings changes to take effect'
const RESTART_NOW = 'Restart Now'

function RestartRequiredBanner(props: RestartRequiredBannerProps) {
  const { robotName } = props
  const [dismissed, setDismissed] = React.useState(false)
  const dispatch = useDispatch<Dispatch>()
  const restart = React.useCallback(() => dispatch(restartRobot(robotName)), [
    dispatch,
    robotName,
  ])

  if (dismissed) return null

  return (
    <AlertItem
      type="warning"
      onCloseClick={() => setDismissed(true)}
      title={TITLE}
    >
      <div className={styles.restart_banner_message}>
        <p>{MESSAGE}</p>
        <OutlineButton onClick={restart}>{RESTART_NOW}</OutlineButton>
      </div>
    </AlertItem>
  )
}

export default RestartRequiredBanner
