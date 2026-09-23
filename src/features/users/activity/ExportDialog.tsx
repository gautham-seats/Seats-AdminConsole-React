'use client'

import { Check, LoaderCircle, Save } from 'lucide-react'
import { useId, useState } from 'react'
import { Button, Dialog } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { FileGlyph } from '@/shared/ui/FileGlyph'

export type ExportDialogLabels = {
  title: string
  exportAs: string
  pdf: string
  csv: string
  save: string
  cancel: string
  close: string
}

type ExportDialogProps = {
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onExport: (exportTo: 0 | 1) => void
  labels: ExportDialogLabels
}

type Format = { value: 0 | 1; label: string; kind: 'pdf' | 'csv' }

// The same card and file glyph as the Devices export (ExportMenu.tsx), so both dialogs read alike.
const CARD =
  'group relative flex flex-col items-center gap-4 rounded-2xl border-2 bg-white px-5 py-7 text-center outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-card-lift active:scale-[.98] focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none'

// seats-website-export.html:30-75: Export As (Pdf first) with Save and Cancel.
export function ExportDialog({ open, pending, onOpenChange, onExport, labels }: ExportDialogProps) {
  const groupId = useId()
  const [exportTo, setExportTo] = useState<0 | 1>(0)
  const formats: Format[] = [
    { value: 0, label: labels.pdf, kind: 'pdf' },
    { value: 1, label: labels.csv, kind: 'csv' },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!pending) onOpenChange(next)
      }}
      title={labels.title}
      closeLabel={labels.close}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button loading={pending} onClick={() => onExport(exportTo)}>
            {pending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Save aria-hidden className="size-4" />
            )}
            {labels.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <span id={groupId} className="text-sm font-medium text-foreground">
          {labels.exportAs}
        </span>
        <div role="radiogroup" aria-labelledby={groupId} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {formats.map(format => {
            const checked = exportTo === format.value
            return (
              <button
                key={format.value}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={pending}
                onClick={() => setExportTo(format.value)}
                onKeyDown={event => {
                  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
                    event.preventDefault()
                    setExportTo(format.value === 0 ? 1 : 0)
                  }
                }}
                tabIndex={checked ? 0 : -1}
                className={cn(
                  CARD,
                  checked
                    ? 'border-brand bg-brand/[0.04] shadow-[0_8px_20px_-12px_rgba(21,102,162,.55)]'
                    : format.kind === 'pdf'
                      ? 'border-border hover:border-[var(--color-file-pdf)]'
                      : 'border-border hover:border-[var(--color-file-csv)]',
                )}
              >
                <FileGlyph kind={format.kind} />
                <span className="text-base font-semibold text-foreground">{format.label}</span>
                <span
                  className={cn(
                    'absolute top-3 right-3 grid size-5 place-items-center rounded-full border transition-all duration-200',
                    checked
                      ? 'scale-100 border-brand bg-brand text-white'
                      : 'scale-90 border-border bg-white text-transparent',
                  )}
                >
                  <Check aria-hidden className="size-3" />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Dialog>
  )
}
