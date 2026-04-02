'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Placement = 'top' | 'bottom' | 'left' | 'right'

type ActiveTooltip = {
  element: HTMLElement
  text: string
  preferredPlacement: Placement | null
}

type TooltipLayout = {
  top: number
  left: number
  placement: Placement
  visible: boolean
}

const VIEWPORT_PADDING = 12
const TOOLTIP_GAP = 10
const ALL_PLACEMENTS: Placement[] = ['top', 'bottom', 'right', 'left']

function isPlacement(value: string | null): value is Placement {
  return value === 'top' || value === 'bottom' || value === 'left' || value === 'right'
}

function getTooltipTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null

  const element = target.closest<HTMLElement>('[data-tooltip]')
  if (!element) return null

  const text = element.getAttribute('data-tooltip')?.trim()
  if (!text) return null

  return element
}

function getPlacementOrder(preferredPlacement: Placement | null, spaces: Record<Placement, number>) {
  const sortedBySpace = [...ALL_PLACEMENTS].sort((a, b) => spaces[b] - spaces[a])
  if (!preferredPlacement) return sortedBySpace

  const oppositePlacement: Record<Placement, Placement> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  }

  return Array.from(new Set([preferredPlacement, oppositePlacement[preferredPlacement], ...sortedBySpace]))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function TooltipLayer() {
  const [mounted, setMounted] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null)
  const [layout, setLayout] = useState<TooltipLayout | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const activeElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    activeElementRef.current = activeTooltip?.element ?? null
  }, [activeTooltip])

  useEffect(() => {
    const showTooltip = (element: HTMLElement) => {
      const text = element.getAttribute('data-tooltip')?.trim()
      if (!text) {
        setActiveTooltip(null)
        return
      }

      const requestedPlacement = element.getAttribute('data-tooltip-position')
      const preferredPlacement = isPlacement(requestedPlacement) ? requestedPlacement : null

      setLayout(null)
      setActiveTooltip({ element, text, preferredPlacement })
    }

    const hideTooltip = (element?: HTMLElement | null) => {
      if (!element || activeElementRef.current === element) {
        setActiveTooltip(null)
        setLayout(null)
      }
    }

    const handleMouseOver = (event: MouseEvent) => {
      const target = getTooltipTarget(event.target)
      if (!target) return
      if (activeElementRef.current === target) return
      showTooltip(target)
    }

    const handleMouseOut = (event: MouseEvent) => {
      const currentTarget = getTooltipTarget(event.target)
      if (!currentTarget) return

      const nextTarget = getTooltipTarget(event.relatedTarget)
      if (currentTarget === nextTarget) return

      hideTooltip(currentTarget)
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = getTooltipTarget(event.target)
      if (!target) return
      showTooltip(target)
    }

    const handleFocusOut = (event: FocusEvent) => {
      const currentTarget = getTooltipTarget(event.target)
      if (!currentTarget) return

      const nextTarget = getTooltipTarget(event.relatedTarget)
      if (currentTarget === nextTarget) return

      hideTooltip(currentTarget)
    }

    const handlePointerDown = () => {
      setActiveTooltip(null)
      setLayout(null)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTooltip(null)
        setLayout(null)
      }
    }

    document.addEventListener('mouseover', handleMouseOver, true)
    document.addEventListener('mouseout', handleMouseOut, true)
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleEscape, true)

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('mouseout', handleMouseOut, true)
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('focusout', handleFocusOut, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleEscape, true)
    }
  }, [])

  useLayoutEffect(() => {
    if (!activeTooltip || !tooltipRef.current) return
    if (!activeTooltip.element.isConnected) {
      setActiveTooltip(null)
      setLayout(null)
      return
    }

    const updatePosition = () => {
      if (!tooltipRef.current || !activeTooltip.element.isConnected) {
        setActiveTooltip(null)
        setLayout(null)
        return
      }

      const targetRect = activeTooltip.element.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      const spaces: Record<Placement, number> = {
        top: targetRect.top - VIEWPORT_PADDING,
        bottom: viewportHeight - targetRect.bottom - VIEWPORT_PADDING,
        left: targetRect.left - VIEWPORT_PADDING,
        right: viewportWidth - targetRect.right - VIEWPORT_PADDING,
      }

      const placementOrder = getPlacementOrder(activeTooltip.preferredPlacement, spaces)
      const fittingPlacement =
        placementOrder.find((placement) => {
          if (placement === 'top' || placement === 'bottom') {
            return spaces[placement] >= tooltipRect.height + TOOLTIP_GAP
          }

          return spaces[placement] >= tooltipRect.width + TOOLTIP_GAP
        }) ?? placementOrder[0] ?? 'top'

      let top = 0
      let left = 0

      if (fittingPlacement === 'top') {
        top = targetRect.top - tooltipRect.height - TOOLTIP_GAP
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
      } else if (fittingPlacement === 'bottom') {
        top = targetRect.bottom + TOOLTIP_GAP
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
      } else if (fittingPlacement === 'left') {
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
        left = targetRect.left - tooltipRect.width - TOOLTIP_GAP
      } else {
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
        left = targetRect.right + TOOLTIP_GAP
      }

      setLayout({
        top: clamp(top, VIEWPORT_PADDING, viewportHeight - tooltipRect.height - VIEWPORT_PADDING),
        left: clamp(left, VIEWPORT_PADDING, viewportWidth - tooltipRect.width - VIEWPORT_PADDING),
        placement: fittingPlacement,
        visible: true,
      })
    }

    updatePosition()

    const handleViewportChange = () => updatePosition()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updatePosition())
      observer.observe(activeTooltip.element)
      observer.observe(tooltipRef.current)
    }

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
      observer?.disconnect()
    }
  }, [activeTooltip])

  if (!mounted || !activeTooltip) return null

  const verticalOffset = layout?.placement === 'top' ? 2 : layout?.placement === 'bottom' ? -2 : 0
  const horizontalOffset = layout?.placement === 'left' ? 2 : layout?.placement === 'right' ? -2 : 0

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[10000]">
      <div
        ref={tooltipRef}
        role="tooltip"
        aria-hidden={!layout?.visible}
        className="max-w-[260px] rounded-md border border-[var(--b1)] bg-[var(--s7)] px-2.5 py-1.5 text-[13px] font-medium leading-snug text-[var(--t0)]"
        style={{
          position: 'fixed',
          top: layout?.top ?? -9999,
          left: layout?.left ?? -9999,
          opacity: layout?.visible ? 1 : 0,
          transform: `translate3d(${horizontalOffset}px, ${verticalOffset}px, 0) scale(${layout?.visible ? 1 : 0.96})`,
          transformOrigin: layout?.placement ?? 'center',
          transition: 'opacity 120ms ease, transform 120ms ease',
          whiteSpace: 'normal',
        }}
      >
        {activeTooltip.text}
      </div>
    </div>,
    document.body,
  )
}
