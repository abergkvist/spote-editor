import { describe, it, expect, vi, afterEach } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { linkClick } from './linkClick'

const DOC = 'see [docs](https://a.b/c) now'

function setup(onOpenLink: (h: string, e: MouseEvent) => void, editable = true) {
  const parent = document.body.appendChild(document.createElement('div'))
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc: DOC, extensions: [linkClick(() => onOpenLink), EditorView.editable.of(editable)] }),
  })
  // jsdom has no layout, so map any pointer to a fixed document offset.
  let at: number | null = 8
  view.posAtCoords = (() => at) as typeof view.posAtCoords
  return { view, moveTo: (pos: number | null) => { at = pos }, cleanup: () => { view.destroy(); parent.remove() } }
}

const mousedown = (view: EditorView, init: MouseEventInit = {}) => {
  const e = new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true, ...init })
  view.contentDOM.dispatchEvent(e)
  return e
}

describe('raw-mode link opening', () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })

  it('opens a markdown link on Cmd+click', () => {
    const onOpen = vi.fn()
    const { view } = setup(onOpen)
    const e = mousedown(view, { metaKey: true })
    expect(onOpen).toHaveBeenCalledWith('https://a.b/c', expect.any(MouseEvent))
    expect(e.defaultPrevented).toBe(true)
  })

  it('ignores a plain click while editable', () => {
    const onOpen = vi.fn()
    const { view } = setup(onOpen)
    mousedown(view)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('opens on a plain click when read-only', () => {
    const onOpen = vi.fn()
    const { view } = setup(onOpen, false)
    mousedown(view)
    expect(onOpen).toHaveBeenCalledWith('https://a.b/c', expect.any(MouseEvent))
  })

  it('does nothing when the click is not on a link', () => {
    const onOpen = vi.fn()
    const { view, moveTo } = setup(onOpen)
    moveTo(1)
    mousedown(view, { metaKey: true })
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('underlines the link under the pointer only while the gesture would open it', () => {
    const { view } = setup(() => {})
    const move = (init: MouseEventInit) => view.contentDOM.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, ...init }))
    move({})
    expect(view.dom.querySelector('.spote-link-hover')).toBeNull()
    move({ ctrlKey: true })
    expect(view.dom.querySelector('.spote-link-hover')?.textContent).toBe('[docs](https://a.b/c)')
    move({})
    expect(view.dom.querySelector('.spote-link-hover')).toBeNull()
  })
})
