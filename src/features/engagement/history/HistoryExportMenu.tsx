'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Download, FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react'
import { buttonVariants } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { ENGAGEMENT_FALLBACK_ONLY, type EngagementText } from '../engagement-text'
import { EXPORT_TO_CSV, EXPORT_TO_PDF } from './history-query'

const ITEM =
  'flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-[background-color,padding] duration-200 ease-out data-[highlighted]:bg-accent data-[highlighted]:pl-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&>svg]:size-4 [&>svg]:text-muted-foreground data-[highlighted]:[&>svg]:text-brand'

type HistoryExportMenuProps = { busy: boolean; onExport: (exportTo: number) => void; t: EngagementText }

// seats-admin-engagement-history.html:381-391: PDF and CSV, in the same header menu as Devices (ExportMenu.tsx).
export function HistoryExportMenu({ busy, onExport, t }: HistoryExportMenuProps) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={busy}
        aria-busy={busy}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'group bg-white shadow-sm')}
      >
        {busy ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <Download aria-hidden className="size-4" />
        )}
        {busy ? ENGAGEMENT_FALLBACK_ONLY.exporting : t('Export')}
        <ChevronDown
          aria-hidden
          className="size-3.5 opacity-70 transition-transform duration-300 ease-premium group-data-[state=open]:rotate-180"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 animate-menu-in overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card-lift motion-reduce:animate-none"
        >
          <DropdownMenu.Item className={ITEM} onSelect={() => onExport(EXPORT_TO_PDF)}>
            <FileText aria-hidden />
            {t('ExportToPDF')}
          </DropdownMenu.Item>
          <DropdownMenu.Item className={ITEM} onSelect={() => onExport(EXPORT_TO_CSV)}>
            <FileSpreadsheet aria-hidden />
            {t('ExportToCSV')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
