// @flow
import * as Actions from '../actions'
import type { RobotAdminAction } from '../types'

type ActionSpec = {|
  name: string,
  creator: (...Array<any>) => mixed,
  args: Array<mixed>,
  expected: RobotAdminAction,
|}

describe('robot admin actions', () => {
  const SPECS: Array<ActionSpec> = [
    {
      name: 'robotAdmin:RESTART',
      creator: Actions.restartRobot,
      args: ['robotName'],
      expected: {
        type: 'robotAdmin:RESTART',
        meta: { robot: true },
        payload: {
          robotName: 'robotName',
          method: 'POST',
          path: '/server/restart',
        },
      },
    },
    {
      name: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS',
      creator: Actions.fetchResetConfigOptions,
      args: ['robotName'],
      expected: {
        type: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS',
        payload: {
          robotName: 'robotName',
          method: 'GET',
          path: '/settings/reset/options',
        },
      },
    },
    {
      name: 'robotAdmin:RESET_CONFIG',
      creator: Actions.resetConfig,
      args: ['robotName', { foo: true, bar: false }],
      expected: {
        type: 'robotAdmin:RESET_CONFIG',
        payload: {
          robotName: 'robotName',
          method: 'POST',
          path: '/settings/reset',
          body: { foo: true, bar: false },
        },
      },
    },
  ]

  SPECS.forEach(spec => {
    const { name, creator, args, expected } = spec
    test(name, () => expect(creator(...args)).toEqual(expected))
  })
})
