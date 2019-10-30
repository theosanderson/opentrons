// @flow
import { of } from 'rxjs'
import { ofType, combineEpics } from 'redux-observable'
import { filter, switchMap } from 'rxjs/operators'

import {
  mapToRobotRequest,
  makeRobotApiRequest,
  passRobotApiResponseAction,
} from '../robot-api/utils'
import { startDiscovery } from '../discovery'
import { getRobotRestartPath } from '../robot-settings'
import { restartRobot } from './actions'
import * as Constants from './constants'

import type { Epic, LooseEpic } from '../types'
import type { RobotApiResponseAction } from '../robot-api/types'

export const RESTART_DISCOVERY_TIMEOUT_MS = 60000

const makeApiCallsEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType(Constants.FETCH_RESET_CONFIG_OPTIONS, Constants.RESET_CONFIG),
    mapToRobotRequest(state$),
    switchMap(([request, meta]) => makeRobotApiRequest(request, meta))
  )
}

const makeRestartApiCallEpic: Epic = (action$, state$) => {
  return action$.pipe(
    ofType(Constants.RESTART),
    mapToRobotRequest(state$),
    switchMap(([request, meta, state]) => {
      const robotName = request.host.name
      const restartPath = getRobotRestartPath(state, robotName)
      const path = restartPath !== null ? restartPath : request.path

      return makeRobotApiRequest({ ...request, path }, meta)
    })
  )
}

const restartAfterResetConfig: LooseEpic = action$ => {
  return action$.pipe(
    filter(action => {
      const success = passRobotApiResponseAction(action)
      return Boolean(
        success && success.payload.path === Constants.RESET_CONFIG_PATH
      )
    }),
    switchMap<RobotApiResponseAction, _, _>(action => {
      return of(restartRobot(action.payload.host.name))
    })
  )
}

const startDiscoveryOnRestartEpic: LooseEpic = action$ => {
  return action$.pipe(
    filter(a => {
      const response = passRobotApiResponseAction(a)
      return Boolean(
        response && response.payload.path === Constants.RESTART_PATH
      )
    }),
    switchMap<RobotApiResponseAction, _, mixed>(() =>
      of(startDiscovery(RESTART_DISCOVERY_TIMEOUT_MS))
    )
  )
}

export const robotAdminEpic: Epic = combineEpics(
  makeApiCallsEpic,
  makeRestartApiCallEpic,
  restartAfterResetConfig,
  startDiscoveryOnRestartEpic
)
