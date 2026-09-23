import type { EventTypeInAccessProfileDto, ItemTypeViewModel } from '@/types/access-profiles'
import { VISIBILITY_EN } from './briefing-text'
import { findEvent } from './access-profile-form'
import type { VisibilityItem, VisibilityLens } from './VisibilityPreview'

export type VisibilityTab = 'events' | 'cases' | 'workflows'

export type SimpleItem = { id: number; description: string | null }

export type VisibilityCatalogue = {
  events: readonly ItemTypeViewModel[]
  cases: readonly SimpleItem[]
  workflows: readonly SimpleItem[]
}

const NAME_LIMIT = 3
const SEPARATOR = ', '

// Event rows have no id of their own; type and subType together identify one (seats-admin-security-event).
export const eventRowId = (item: ItemTypeViewModel) => item.type * 1000 + item.subType

const label = (value: string | null | undefined) => (value ?? '').trim()

function lead(names: readonly string[]): string {
  if (names.length === 0) return ''
  const head = names.slice(0, NAME_LIMIT).join(SEPARATOR)
  return names.length > NAME_LIMIT ? `${head} +${names.length - NAME_LIMIT}` : head
}

function split(
  items: readonly VisibilityItem[],
  isOn: (item: VisibilityItem) => boolean,
): { visible: VisibilityItem[]; hidden: VisibilityItem[] } {
  const visible: VisibilityItem[] = []
  const hidden: VisibilityItem[] = []
  for (const item of items) (isOn(item) ? visible : hidden).push(item)
  return { visible, hidden }
}

type Source = {
  tab: VisibilityTab
  catalogue: VisibilityCatalogue
  selectedEvents: readonly EventTypeInAccessProfileDto[]
  selectedCases: readonly number[]
  selectedWorkflows: readonly number[]
}

// One lens per visibility tab, shaped exactly like the Site Access briefing so the panel never changes form.
export function buildVisibilityLens({
  tab,
  catalogue,
  selectedEvents,
  selectedCases,
  selectedWorkflows,
}: Source): VisibilityLens {
  if (tab === 'events') {
    const rows: VisibilityItem[] = catalogue.events.map(item => ({
      id: eventRowId(item),
      name: label(item.description),
    }))
    const on = new Map(
      catalogue.events.map(item => [eventRowId(item), findEvent(selectedEvents, item)] as const),
    )
    const { visible, hidden } = split(rows, item => Boolean(on.get(item.id)))
    const withDetails = visible.filter(item => on.get(item.id)?.detail).length
    const withComments = visible.filter(item => on.get(item.id)?.comment).length
    const text = VISIBILITY_EN.events
    return {
      key: tab,
      hint: text.hint,
      counts: { open: visible.length, allowed: withDetails, shut: hidden.length },
      labels: { open: text.open, allowed: text.allowed, shut: text.shut },
      lead: text.lead,
      typed: lead(visible.map(item => item.name)),
      tail: withComments > 0 ? text.withComments(withComments) : text.noComments,
      visible,
      hidden,
      shutTitle: text.shutTitle,
      emptyVisible: text.empty,
    }
  }

  const source = tab === 'cases' ? catalogue.cases : catalogue.workflows
  const picked = tab === 'cases' ? selectedCases : selectedWorkflows
  const text = tab === 'cases' ? VISIBILITY_EN.cases : VISIBILITY_EN.workflows
  const rows: VisibilityItem[] = source.map(item => ({ id: item.id, name: label(item.description) }))
  const { visible, hidden } = split(rows, item => picked.includes(item.id))
  return {
    key: tab,
    hint: text.hint,
    counts: { open: visible.length, allowed: rows.length, shut: hidden.length },
    labels: { open: text.open, allowed: text.allowed, shut: text.shut },
    lead: text.lead,
    typed: lead(visible.map(item => item.name)),
    tail: '.',
    visible,
    hidden,
    shutTitle: text.shutTitle,
    emptyVisible: text.empty,
  }
}
