'use client'

import 'quill/dist/quill.snow.css'
import type Quill from 'quill'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { cn } from '@/shared/ui/cn'
import { labelQuillToolbar } from './quill-toolbar-labels'
import { sanitizeTemplateHtml } from './sanitize-template-html'

export type TemplateEditorHandle = {
  getHtml: () => string
  setHtml: (html: string) => void
  replaceWithHtml: (html: string) => void
  insertAtCursor: (text: string) => void
}

type TemplateEditorProps = {
  label: string
  disabled: boolean
  initialHtml: string
  onChange: () => void
  invalid?: boolean
  describedBy?: string
  className?: string
}

const applyFieldState = (root: HTMLElement, invalid: boolean, describedBy: string | undefined) => {
  if (invalid) root.setAttribute('aria-invalid', 'true')
  else root.removeAttribute('aria-invalid')
  if (describedBy) root.setAttribute('aria-describedby', describedBy)
  else root.removeAttribute('aria-describedby')
}

// polymer-quill toolbar-type="full" equivalent.
const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['link', 'blockquote', 'code-block'],
  ['clean'],
]

export const TemplateEditor = forwardRef<TemplateEditorHandle, TemplateEditorProps>(function TemplateEditor(
  { label, disabled, initialHtml, onChange, invalid = false, describedBy, className },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const initialRef = useRef(initialHtml)
  const fieldStateRef = useRef({ invalid, describedBy })

  useEffect(() => {
    onChangeRef.current = onChange
    fieldStateRef.current = { invalid, describedBy }
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    const surface = document.createElement('div')
    host.appendChild(surface)
    void import('quill').then(({ default: QuillEditor }) => {
      if (cancelled) return
      const quill = new QuillEditor(surface, { theme: 'snow', modules: { toolbar: TOOLBAR } })
      quill.root.setAttribute('role', 'textbox')
      quill.root.setAttribute('aria-multiline', 'true')
      quill.root.setAttribute('aria-label', label)
      applyFieldState(quill.root, fieldStateRef.current.invalid, fieldStateRef.current.describedBy)
      const toolbar = host.querySelector('.ql-toolbar')
      if (toolbar) labelQuillToolbar(toolbar)
      quill.setContents(quill.clipboard.convert({ html: sanitizeTemplateHtml(initialRef.current) }), 'silent')
      quill.on('text-change', (_delta, _old, source) => {
        if (source === 'user') onChangeRef.current()
      })
      quillRef.current = quill
    })
    return () => {
      cancelled = true
      quillRef.current = null
      host.replaceChildren()
    }
  }, [label])

  useEffect(() => {
    quillRef.current?.enable(!disabled)
  }, [disabled])

  useEffect(() => {
    const root = quillRef.current?.root
    if (root) applyFieldState(root, invalid, describedBy)
  }, [invalid, describedBy])

  useImperativeHandle(ref, () => ({
    // Sanitised on the way out too, so nothing Quill kept from a paste is ever saved (P10 S1-001).
    getHtml: () => sanitizeTemplateHtml(quillRef.current?.root.innerHTML ?? ''),
    setHtml: html => {
      const quill = quillRef.current
      const safeHtml = sanitizeTemplateHtml(html)
      if (quill) quill.setContents(quill.clipboard.convert({ html: safeHtml }), 'silent')
      else initialRef.current = safeHtml
    },
    replaceWithHtml: html => {
      const quill = quillRef.current
      if (!quill) return
      quill.deleteText(0, quill.getLength(), 'user')
      quill.clipboard.dangerouslyPasteHTML(0, sanitizeTemplateHtml(html), 'user')
    },
    insertAtCursor: text => {
      const quill = quillRef.current
      if (!quill) return
      quill.focus()
      const index = quill.getSelection()?.index ?? Math.max(0, quill.getLength() - 1)
      quill.insertText(index, text, 'user')
      quill.setSelection(index + text.length, 0, 'user')
    },
  }))

  return (
    <div
      ref={hostRef}
      className={cn(
        'template-editor flex min-h-[26rem] flex-col overflow-hidden rounded-lg border border-input bg-white shadow-sm transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15',
        '[&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border [&_.ql-toolbar]:bg-slate-50',
        '[&_.ql-container]:flex-1 [&_.ql-container]:border-0 [&_.ql-container]:text-sm [&_.ql-editor]:min-h-[22rem]',
        disabled && 'opacity-70',
        className,
      )}
    />
  )
})
