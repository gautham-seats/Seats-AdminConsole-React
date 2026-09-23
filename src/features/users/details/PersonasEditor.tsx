'use client'

import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { NAV_BAND_ROW } from '@/shared/ui/nav-band'
import type { SimpleListItemDto } from '@/types/users'
import type { PersonaRow } from './user-form'

export type PersonasEditorProps = {
  rows: readonly PersonaRow[]
  selectedKey: string | null
  optionsFor: (accessProfileId: number | null) => SimpleListItemDto[]
  labels: {
    add: string
    up: string
    down: string
    accessProfile: string
    delete: string
    select: string
    none: string
  }
  // Message per invalid row, keyed by row key.
  rowErrors: ReadonlyMap<string, string>
  onSelect: (key: string) => void
  onAdd: () => void
  onMove: (direction: -1 | 1) => void
  onRemove: (key: string) => void
  onChange: (key: string, accessProfileId: number | null) => void
}

// Radix Select needs a non-empty value for the optionsCaption '[None]' entry.
const NONE_VALUE = 'none'

// Views/User/Details.cshtml:145-189: Add, Down and Up act on the selected row (no-op without one); delete hides with one row.
export function PersonasEditor({
  rows,
  selectedKey,
  optionsFor,
  labels,
  rowErrors,
  onSelect,
  onAdd,
  onMove,
  onRemove,
  onChange,
}: PersonasEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button onClick={onAdd} className={ADD_BUTTON_CLASS}>
          <Plus aria-hidden className={ADD_ICON_CLASS} />
          {labels.add}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-9 px-0"
          onClick={() => onMove(1)}
          aria-label={labels.down}
          title={labels.down}
        >
          <ArrowDown aria-hidden className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-9 px-0"
          onClick={() => onMove(-1)}
          aria-label={labels.up}
          title={labels.up}
        >
          <ArrowUp aria-hidden className="size-4" />
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className={NAV_BAND_ROW}>
            <tr>
              <th scope="col" className="h-10 w-12 bg-transparent pl-4 text-left text-white">
                <span className="sr-only">{labels.select}</span>
              </th>
              <th
                scope="col"
                className="h-10 bg-transparent px-3 text-left text-[12.5px] font-bold tracking-[0.01em] text-white"
              >
                {labels.accessProfile}
              </th>
              <th scope="col" className="h-10 w-14 bg-transparent pr-4 text-white">
                <span className="sr-only">{labels.delete}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const selected = row.key === selectedKey
              const rowError = rowErrors.get(row.key)
              const errorId = `persona-${row.key}-error`
              const options = optionsFor(row.accessProfileId)
              const rowName =
                options.find(option => option.id === row.accessProfileId)?.description ?? labels.none
              return (
                <tr
                  key={row.key}
                  style={{ animationDelay: `${index * 24}ms` }}
                  className={cn(
                    'animate-row-in transition-colors duration-200 motion-reduce:animate-none',
                    selected ? 'bg-brand/[0.06]' : 'hover:bg-page',
                  )}
                >
                  <td className="border-b border-border py-2 pl-4">
                    <button
                      type="button"
                      onClick={() => onSelect(row.key)}
                      aria-pressed={selected}
                      aria-label={`${labels.select} ${rowName}`}
                      className={cn(
                        'lift-bloom grid size-8 place-items-center rounded-md border transition-[background-color,border-color,color,transform] duration-200 ease-premium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        selected
                          ? 'border-brand bg-brand text-white'
                          : 'border-border bg-white text-muted-foreground hover:border-brand/40 hover:text-brand',
                      )}
                    >
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          'size-4 transition-transform duration-300 ease-premium',
                          selected && 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </td>
                  <td className="border-b border-border px-2 py-2">
                    <Select
                      value={row.accessProfileId === null ? NONE_VALUE : String(row.accessProfileId)}
                      onValueChange={value => onChange(row.key, value === NONE_VALUE ? null : Number(value))}
                    >
                      <SelectTrigger
                        aria-label={labels.accessProfile}
                        aria-invalid={Boolean(rowError)}
                        aria-describedby={rowError ? errorId : undefined}
                        className={cn('max-w-md bg-white', rowError && 'border-destructive')}
                      >
                        <SelectValue placeholder={labels.none} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>{labels.none}</SelectItem>
                        {options.map(option => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            {option.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {rowError ? (
                      <p
                        id={errorId}
                        className="mt-1 animate-rise-in text-xs font-medium text-destructive motion-reduce:animate-none"
                      >
                        {rowError}
                      </p>
                    ) : null}
                  </td>
                  <td className="border-b border-border py-2 pr-4 text-right">
                    {rows.length > 1 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-9 px-0 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        onClick={() => onRemove(row.key)}
                        aria-label={`${labels.delete} ${rowName}`}
                        title={labels.delete}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
