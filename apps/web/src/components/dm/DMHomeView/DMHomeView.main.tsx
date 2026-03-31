'use client'

import { useDMHomeViewModel } from './DMHomeView.logic'
import { DMHomeViewVisual } from './DMHomeView.visual'

export function DMHomeView() {
  const model = useDMHomeViewModel()

  return <DMHomeViewVisual model={model} />
}
