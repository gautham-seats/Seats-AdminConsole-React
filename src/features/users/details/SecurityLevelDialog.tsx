'use client'

import { Check, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useApiRead, type ApiError } from '@/shared/api'
import { Button, Checkbox, DelayedLoading, Dialog, ErrorState } from '@/shared/ui'
import { useRowWindow } from '@/shared/ui/use-row-window'
import type { SecurityLevel, SimpleListItemDto, UserSecurityLevelPermissionDto } from '@/types/users'
import type { UsersTextKey } from '../index/users-text'
import { addLevelPermission, removeLevelPermissions } from './security-levels'
import { LookupTypeahead } from './LookupTypeahead'
import { fetchLevelPermissions, searchSecurityLevels } from './user-details-api'

export type SecurityLevelDialogProps = {
  level: SecurityLevel
  userId: number
  existing: UserSecurityLevelPermissionDto[] | null
  canAdd: boolean
  canDelete: boolean
  t: (key: UsersTextKey) => string
  onApply: (items: UserSecurityLevelPermissionDto[]) => void
  onSearchError: (error: ApiError) => void
  onClose: () => void
}

const NO_IDS: ReadonlySet<number> = new Set()

// UserSecurityLevelPermission/Index.cshtml and userSecurityLevelPermissionDetailsController.js; changes stay local until Apply.
export function SecurityLevelDialog({
  level,
  userId,
  existing,
  canAdd,
  canDelete,
  t,
  onApply,
  onSearchError,
  onClose,
}: SecurityLevelDialogProps) {
  const load = useCallback(
    (signal: AbortSignal) => fetchLevelPermissions(userId, level, signal),
    [level, userId],
  )
  // userSecurityLevelPermissionDetailsController.js:149-161 always loads; rows already applied this session win.
  const read = useApiRead(`security-level:${userId}:${level}`, load)
  const search = useCallback(
    (query: string, signal: AbortSignal) => searchSecurityLevels(level, query, signal),
    [level],
  )
  const [edited, setEdited] = useState<UserSecurityLevelPermissionDto[] | null>(existing)
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<SimpleListItemDto | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<number>>(NO_IDS)
  // Controller :20-34: Select All is its own flag; ticking rows does not change it.
  const [selectAll, setSelectAll] = useState(false)

  const ready = read.status === 'success'
  const items = edited ?? read.data ?? []
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRowWindow(items.length, scroller)

  const resetSelection = () => {
    setSelectAll(false)
    setSelected(NO_IDS)
  }

  const add = () => {
    if (!picked) return
    setEdited(addLevelPermission(items, level, picked, userId))
    resetSelection()
  }

  const remove = () => {
    setEdited(removeLevelPermissions(items, selected))
    resetSelection()
  }

  const toggle = (id: number) =>
    setSelected(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => {
    const next = !selectAll
    setSelectAll(next)
    setSelected(next ? new Set(items.map(item => item.id)) : NO_IDS)
  }

  // Index.cshtml:23 labels the lookup with the raw ViewBag.SecurityLevel key, e.g. "Add school".
  const addLabel = `${t('Add')} ${level}`

  return (
    <Dialog
      open
      onOpenChange={open => (open ? undefined : onClose())}
      title={t('SecurityLevelPermissions')}
      closeLabel={t('Cancel')}
      className="max-w-xl"
      // bootstrap3-typeahead.js:236-267 swallows Esc while its menu is open, so only the menu closes.
      onEscapeKeyDown={event => {
        if (document.activeElement?.getAttribute('aria-expanded') === 'true') event.preventDefault()
      }}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button size="sm" disabled={!ready} onClick={() => onApply(items)}>
            <Check aria-hidden className="size-4" />
            {t('Apply')}
          </Button>
        </>
      }
    >
      {/* Index.cshtml:22-31 always shows the lookup; only Add needs Edit. */}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <LookupTypeahead
            id={`security-level-${level}-search`}
            label={addLabel}
            placeholder={t('Search')}
            text={text}
            icon={Search}
            cacheKey={`security-levels:${level}`}
            maxResults={level === 'student' ? 100 : 8}
            clientFilter={false}
            searchOnFocus
            onError={onSearchError}
            search={search}
            onTextChange={value => {
              setText(value)
              setPicked(null)
            }}
            onSelect={item => {
              setText(item.description ?? '')
              setPicked(item)
            }}
          />
        </div>
        {canAdd ? (
          <Button variant="outline" size="sm" className="h-9" disabled={!picked || !ready} onClick={add}>
            <Plus aria-hidden className="size-4" />
            {t('Add')}
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-10 items-center justify-end">
        {canDelete && selected.size > 0 ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={remove}
            className="animate-slide-in motion-reduce:animate-none"
          >
            <Trash2 aria-hidden className="size-4" />
            {t('Delete')}
          </Button>
        ) : null}
      </div>

      <div
        ref={scroller}
        onScroll={win.onScroll}
        className="max-h-72 scroll-pt-10 overflow-auto rounded-md border border-border"
      >
        {read.status === 'error' ? (
          <ErrorState
            message={t('AlertGeneralErrorDefault')}
            retryLabel={t('Refresh')}
            onRetry={read.reload}
            error={read.error}
            className="border-0 p-6"
          />
        ) : !ready ? (
          <div className="grid h-40 place-items-center">
            <DelayedLoading active label={t('Loading')} />
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 h-10 w-11 border-b border-border bg-card pl-3 text-left"
                >
                  <Checkbox checked={selectAll} onCheckedChange={toggleAll} label={t('SelectAll')} />
                </th>
                <th
                  scope="col"
                  className="sticky top-0 h-10 border-b border-border bg-card px-2 text-left font-medium text-muted-foreground"
                >
                  {t('Name')}
                </th>
              </tr>
            </thead>
            <tbody>
              {win.padTop > 0 ? <tr data-row-spacer aria-hidden style={{ height: win.padTop }} /> : null}
              {items.slice(win.start, win.end).map((item, offset) => (
                <tr
                  key={item.id}
                  style={{ animationDelay: `${Math.min(win.start + offset, 12) * 18}ms` }}
                  className="animate-row-in motion-reduce:animate-none"
                >
                  <td className="border-b border-border py-2 pl-3">
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                      label={`${t('Select')} ${item.name ?? ''}`}
                    />
                  </td>
                  <td className="border-b border-border px-2 py-2 text-foreground">{item.name}</td>
                </tr>
              ))}
              {win.padBottom > 0 ? (
                <tr data-row-spacer aria-hidden style={{ height: win.padBottom }} />
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </Dialog>
  )
}
