import { useRef } from 'react'
import { flushSync } from 'react-dom'

// 'right' = the incoming pane slides in from the right (finger moves left).
export type CarouselSide = 'left' | 'right'

// Pixels of movement before the gesture is locked to one axis, so vertical
// page scrolling never drags the carousel sideways.
const AXIS_LOCK_THRESHOLD = 10
// Fraction of the pane width the drag must cover to commit on release.
const COMMIT_DISTANCE_RATIO = 0.35
// A fast flick (px/ms) commits even when the drag distance is short.
const FLICK_VELOCITY = 0.4
const FLICK_MIN_DISTANCE = 30
const SETTLE_DURATION_MS = 250

interface CarouselDragCallbacks {
  // A horizontal drag started revealing the pane on the given side; the
  // parent must render that pane (offset by ±100%) inside the track.
  onDragSide: (side: CarouselSide) => void
  // The slide finished. committed=false means it snapped back to rest.
  onSettle: (committed: boolean) => void
}

// Finger-tracking swipe for a two-pane carousel. The parent owns what the
// panes contain; this hook owns the touch gesture and the track transform.
// Transforms are written straight to the DOM inside requestAnimationFrame
// so a 60Hz touchmove stream never re-renders the parent.
export function useCarouselDrag(
  trackRef: React.RefObject<HTMLDivElement | null>,
  callbacks: CarouselDragCallbacks
) {
  // Latest-ref so the stable touch handlers always see current parent state.
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const gesture = useRef({
    active: false,
    axis: 'undecided' as 'undecided' | 'horizontal' | 'vertical',
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    deltaX: 0,
    side: null as CarouselSide | null
  })
  const animating = useRef(false)
  const frame = useRef<number | null>(null)

  const setTransform = (value: string, transition = '') => {
    const track = trackRef.current
    if (!track) return
    track.style.transition = transition
    track.style.transform = value
  }

  const settle = (committed: boolean, side: CarouselSide) => {
    const track = trackRef.current
    if (!track) {
      // No track to animate — still notify so the parent can clear state.
      animating.current = false
      callbacksRef.current.onSettle(false)
      return
    }
    animating.current = true
    const width = track.clientWidth
    const target = committed ? (side === 'right' ? -width : width) : 0
    setTransform(
      `translateX(${target}px)`,
      `transform ${SETTLE_DURATION_MS}ms ease-out`
    )
    window.setTimeout(() => {
      // flushSync forces the parent's phase update into the DOM before the
      // transform reset below, so both land in one paint. Without it React
      // renders in a later task and the browser paints the old pane back at
      // rest for one frame — visible as a text flicker after the swipe.
      flushSync(() => callbacksRef.current.onSettle(committed))
      setTransform('')
      animating.current = false
    }, SETTLE_DURATION_MS + 20)
  }

  // Programmatic slide (chevrons / phase pills). The parent must render the
  // incoming pane before calling; double rAF waits for it to be in the DOM.
  const slide = (side: CarouselSide) => {
    if (animating.current) return
    animating.current = true
    requestAnimationFrame(() => requestAnimationFrame(() => settle(true, side)))
  }

  // fromCancel: the browser aborted the touch (e.g. Android hijacking the
  // gesture for long-press text selection). Velocity is unreliable there,
  // so decide by distance alone rather than throwing the swipe away.
  const endDrag = (fromCancel: boolean) => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    const state = gesture.current
    if (!state.active) return
    state.active = false
    if (state.axis !== 'horizontal' || !state.side) return

    const width = trackRef.current?.clientWidth ?? 0
    const distance = Math.abs(state.deltaX)
    const flick =
      !fromCancel &&
      distance > FLICK_MIN_DISTANCE &&
      Math.abs(state.velocity) > FLICK_VELOCITY &&
      Math.sign(state.velocity) === Math.sign(state.deltaX)
    // A fast flick back toward the start cancels even past the distance
    // threshold — matches the user's visible intent to abort.
    const opposingFlick =
      !fromCancel &&
      Math.abs(state.velocity) > FLICK_VELOCITY &&
      Math.sign(state.velocity) !== Math.sign(state.deltaX)
    const committed =
      width > 0 &&
      !opposingFlick &&
      (distance > width * COMMIT_DISTANCE_RATIO || flick)
    settle(committed, state.side)
  }

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      if (animating.current) return
      const touch = e.touches[0]
      gesture.current = {
        active: true,
        axis: 'undecided',
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastTime: e.timeStamp,
        velocity: 0,
        deltaX: 0,
        side: null
      }
    },
    onTouchMove: (e: React.TouchEvent) => {
      const state = gesture.current
      if (!state.active || state.axis === 'vertical') return
      const touch = e.touches[0]
      const deltaX = touch.clientX - state.startX
      const deltaY = touch.clientY - state.startY

      if (state.axis === 'undecided') {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD) return
        state.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
        if (state.axis === 'vertical') return
      }

      const width = trackRef.current?.clientWidth ?? 0
      state.deltaX = Math.max(-width, Math.min(width, deltaX))

      const elapsed = e.timeStamp - state.lastTime
      if (elapsed > 0) {
        state.velocity = (touch.clientX - state.lastX) / elapsed
        state.lastX = touch.clientX
        state.lastTime = e.timeStamp
      }

      const side: CarouselSide = state.deltaX < 0 ? 'right' : 'left'
      if (state.deltaX !== 0 && side !== state.side) {
        state.side = side
        callbacksRef.current.onDragSide(side)
      }

      if (frame.current === null) {
        frame.current = requestAnimationFrame(() => {
          frame.current = null
          setTransform(`translateX(${gesture.current.deltaX}px)`)
        })
      }
    },
    onTouchEnd: () => endDrag(false),
    onTouchCancel: () => endDrag(true)
  }

  return { handlers, slide }
}
