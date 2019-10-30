// @flow
import { pipe, EMPTY } from 'rxjs'
import { filter, mapTo } from 'rxjs/operators'
import { TestScheduler } from 'rxjs/testing'

import * as ApiUtils from '../../robot-api/utils'
import * as SettingsSelectors from '../../robot-settings/selectors'
import * as DiscoveryActions from '../../discovery/actions'
import * as Actions from '../actions'
import { robotAdminEpic } from '../epic'

import type { Action, ActionLike } from '../../types'
import type {
  RobotApiRequest,
  RobotApiResponseAction,
  RequestMeta,
} from '../../robot-api/types'

jest.mock('../../robot-api/utils')
jest.mock('../../robot-settings/selectors')

const mockMakeApiRequest: JestMockFn<[RobotApiRequest, RequestMeta], mixed> =
  ApiUtils.makeRobotApiRequest

const mockPassRobotApiResponseAction: JestMockFn<
  [Action | ActionLike],
  RobotApiResponseAction | null
> = ApiUtils.passRobotApiResponseAction

const mockMapToRobotRequest: JestMockFn<Array<any>, any> =
  ApiUtils.mapToRobotRequest

const mockGetRestartPath: JestMockFn<Array<any>, string | null> =
  SettingsSelectors.getRobotRestartPath

const mockRobot = { name: 'robot', ip: '127.0.0.1', port: 31950 }
const mockState = { mock: true }

const setupMockMakeApiRequest = cold => {
  mockMakeApiRequest.mockImplementation((req, meta) =>
    cold('-a', { a: { req, meta } })
  )
}

const setupMockMapToRobotRequest = (expectedState$, action) => {
  mockMapToRobotRequest.mockImplementation(state$ => {
    expect(state$).toBe(expectedState$)

    return pipe(
      filter(a => a === action),
      mapTo([
        { ...action.payload, host: mockRobot },
        action.meta || {},
        mockState,
      ])
    )
  })
}

describe('robotAdminEpic', () => {
  let testScheduler

  beforeEach(() => {
    mockMapToRobotRequest.mockImplementation(() => () => EMPTY)

    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('makes request on RESTART', () => {
    const action = Actions.restartRobot(mockRobot.name)

    testScheduler.run(({ hot, cold, expectObservable }) => {
      const action$ = hot('-a', { a: action })
      const state$ = hot('a-', { a: mockState })

      setupMockMakeApiRequest(cold)
      setupMockMapToRobotRequest(state$, action)
      mockGetRestartPath.mockReturnValue(null)

      expectObservable(robotAdminEpic(action$, state$)).toBe('--a', {
        a: { req: { ...action.payload, host: mockRobot }, meta: action.meta },
      })
    })
  })

  test('makes request to the settings restart path on RESTART if applicable', () => {
    const action = Actions.restartRobot(mockRobot.name)

    testScheduler.run(({ hot, cold, expectObservable }) => {
      const action$ = hot('-a', { a: action })
      const state$ = hot('a-', { a: mockState })

      setupMockMakeApiRequest(cold)
      setupMockMapToRobotRequest(state$, action)
      mockGetRestartPath.mockImplementation((state, robotName) => {
        expect(state).toEqual(mockState)
        expect(robotName).toEqual(mockRobot.name)
        return '/restart'
      })

      expectObservable(robotAdminEpic(action$, state$)).toBe('--a', {
        a: {
          req: { ...action.payload, host: mockRobot, path: '/restart' },
          meta: action.meta,
        },
      })
    })
  })

  test('starts discovery on restart request success', () => {
    testScheduler.run(({ hot, expectObservable }) => {
      const serverSuccessAction = {
        type: 'robotApi:RESPONSE__POST__/server/restart',
        meta: {},
        payload: {
          host: mockRobot,
          method: 'POST',
          path: '/server/restart',
          body: {},
          ok: true,
          status: 200,
        },
      }

      mockPassRobotApiResponseAction.mockReturnValue(serverSuccessAction)

      const action$ = hot('-a', { a: serverSuccessAction })
      const state$ = hot('a-', { a: mockState })
      const output$ = robotAdminEpic(action$, state$)

      expectObservable(output$).toBe('-a', {
        a: DiscoveryActions.startDiscovery(60000),
      })
    })
  })

  test('makes request on FETCH_RESET_CONFIG_OPTIONS', () => {
    const action = Actions.fetchResetConfigOptions(mockRobot.name)

    testScheduler.run(({ hot, cold, expectObservable }) => {
      const action$ = hot('-a', { a: action })
      const state$ = hot('a-', { a: mockState })

      setupMockMakeApiRequest(cold)
      setupMockMapToRobotRequest(state$, action)

      expectObservable(robotAdminEpic(action$, state$)).toBe('--a', {
        a: { req: { ...action.payload, host: mockRobot }, meta: {} },
      })
    })
  })

  test('makes request on RESET_CONFIG', () => {
    const action = Actions.resetConfig(mockRobot.name, { foo: true })

    testScheduler.run(({ hot, cold, expectObservable }) => {
      const action$ = hot('-a', { a: action })
      const state$ = hot('a-', { a: mockState })

      setupMockMakeApiRequest(cold)
      setupMockMapToRobotRequest(state$, action)

      expectObservable(robotAdminEpic(action$, state$)).toBe('--a', {
        a: { req: { ...action.payload, host: mockRobot }, meta: {} },
      })
    })
  })

  test('dispatches robotAdmin:RESTART on POST /settings/reset', () => {
    const action = {
      type: 'robotApi:RESPONSE__POST__/settings/reset',
      payload: {
        ok: true,
        status: 200,
        host: mockRobot,
        method: 'POST',
        path: '/settings/reset',
        body: {},
      },
      meta: {},
    }

    mockPassRobotApiResponseAction.mockReturnValue(action)

    testScheduler.run(({ hot, cold, expectObservable }) => {
      setupMockMakeApiRequest(cold)

      const action$ = hot('-a', { a: action })
      const state$ = hot('a-', { a: mockState })
      const output$ = robotAdminEpic(action$, state$)

      expectObservable(output$).toBe('-a', {
        a: Actions.restartRobot(mockRobot.name),
      })
    })
  })
})
