export type FloatingPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface FloatingAnchorRect {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

interface FloatingPositionOptions {
  anchorRect: FloatingAnchorRect
  cardWidth: number
  cardHeight: number
  preferredPlacement?: FloatingPlacement
  gap?: number
  padding?: number
}

const PLACEMENTS: FloatingPlacement[] = ['right', 'left', 'bottom', 'top']

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getFloatingCardPosition({
  anchorRect,
  cardWidth,
  cardHeight,
  preferredPlacement = 'right',
  gap = 14,
  padding = 16,
}: FloatingPositionOptions) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const spaces: Record<FloatingPlacement, number> = {
    top: anchorRect.top - padding,
    bottom: viewportHeight - anchorRect.bottom - padding,
    left: anchorRect.left - padding,
    right: viewportWidth - anchorRect.right - padding,
  }

  const oppositePlacement: Record<FloatingPlacement, FloatingPlacement> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  }

  const placementOrder = Array.from(
    new Set([preferredPlacement, oppositePlacement[preferredPlacement], ...PLACEMENTS])
  )

  const placement =
    placementOrder.find((candidate) => {
      const required = candidate === 'left' || candidate === 'right' ? cardWidth + gap : cardHeight + gap
      return spaces[candidate] >= required
    }) ?? preferredPlacement

  let left = 0
  let top = 0

  if (placement === 'right') {
    left = anchorRect.right + gap
    top = anchorRect.top + anchorRect.height / 2 - cardHeight / 2
  } else if (placement === 'left') {
    left = anchorRect.left - cardWidth - gap
    top = anchorRect.top + anchorRect.height / 2 - cardHeight / 2
  } else if (placement === 'bottom') {
    left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2
    top = anchorRect.bottom + gap
  } else {
    left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2
    top = anchorRect.top - cardHeight - gap
  }

  return {
    placement,
    left: clamp(left, padding, viewportWidth - cardWidth - padding),
    top: clamp(top, padding, viewportHeight - cardHeight - padding),
  }
}
