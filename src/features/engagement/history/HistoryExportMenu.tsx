'use client'

import { Check, Download, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { buttonVariants, Dialog } from '@/shared/ui'
import { EXPORT_BUTTON_CLASS, EXPORT_ICON_CLASS } from '@/shared/ui/add-button'
import { cn } from '@/shared/ui/cn'
import { FileGlyph } from '@/shared/ui/FileGlyph'
import { ENGAGEMENT_FALLBACK_ONLY, type EngagementText } from '../engagement-text'
import { EXPORT_TO_CSV, EXPORT_TO_PDF } from './history-query'

type HistoryExportMenuProps = { busy: boolean; onExport: (exportTo: number) => void; t: EngagementText }

const CARD =
  'group relative flex flex-col items-center gap-4 rounded-2xl border-2 bg-white px-5 py-7 text-center outline-none transition-[border-color,box-shadow,transform] duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-card-lift focus-visible:ring-2 focus-visible:ring-ring'

// seats-admin-engagement-history.html:381-391: PDF and CSV, offered as the same format dialog as the
// device list, so every export on the console asks the same question the same way.
export function HistoryExportMenu({ busy, onExport, t }: HistoryExportMenuProps) {
  const [open, setOpen] = useState(false)

  const choose = (exportTo: number) => {
    setOpen(false)
    onExport(exportTo)
  }

  const card = (kind: 'pdf' | 'csv', exportTo: number, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => choose(exportTo)}
      className={cn(
        CARD,
        kind === 'pdf'
          ? 'border-border hover:border-[var(--color-file-pdf)]'
          : 'border-border hover:border-[var(--color-file-csv)]',
      )}
    >
      <FileGlyph kind={kind} />
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold text-foreground">{label}</span>
        <span className="text-[13px] text-muted-foreground">{hint}</span>
      </span>
      <span
        aria-hidden
        className="grid size-5 place-items-center rounded-full bg-brand text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        <Check className="size-3" />
      </span>
    </button>
  )

  return (
    <>
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: 'outline' }), EXPORT_BUTTON_CLASS)}
      >
        {busy ? (
          <LoaderCircle aria-hidden className="size-[18px] animate-spin motion-reduce:animate-none" />
        ) : (
          <Download aria-hidden className={EXPORT_ICON_CLASS} />
        )}
        {busy ? ENGAGEMENT_FALLBACK_ONLY.exporting : t('Export')}
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('Export')}
        description={ENGAGEMENT_FALLBACK_ONLY.exportPrompt}
        closeLabel={t('Close')}
        className="max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {card('pdf', EXPORT_TO_PDF, t('ExportToPDF'), ENGAGEMENT_FALLBACK_ONLY.exportPdfHint)}
          {card('csv', EXPORT_TO_CSV, t('ExportToCSV'), ENGAGEMENT_FALLBACK_ONLY.exportCsvHint)}
        </div>
      </Dialog>
    </>
  )
}
