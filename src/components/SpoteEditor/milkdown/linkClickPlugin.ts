import { Plugin, PluginKey } from '@milkdown/prose/state'
import { isOpenGesture, openHref } from '../command-core/openLink'
import type { OpenLinkHandler } from '../command-core/openLink'

export const linkClickPluginKey = new PluginKey('spote-link-click')

const READY_CLASS = 'spote-link-ready'

function anchorOf(event: Event): HTMLAnchorElement | null {
  return event.target instanceof Element ? event.target.closest('a[href]') : null
}

/**
 * Cmd/Ctrl+click on a link opens it (any click, when the editor is read-only).
 * A plain click in an editable document still just places the cursor. While the
 * gesture would open the link under the pointer, the editor gets a class so the
 * stylesheet can show a pointer cursor.
 */
export function createLinkClickPlugin(getOnOpenLink: () => OpenLinkHandler | undefined): Plugin {
  return new Plugin({
    key: linkClickPluginKey,
    props: {
      handleDOMEvents: {
        click(view, event) {
          const a = anchorOf(event)
          if (!a || !isOpenGesture(event, view.editable)) return false
          // Also stops the browser from navigating this tab for a read-only link.
          event.preventDefault()
          openHref(a.getAttribute('href') ?? '', event, getOnOpenLink())
          return true
        },
        mousemove(view, event) {
          const ready = !!anchorOf(event) && isOpenGesture({ button: 0, metaKey: event.metaKey, ctrlKey: event.ctrlKey } as MouseEvent, view.editable)
          view.dom.classList.toggle(READY_CLASS, ready)
          return false
        },
      },
    },
  })
}
