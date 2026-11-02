import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import { isOpenGesture, linkAtOffset, openHref } from '../command-core/openLink'
import type { LinkHit, OpenLinkHandler } from '../command-core/openLink'

const setHover = StateEffect.define<{ from: number; to: number } | null>()

const hoverField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setHover)) {
        return e.value ? Decoration.set([Decoration.mark({ class: 'spote-link-hover' }).range(e.value.from, e.value.to)]) : Decoration.none
      }
    }
    return tr.docChanged ? Decoration.none : deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

function linkUnder(view: EditorView, event: MouseEvent): LinkHit | null {
  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos == null) return null
  const line = view.state.doc.lineAt(pos)
  const hit = linkAtOffset(line.text, pos - line.from)
  return hit && { ...hit, from: line.from + hit.from, to: line.from + hit.to }
}

/**
 * Cmd/Ctrl+click on a `[text](url)` or bare URL opens it (any click, when the
 * editor is read-only). While the gesture would open something, the link under
 * the pointer is underlined.
 */
export function linkClick(getOnOpenLink: () => OpenLinkHandler | undefined): Extension {
  const editable = (view: EditorView) => view.state.facet(EditorView.editable)
  return [
    hoverField,
    EditorView.domEventHandlers({
      mousedown(event, view) {
        if (!isOpenGesture(event, editable(view))) return false
        const hit = linkUnder(view, event)
        if (!hit || !openHref(hit.href, event, getOnOpenLink())) return false
        event.preventDefault()
        return true
      },
      mousemove(event, view) {
        const hit = isOpenGesture({ button: 0, metaKey: event.metaKey, ctrlKey: event.ctrlKey } as MouseEvent, editable(view))
          ? linkUnder(view, event)
          : null
        const had = view.state.field(hoverField).size > 0
        if (hit) view.dispatch({ effects: setHover.of({ from: hit.from, to: hit.to }) })
        else if (had) view.dispatch({ effects: setHover.of(null) })
        return false
      },
    }),
  ]
}
