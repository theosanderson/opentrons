// @flow
import mapValues from 'lodash/mapValues'
import {
  passRobotApiResponseAction,
  passRobotApiErrorAction,
} from '../robot-api/utils'
import { DISCOVERY_UPDATE_LIST } from '../discovery/actions'
import * as Constants from './constants'

import type { Action, ActionLike } from '../types'
import type { RobotAdminState, PerRobotAdminState } from './types'

const INITIAL_STATE: RobotAdminState = {}

export function robotAdminReducer(
  state: RobotAdminState = INITIAL_STATE,
  action: Action | ActionLike
): RobotAdminState {
  const successAction = passRobotApiResponseAction(action)
  const errAction = passRobotApiErrorAction(action)

  if (successAction) {
    const { host, path, body } = successAction.payload
    const { name: robotName } = host
    const robotState = state[robotName]

    // response for GET /settings/reset/options
    if (path === Constants.RESET_CONFIG_OPTIONS_PATH) {
      return {
        ...state,
        [robotName]: { ...robotState, resetConfigOptions: body.options },
      }
    }
  }

  if (errAction) {
    const { host, path } = errAction.payload
    const { name: robotName } = host
    const robotState = state[robotName]

    if (path === Constants.RESTART_PATH) {
      return {
        ...state,
        [robotName]: { ...robotState, status: Constants.RESTART_FAILED_STATUS },
      }
    }
  }

  const strictAction: Action = (action: any)

  switch (strictAction.type) {
    case Constants.RESTART: {
      const { robotName } = strictAction.payload
      const robotState = state[robotName]

      return {
        ...state,
        [robotName]: {
          ...robotState,
          status: Constants.RESTART_PENDING_STATUS,
        },
      }
    }

    case DISCOVERY_UPDATE_LIST: {
      const { robots } = strictAction.payload
      const upByName = robots.reduce<$Shape<{| [string]: boolean | void |}>>(
        (result, service) => ({
          ...result,
          [service.name]: result[service.name] || service.ok,
        }),
        {}
      )

      return mapValues(
        state,
        (robotState: PerRobotAdminState, robotName: string) => {
          let { status } = robotState
          const up = upByName[robotName]

          if (up && status !== Constants.RESTART_PENDING_STATUS) {
            status = Constants.UP_STATUS
          } else if (!up && status === Constants.RESTART_PENDING_STATUS) {
            status = Constants.RESTARTING_STATUS
          } else if (!up && status !== Constants.RESTARTING_STATUS) {
            status = Constants.DOWN_STATUS
          }

          return { ...robotState, status }
        }
      )
    }
  }

  return state
}
