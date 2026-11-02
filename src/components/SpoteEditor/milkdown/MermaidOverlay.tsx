import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { fitView, naturalSize, zoomAt, type Size, type View } from './mermaidZoom'

export interface MermaidOverlayProps {
  svg: string
  onClose: () => void
}

const STEP = 1.25

/**
 * Full-screen view of a rendered diagram with zoom and pan.
 *
 * The SVG is injected as HTML. That is safe here because it comes from
 * `renderMermaid`, which always runs mermaid with `securityLevel: 'strict'` —
 * the same string is already in the editor DOM.
 *
 * Mermaid gives the SVG `width="100%"` and an inline `max-width` equal to its
 * natural size, which would stop it growing. We pin it to its viewBox size and
 * scale the wrapper with a CSS transform instead, so zooming never re-renders.
 */
export function MermaidOverlay({ svg, onClose }: MermaidOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<Size | null>(null)
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view

  const fit = useCallback(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return
    setView(fitView(content, { width: viewport.clientWidth, height: viewport.clientHeight }))
  }, [])

  const zoomBy = useCallback((factor: number, px?: number, py?: number) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const x = px ?? viewport.clientWidth / 2
    const y = py ?? viewport.clientHeight / 2
    setView((current) => zoomAt(current, factor, x, y))
  }, [])

  useEffect(() => { closeRef.current?.focus() }, [])

  useLayoutEffect(() => {
    const element = stageRef.current?.querySelector('svg')
    if (!element) return
    const size = naturalSize(element)
    if (!size) return
    element.removeAttribute('style')
    element.setAttribute('width', String(size.width))
    element.setAttribute('height', String(size.height))
    contentRef.current = size
    fit()
  }, [svg, fit])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === '+' || event.key === '=') zoomBy(STEP)
      else if (event.key === '-' || event.key === '_') zoomBy(1 / STEP)
      else if (event.key === '0') fit()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, zoomBy, fit])

  // Wheel and trackpad pinch (ctrl+wheel). Needs a non-passive listener to preventDefault.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002))
      zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top)
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  // Drag to pan; two pointers pinch-zoom (touch).
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistance = useRef(0)

  const distance = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) pinchDistance.current = distance()
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const next = distance()
      if (pinchDistance.current > 0) {
        const rect = event.currentTarget.getBoundingClientRect()
        const [a, b] = [...pointers.current.values()]
        zoomBy(next / pinchDistance.current, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
      }
      pinchDistance.current = next
    } else if (pointers.current.size === 1) {
      const dx = event.clientX - previous.x
      const dy = event.clientY - previous.y
      setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }))
    }
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    pinchDistance.current = 0
  }

  return createPortal(
    <div
      className="spote-mermaid-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Diagram"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        ref={viewportRef}
        className="spote-mermaid-overlay__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={fit}
      >
        <div
          ref={stageRef}
          className="spote-mermaid-overlay__figure"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className="spote-mermaid-overlay__toolbar" role="toolbar" aria-label="Zoom">
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / STEP)}>−</button>
        <button type="button" aria-label="Fit to window" onClick={fit}>Fit</button>
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(STEP)}>+</button>
      </div>
      <button
        ref={closeRef}
        type="button"
        className="spote-mermaid-overlay__close"
        aria-label="Close diagram"
        onClick={onClose}
      >
        ×
      </button>
    </div>,
    document.body,
  )
}
