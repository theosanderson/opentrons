// @flow
import { GET, POST } from '../robot-api/utils'
import * as Constants from './constants'

import type {
  RestartRobotAction,
  FetchResetConfigOptionsAction,
  ResetConfigAction,
  ResetConfigRequest,
} from './types'

export const restartRobot = (robotName: string): RestartRobotAction => ({
  type: Constants.RESTART,
  payload: { robotName, path: Constants.RESTART_PATH, method: POST },
  meta: { robot: true },
})

export const fetchResetConfigOptions = (
  robotName: string
): FetchResetConfigOptionsAction => ({
  type: Constants.FETCH_RESET_CONFIG_OPTIONS,
  payload: {
    robotName,
    method: GET,
    path: Constants.RESET_CONFIG_OPTIONS_PATH,
  },
})

export const resetConfig = (
  robotName: string,
  body: ResetConfigRequest
): ResetConfigAction => ({
  type: Constants.RESET_CONFIG,
  payload: { robotName, body, method: POST, path: Constants.RESET_CONFIG_PATH },
})
