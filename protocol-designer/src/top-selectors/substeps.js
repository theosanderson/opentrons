// @flow
import { createSelector } from 'reselect'

import { selectors as stepFormSelectors } from '../step-forms'
import { selectors as fileDataSelectors } from '../file-data'

import { generateSubsteps } from '../steplist/generateSubsteps' // TODO Ian 2018-04-11 move generateSubsteps closer to this substeps.js file?

import type { Selector } from '../types'
import type { StepIdType } from '../form-types'
import type { SubstepItemData } from '../steplist/types'

type AllSubsteps = { [StepIdType]: ?SubstepItemData }
export const allSubsteps: Selector<AllSubsteps> = createSelector(
  stepFormSelectors.getArgsAndErrorsByStepId,
  stepFormSelectors.getInvariantContext,
  stepFormSelectors.getOrderedStepIds,
  fileDataSelectors.getRobotStateTimeline,
  fileDataSelectors.getInitialRobotState,
  (
    allStepArgsAndErrors,
    invariantContext,
    orderedStepIds,
    robotStateTimeline,
    _initialRobotState
  ) => {
    const timeline = [
      { robotState: _initialRobotState },
      ...robotStateTimeline.timeline,
    ]
    return orderedStepIds.reduce((acc: AllSubsteps, stepId, timelineIndex) => {
      const robotState =
        timeline[timelineIndex] && timeline[timelineIndex].robotState

      const substeps = generateSubsteps(
        allStepArgsAndErrors[stepId],
        invariantContext,
        robotState,
        stepId
      )

      return {
        ...acc,
        [stepId]: substeps,
      }
    }, {})
  }
)
