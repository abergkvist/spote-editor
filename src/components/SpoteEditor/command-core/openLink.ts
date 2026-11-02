/** Called instead of the default `window.open` when the user opens a link. */
export type OpenLinkHandler = (href: string, event: MouseEvent) => void

const ALLOWED_SCHEME = /^(https?|mailto):/i
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * Markdown comes from users, so only open what is plainly a web, mail or relative
 * link. Browsers ignore whitespace/control characters inside a scheme
 * (`java\tscript:`), so strip them before looking.
 */
export function isSafeHref(href: string): boolean {
  // eslint-disable-next-line no-control-regex
  const h = href.replace(/[\u0000- ]/g, '')
  if (!h) return false
  return HAS_SCHEME.test(h) ? ALLOWED_SCHEME.test(h) : true
}

/** Cmd/Ctrl+click always opens; a plain click only opens where there is nothing to edit. */
export function isOpenGesture(event: MouseEvent, editable: boolean): boolean {
  return event.button === 0 && (event.metaKey || event.ctrlKey || !editable)
}

/** Opens `href` via the host's handler, or in a new tab. Returns false (doing nothing) for unsafe links. */
export function openHref(href: string, event: MouseEvent, onOpenLink?: OpenLinkHandler): boolean {
  if (!isSafeHref(href)) return false
  if (onOpenLink) onOpenLink(href, event)
  else window.open(href, '_blank', 'noopener,noreferrer')
  return true
}

export interface LinkHit { from: number; to: number; href: string }

const MD_LINK = /\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)/g
const BARE_URL = /https?:\/\/[^\s<>)\]]+/g

/** Finds the markdown link or bare URL in `line` that covers `offset`. */
export function linkAtOffset(line: string, offset: number): LinkHit | null {
  const hits: LinkHit[] = []
  for (const m of line.matchAll(MD_LINK)) {
    hits.push({ from: m.index, to: m.index + m[0].length, href: m[1] })
  }
  for (const m of line.matchAll(BARE_URL)) {
    const url = m[0].replace(/[.,;:!?]+$/, '')
    const from = m.index
    if (hits.some((h) => from >= h.from && from < h.to)) continue
    hits.push({ from, to: from + url.length, href: url })
  }
  return hits.find((h) => offset >= h.from && offset < h.to) ?? null
}
