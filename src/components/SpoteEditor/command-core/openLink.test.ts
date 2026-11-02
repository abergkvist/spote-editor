import { describe, it, expect, vi, afterEach } from 'vitest'
import { isSafeHref, isOpenGesture, openHref, linkAtOffset } from './openLink'

const click = (init: MouseEventInit = {}) => new MouseEvent('click', { button: 0, ...init })

describe('isSafeHref', () => {
  it.each(['https://a.b', 'http://a.b/c?d=1', 'mailto:a@b.c', '/notes/1', 'notes/1', '#x', '//a.b'])('allows %s', (h) => {
    expect(isSafeHref(h)).toBe(true)
  })
  it.each(['javascript:alert(1)', 'JavaScript:alert(1)', 'java\tscript:alert(1)', ' javascript:x', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd', ''])('blocks %j', (h) => {
    expect(isSafeHref(h)).toBe(false)
  })
})

describe('isOpenGesture', () => {
  it('needs a modifier while editable', () => {
    expect(isOpenGesture(click(), true)).toBe(false)
    expect(isOpenGesture(click({ metaKey: true }), true)).toBe(true)
    expect(isOpenGesture(click({ ctrlKey: true }), true)).toBe(true)
  })
  it('opens on any primary click when read-only', () => {
    expect(isOpenGesture(click(), false)).toBe(true)
  })
  it('ignores other buttons', () => {
    expect(isOpenGesture(click({ button: 2, metaKey: true }), true)).toBe(false)
  })
})

describe('openHref', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('hands the link to onOpenLink when given', () => {
    const spy = vi.spyOn(window, 'open').mockReturnValue(null)
    const onOpenLink = vi.fn()
    const e = click()
    expect(openHref('/notes/1', e, onOpenLink)).toBe(true)
    expect(onOpenLink).toHaveBeenCalledWith('/notes/1', e)
    expect(spy).not.toHaveBeenCalled()
  })
  it('falls back to a new tab without opener access', () => {
    const spy = vi.spyOn(window, 'open').mockReturnValue(null)
    openHref('https://a.b', click())
    expect(spy).toHaveBeenCalledWith('https://a.b', '_blank', 'noopener,noreferrer')
  })
  it('does nothing for unsafe links', () => {
    const spy = vi.spyOn(window, 'open').mockReturnValue(null)
    const onOpenLink = vi.fn()
    expect(openHref('javascript:alert(1)', click(), onOpenLink)).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    expect(onOpenLink).not.toHaveBeenCalled()
  })
})

describe('linkAtOffset', () => {
  const line = 'see [the docs](https://a.b/c) and https://d.e/f. ok'
  it('finds a markdown link anywhere in its span', () => {
    expect(linkAtOffset(line, 5)).toMatchObject({ href: 'https://a.b/c', from: 4, to: 29 })
    expect(linkAtOffset(line, 20)?.href).toBe('https://a.b/c')
  })
  it('finds a bare URL and drops trailing punctuation', () => {
    const hit = linkAtOffset(line, 40)
    expect(hit?.href).toBe('https://d.e/f')
    expect(line.slice(hit!.from, hit!.to)).toBe('https://d.e/f')
  })
  it('does not double-count the URL inside a markdown link', () => {
    expect(linkAtOffset('[x](https://a.b)', 8)?.href).toBe('https://a.b')
  })
  it('returns null off a link', () => {
    expect(linkAtOffset(line, 0)).toBeNull()
    expect(linkAtOffset(line, 31)).toBeNull()
  })
  it('handles relative note links', () => {
    expect(linkAtOffset('[[x]] [Note](/notes/42)', 10)?.href).toBe('/notes/42')
  })
})
