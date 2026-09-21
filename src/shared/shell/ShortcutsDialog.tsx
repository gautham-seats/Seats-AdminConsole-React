'use client'

import { Keyboard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Dialog } from '@/shared/ui/Dialog'

const EN = {
  title: 'Keyboard shortcuts',
  description: 'Work faster anywhere in Admin.',
  close: 'Close',
  plus: '+',
  groups: [
    {
      name: 'Everywhere',
      items: [
        { keys: ['Ctrl', 'K'], label: 'Open search' },
        { keys: ['?'], label: 'Show these shortcuts' },
        { keys: ['Esc'], label: 'Close a dialog, menu or picker' },
        { keys: ['Tab'], label: 'Move to the next field' },
      ],
    },
    {
      name: 'Search',
      items: [
        { keys: ['↑', '↓'], label: 'Move between results' },
        { keys: ['Enter'], label: 'Open the result' },
        { keys: ['Ctrl', 'Enter'], label: 'Open in a new tab' },
        { keys: ['Tab'], label: 'Complete the suggestion' },
        { keys: ['@'], label: 'Search one area' },
        { keys: ['>'], label: 'Run a command' },
      ],
    },
    {
      name: 'Forms and lists',
      items: [
        { keys: ['Ctrl', 'S'], label: 'Save settings' },
        { keys: ['Enter'], label: 'Run the list search' },
      ],
    },
  ],
}

const SHORTCUT_KEY = '?'

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

// Press ? anywhere outside a text box to see every keyboard shortcut.
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key !== SHORTCUT_KEY ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        typing(event.target)
      )
        return
      // An open menu, list or picker keeps its own keys; ? must not open the sheet over it.
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'))
        return
      event.preventDefault()
      setOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={EN.title}
      description={EN.description}
      closeLabel={EN.close}
      className="max-w-2xl"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {EN.groups.map((group, groupIndex) => (
          <section key={group.name} className={groupIndex === 1 ? 'sm:row-span-2' : undefined}>
            <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
              {groupIndex === 0 ? <Keyboard aria-hidden className="size-3.5" /> : null}
              {group.name}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item, index) => (
                <li
                  key={`${group.name}-${item.label}`}
                  style={{ animationDelay: `${120 + groupIndex * 60 + index * 30}ms` }}
                  className="flex animate-item-in items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 motion-reduce:animate-none"
                >
                  <span>{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key, keyIndex) => (
                      <span key={`${key}-${keyIndex}`} className="flex items-center gap-1">
                        {keyIndex > 0 ? <span className="text-xs text-slate-500">{EN.plus}</span> : null}
                        <kbd className="grid h-6 min-w-6 place-items-center rounded-md border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-1.5 font-sans text-[11px] font-semibold text-slate-600 shadow-[0_1px_0_rgba(15,23,42,.08)]">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  )
}
