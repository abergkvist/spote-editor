export interface View { scale: number; x: number; y: number }
export interface Size { width: number; height: number }

export const MIN_SCALE = 0.1
export const MAX_SCALE = 12
const FIT_RATIO = 0.9

const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))

/** Natural size of an SVG from its viewBox, falling back to width/height attributes. */
export function naturalSize(svg: SVGSVGElement): Size | null {
  const box = svg.viewBox?.baseVal
  if (box && box.width > 0 && box.height > 0) return { width: box.width, height: box.height }
  const width = parseFloat(svg.getAttribute('width') ?? '')
  const height = parseFloat(svg.getAttribute('height') ?? '')
  return width > 0 && height > 0 ? { width, height } : null
}

/** Scale and offset that centre `content` in `viewport`, filling ~90% of it. Upscales small diagrams. */
export function fitView(content: Size, viewport: Size): View {
  const scale = clamp(Math.min(
    (viewport.width * FIT_RATIO) / content.width,
    (viewport.height * FIT_RATIO) / content.height,
  ))
  return {
    scale,
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
  }
}

/** Zoom by `factor`, keeping the point (px, py) — in viewport coordinates — fixed on screen. */
export function zoomAt(view: View, factor: number, px: number, py: number): View {
  const scale = clamp(view.scale * factor)
  const ratio = scale / view.scale
  return { scale, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }
}
