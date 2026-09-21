'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Pipette } from 'lucide-react'
import { Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { previewColor, SWATCH_COLUMNS, toColorInputValue } from './settings-form'

type ColorFieldProps = {
  id: string
  label: string
  value: string
  disabled: boolean
  paletteLabel: string
  customLabel: string
  placeholder: string
  defaultColor: string
  onChange: (value: string) => void
}

const CHECKER = 'bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-[length:10px_10px]'

export function ColorField({
  id,
  label,
  value,
  disabled,
  paletteLabel,
  customLabel,
  placeholder,
  defaultColor,
  onChange,
}: ColorFieldProps) {
  const swatch = previewColor(value, defaultColor)
  const isDefault = !value.trim()
  const selected = value.trim().toLowerCase()

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          disabled={disabled}
          aria-label={`${label}: ${paletteLabel}`}
          className={cn(
            'group relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-input shadow-sm outline-none transition-[box-shadow,transform] duration-200 ease-premium hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=open]:ring-2 data-[state=open]:ring-ring motion-reduce:transition-none',
            CHECKER,
          )}
        >
          <span
            aria-hidden
            className={cn(
              'absolute inset-0 transition-[background-color,opacity] duration-300',
              isDefault && 'opacity-45',
            )}
            style={{ backgroundColor: swatch }}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            aria-label={paletteLabel}
            className="z-50 animate-menu-in rounded-xl border border-border bg-white p-3 shadow-[0_18px_40px_-12px_rgba(15,23,42,.35)] outline-none motion-reduce:animate-none"
          >
            <DropdownMenu.Label
              id={`${id}-palette-label`}
              className="pb-2 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase"
            >
              {paletteLabel}
            </DropdownMenu.Label>
            <DropdownMenu.Group
              aria-labelledby={`${id}-palette-label`}
              className="grid grid-flow-col grid-rows-10 gap-0.5"
            >
              {SWATCH_COLUMNS.flat().map(color => (
                <DropdownMenu.Item
                  key={color}
                  onSelect={() => onChange(color)}
                  aria-label={color}
                  title={color}
                  className="group/swatch relative size-4 cursor-pointer rounded-[3px] outline-none transition-transform duration-150 ease-premium data-[highlighted]:z-10 data-[highlighted]:scale-150 data-[highlighted]:shadow-md data-[highlighted]:ring-2 data-[highlighted]:ring-slate-900"
                  style={{ backgroundColor: color }}
                >
                  {selected === color ? (
                    <Check
                      aria-hidden
                      className="absolute inset-0 m-auto size-3 text-white mix-blend-difference"
                      strokeWidth={3}
                    />
                  ) : null}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        className="h-9 w-full max-w-60 placeholder:font-sans placeholder:text-slate-500 bg-white font-mono text-[13px] tabular-nums"
      />

      <label
        className={cn(
          'relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-page hover:text-foreground focus-within:ring-2 focus-within:ring-ring',
          disabled && 'pointer-events-none opacity-50',
        )}
        title={customLabel}
      >
        <Pipette aria-hidden className="size-4" />
        <input
          type="color"
          aria-label={`${label}: ${customLabel}`}
          disabled={disabled}
          value={toColorInputValue(value)}
          onChange={event => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
