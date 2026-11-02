import { describe, expect, it } from 'vitest'
import { fitView, zoomAt, MAX_SCALE } from './mermaidZoom'

describe('fitView', () => {
  it('upscales a small diagram to ~90% of the viewport and centres it', () => {
    const view = fitView({ width: 100, height: 50 }, { width: 1000, height: 800 })
    expect(view.scale).toBeCloseTo(9)
    expect(view.x).toBeCloseTo(50)
    expect(view.y).toBeCloseTo(175)
  })

  it('is limited by the tighter axis', () => {
    const view = fitView({ width: 100, height: 400 }, { width: 1000, height: 800 })
    expect(view.scale).toBeCloseTo(1.8)
  })

  it('caps the scale', () => {
    expect(fitView({ width: 1, height: 1 }, { width: 1000, height: 1000 }).scale).toBe(MAX_SCALE)
  })
})

describe('zoomAt', () => {
  it('keeps the anchor point fixed', () => {
    const before = { scale: 1, x: 10, y: 20 }
    const after = zoomAt(before, 2, 110, 120)
    expect(after.scale).toBe(2)
    // content point under the cursor: (110-10)/1 = 100 → must still be at 110 after zoom
    expect(after.x + 100 * after.scale).toBeCloseTo(110)
    expect(after.y + 100 * after.scale).toBeCloseTo(120)
  })
})
