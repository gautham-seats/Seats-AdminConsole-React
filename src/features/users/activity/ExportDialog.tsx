'use client'

import { Check, FileSpreadsheet, FileText, LoaderCircle, Save, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button, Dialog } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

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

type Format = { value: 0 | 1; label: string; icon: LucideIcon }

// seats-website-export.html:30-75: Export As (Pdf first) with Save and Cancel.
export function ExportDialog({ open, pending, onOpenChange, onExport, labels }: ExportDialogProps) {
  const groupId = useId()
  const [exportTo, setExportTo] = useState<0 | 1>(0)
  const formats: Format[] = [
    { value: 0, label: labels.pdf, icon: FileText },
    { value: 1, label: labels.csv, icon: FileSpreadsheet },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!pending) onOpenChange(next)
      }}
      title={labels.title}
      closeLabel={labels.close}
      className="max-w-md"
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
      <div className="flex flex-col gap-2">
        <span id={groupId} className="text-sm font-medium text-foreground">
          {labels.exportAs}
        </span>
        <div role="radiogroup" aria-labelledby={groupId} className="grid grid-cols-2 gap-3">
          {formats.map(format => {
            const checked = exportTo === format.value
            const Icon = format.icon
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
                  'lift-bloom group relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 ease-premium active:scale-[.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 motion-reduce:transition-none',
                  checked
                    ? 'border-brand bg-brand/[0.04] shadow-[0_0_0_1px_var(--color-brand),0_8px_20px_-12px_rgba(21,102,162,.55)]'
                    : 'border-border bg-white hover:border-slate-300 hover:bg-page',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-md transition-colors',
                    checked
                      ? 'bg-brand text-white'
                      : 'bg-muted text-muted-foreground group-hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="text-sm font-semibold text-foreground">{format.label}</span>
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
