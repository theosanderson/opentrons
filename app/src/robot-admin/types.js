// @flow
import type { RobotApiActionPayload } from '../robot-api/types'

export type RobotAdminStatus =
  | 'up'
  | 'down'
  | 'restart-pending'
  | 'restarting'
  | 'restart-failed'

export type ResetConfigOption = {|
  id: string,
  name: string,
  description: string,
|}

export type ResetConfigRequest = $Shape<{|
  [optionId: string]: boolean,
|}>

export type RestartRobotAction = {|
  type: 'robotAdmin:RESTART',
  payload: RobotApiActionPayload,
  meta: {| robot: true |},
|}

export type FetchResetConfigOptionsAction = {|
  type: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS',
  payload: RobotApiActionPayload,
|}

export type ResetConfigAction = {|
  type: 'robotAdmin:RESET_CONFIG',
  payload: RobotApiActionPayload,
|}

export type RobotAdminAction =
  | RestartRobotAction
  | FetchResetConfigOptionsAction
  | ResetConfigAction

export type PerRobotAdminState = $Shape<{|
  status: RobotAdminStatus,
  resetConfigOptions: Array<ResetConfigOption>,
|}>

export type RobotAdminState = $Shape<{|
  [robotName: string]: void | PerRobotAdminState,
|}>
