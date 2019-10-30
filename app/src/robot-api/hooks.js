// @flow
// hooks for components that depend on API state
import { useRef, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { usePrevious } from '@opentrons/components'

import type { State } from '../types'

import type {
  RobotApiActionPayload,
  RobotApiResponse,
  RobotApiRequestState,
} from './types'

export type Handlers = $Shape<{|
  onFinish: (response: RobotApiResponse) => mixed,
|}>

/**
 * React hook to trigger a Robot API action dispatch and call handlers through
 * the lifecycle of the triggered request
 *
 * @param {() => mixed} trigger (function that dispatches robot API request action)
 * @param {RobotApiRequestState | null} requestState (lifecycle state subtree for given robot and request)
 * @param {Handlers} [handlers={}] (lifecycle handlers)
 * @returns {() => void} (function that will call `trigger`)
 *
 * @example
 * import {useDispatch, useSelector} from 'react-redux'
 * import type {State} from '../../types'
 * import {fetchPipettes, getPipettesRequestState} from '../../robot-api'
 *
 * type Props = { robot: Robot, goToNextScreen: () => mixed }
 *
 * function FetchPipettesButton(props: Props) {
 *   const { robot, goToNextScreen } = props
 *   const dispatch = useDispatch()
 *   const dispatchFetch = useCallback(() => {
 *     dispatch(fetchPipettes(props.robot))
 *   }, [robot])
 *   const requestState = useSelector(
 *    (state: State) => getPipettesRequestState(state, robot.name)
 *   )
 *   const triggerFetch = useTriggerRobotApiAction(
 *     dispatchFetch,
 *     requestState,
 *     { onFinish: props.proceed }
 *   )
 *
 *   return <button onClick={triggerFetch}>Check Pipettes</button>
 * }
 */
export function useTriggerRobotApiAction(
  trigger: () => mixed,
  requestState: RobotApiRequestState | null,
  handlers: Handlers = {}
): () => void {
  const hasFiredRef = useRef(false)
  const prevRequest = usePrevious(requestState)
  const { onFinish } = handlers

  useEffect(() => {
    const hasFired = hasFiredRef.current

    // hasFired ensures we actually triggered a request (as opposed to a
    // request to the same path triggering on a loop)
    if (hasFired) {
      const prevResponse = prevRequest?.response
      const nextResponse = requestState?.response

      // if prevResponse is null and nextResponse exists, fetch has finished
      if (!prevResponse && nextResponse) {
        hasFiredRef.current = false
        if (typeof onFinish === 'function') onFinish(nextResponse)
      }
    }
  }, [prevRequest, requestState, onFinish])

  return () => {
    hasFiredRef.current = true
    trigger()
  }
}

/**
 * React hook to trigger a Robot API action dispatch and call handlers through
 * the lifecycle of the triggered request
 *
 * @param {Handlers} [handlers={}] (lifecycle handlers)
 * @param {(RobotApiResponse) => mixed} [handlers.onFinish] (request finish handler; called on success or error)
 * @returns {(action) => void} (function that will dispatch `action`)
 *
 * @example
 * import * as React from 'react'
 * import {fetchSettings} from '../../robot-settings'
 * import type {RobotHost} from '../../robot-api'
 *
 * type Props = {| robot: RobotHost, goToNextScreen: () => mixed |}
 *
 * function FetchPipettesButton(props: Props) {
 *   const { robot, goToNextScreen } = props
 *   const dispatchFetch = useDispatchApiAction({onFinish: goToNextScreen})
 *   const handleClick = dispatchFetch(() => fetchSettings(robot))
 *
 *   return <button onClick={handleClick}>Check Pipettes</button>
 * }
 */
export function useDispatchApiAction<A: { payload: RobotApiActionPayload }>(
  handlers: Handlers = {}
): (action: A) => void {
  const savedRequest = useRef<RobotApiActionPayload | null>(null)
  const savedHandlers = useRef()
  const dispatch = useDispatch<(A) => mixed>()
  const requestState = useSelector((state: State) => {
    if (!savedRequest.current) return null
    const { robotName, path } = savedRequest.current
    return state.robotApi[robotName]?.networking[path] || null
  })
  const prevRequest = usePrevious(requestState)

  useEffect(() => {
    savedHandlers.current = handlers
  }, [handlers])

  useEffect(() => {
    const onFinish = savedHandlers.current?.onFinish

    if (savedRequest.current) {
      const prevResponse = prevRequest?.response
      const nextResponse = requestState?.response

      // if prevResponse is null and nextResponse exists, fetch has finished
      if (!prevResponse && nextResponse) {
        savedRequest.current = null
        if (typeof onFinish === 'function') onFinish(nextResponse)
      }
    }
  }, [prevRequest, requestState])

  return useCallback(
    (action: A) => {
      if (!savedRequest.current) {
        savedRequest.current = action.payload
        dispatch(action)
      }
    },
    [dispatch]
  )
}
