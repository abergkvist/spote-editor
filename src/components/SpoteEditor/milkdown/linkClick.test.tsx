import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, waitFor, fireEvent } from '@testing-library/react'
import { MilkdownEditor } from './MilkdownEditor'

async function renderLink(href: string, props: { readOnly?: boolean; onOpenLink?: (h: string, e: MouseEvent) => void } = {}) {
  const { container } = render(
    <MilkdownEditor
      value={`a [link](${href}) b`}
      onChange={() => {}}
      plugins={[]}
      requestLink={async () => null}
      pickImage={async () => null}
      {...props}
    />,
  )
  const a = await waitFor(() => {
    const el = container.querySelector('a')
    expect(el).not.toBeNull()
    return el!
  })
  return a
}

describe('WYSIWYG link opening', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('opens on Cmd+click and Ctrl+click', async () => {
    const onOpenLink = vi.fn()
    const a = await renderLink('/notes/1', { onOpenLink })
    fireEvent.click(a, { metaKey: true })
    fireEvent.click(a, { ctrlKey: true })
    expect(onOpenLink).toHaveBeenCalledTimes(2)
    expect(onOpenLink.mock.calls[0][0]).toBe('/notes/1')
  })

  it('leaves a plain click to the editor', async () => {
    const onOpenLink = vi.fn()
    const a = await renderLink('/notes/1', { onOpenLink })
    fireEvent.click(a)
    expect(onOpenLink).not.toHaveBeenCalled()
  })

  it('opens on a plain click when read-only', async () => {
    const onOpenLink = vi.fn()
    const a = await renderLink('https://a.b', { readOnly: true, onOpenLink })
    fireEvent.click(a)
    expect(onOpenLink).toHaveBeenCalledWith('https://a.b', expect.any(MouseEvent))
  })

  it('falls back to a new tab without onOpenLink', async () => {
    const spy = vi.spyOn(window, 'open').mockReturnValue(null)
    const a = await renderLink('https://a.b')
    fireEvent.click(a, { metaKey: true })
    expect(spy).toHaveBeenCalledWith('https://a.b', '_blank', 'noopener,noreferrer')
  })

  it('never opens a javascript: link', async () => {
    const spy = vi.spyOn(window, 'open').mockReturnValue(null)
    const onOpenLink = vi.fn()
    const a = await renderLink('javascript:alert(1)', { onOpenLink })
    fireEvent.click(a, { metaKey: true })
    expect(spy).not.toHaveBeenCalled()
    expect(onOpenLink).not.toHaveBeenCalled()
  })
})
