import type { SpotePlugin } from './command-core/plugin.types'
import type { ThemePreference } from './useResolvedTheme'
import type { OpenLinkHandler } from './command-core/openLink'

export type EditorMode = 'wysiwyg' | 'raw'

export interface NoteHit {
  id: string
  title: string
}

export interface SpoteEditorProps {
  value: string
  onChange: (md: string) => void
  /** Controlled mode. When given, the editor never changes mode on its own. */
  mode?: EditorMode
  /** Mode the editor opens in when uncontrolled. Defaults to `'wysiwyg'`. Ignored if `mode` is set. */
  defaultMode?: EditorMode
  onModeChange?: (mode: EditorMode) => void
  onSearchNotes?: (query: string) => Promise<NoteHit[]>
  onResolveNoteHref?: (note: NoteHit) => string
  /**
   * Called when the user opens a link (Cmd/Ctrl+click, or any click when `readOnly`). Lets the host
   * route internal links itself. Absent → the link opens in a new tab. Only http(s), mailto and
   * relative links ever reach it.
   */
  onOpenLink?: OpenLinkHandler
  /** Receives a picked/pasted/dropped image file; returns the URL to embed. Absent → image features off. */
  onUpload?: (file: File) => Promise<string>
  plugins?: SpotePlugin[]
  placeholder?: string
  readOnly?: boolean
  className?: string
  autoFocus?: boolean
  /** Diagram (mermaid) rendering theme. The editor's own colours come from the `--spote-*` CSS variables. */
  theme?: ThemePreference
}
