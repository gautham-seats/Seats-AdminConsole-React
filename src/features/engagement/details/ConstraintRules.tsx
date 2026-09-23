'use client'

import { MinusCircle, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useApiRead } from '@/shared/api'
import {
  LookupSearch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type LookupOption,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { NAV_BAND_CELL } from '@/shared/ui/nav-band'
import { ENGAGEMENT_FALLBACK_ONLY, type EngagementText } from '../engagement-text'
import { fetchCategoryOptions, searchCategory } from './details-api'
import {
  APPLIED_CATEGORIES,
  CATEGORY_TEXT,
  categoryKey,
  isDropdownCategory,
  isSearchCategory,
  type ConstraintCategory,
  type EngagementConstraint,
} from './details-model'

type Draft = { include: '' | 'true' | 'false'; category: string; value: LookupOption | null }

const EMPTY: Draft = { include: '', category: '', value: null }

// Lookup lists are capped so an empty query never renders every student or course.
const MAX_RESULTS = 50

// Two rule editors share the page (applied rules and dataset building), so every id carries its prefix.
const fieldIds = (prefix: string) => ({
  include: `${prefix}-include`,
  category: `${prefix}-category`,
  value: `${prefix}-value`,
  includeError: `${prefix}-include-error`,
  categoryError: `${prefix}-category-error`,
  valueError: `${prefix}-value-error`,
})

// Which parts of a rule are still missing; empty once the rule can be added.
function missingRuleParts(draft: Draft): { include: boolean; category: boolean; value: boolean } {
  return {
    include: !draft.include,
    category: !draft.category,
    value: !draft.value || !draft.value.label,
  }
}

export type ConstraintRulesProps = {
  constraints: readonly EngagementConstraint[]
  disabled: boolean
  /** Categories offered; dataset building also offers College Year. */
  categories?: readonly ConstraintCategory[]
  /** Prefix for this editor's element ids. */
  idPrefix?: string
  t: EngagementText
  onAdd: (constraint: EngagementConstraint) => void
  onRemove: (index: number) => void
  onInvalid: (message: string) => void
}

// "Model applied to" rule editor (seats-admin-engagement-model-rule.html:53-146).
export function ConstraintRules({
  constraints,
  disabled,
  categories = APPLIED_CATEGORIES,
  idPrefix = 'engagement-rule',
  t,
  onAdd,
  onRemove,
  onInvalid,
}: ConstraintRulesProps) {
  const ids = fieldIds(idPrefix)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [tried, setTried] = useState(false)
  // Flags appear after an Add attempt and clear per field as soon as that field is chosen.
  const missing = tried ? missingRuleParts(draft) : { include: false, category: false, value: false }
  const dropdown = isDropdownCategory(draft.category) ? draft.category : null
  const search = isSearchCategory(draft.category) ? draft.category : null
  const loadOptions = useCallback(
    (signal: AbortSignal) => (dropdown ? fetchCategoryOptions(dropdown, signal) : Promise.resolve([])),
    [dropdown],
  )
  const options = useApiRead(dropdown ? `engagement-category:${dropdown}` : null, loadOptions)
  const runSearch = useCallback(
    async (query: string, signal: AbortSignal): Promise<LookupOption[]> =>
      search
        ? (await searchCategory(search, query, signal)).map(item => ({
            id: item.id,
            label: item.description ?? '',
          }))
        : [],
    [search],
  )

  const add = () => {
    // seats-admin-engagement-model-rule.html:315-335.
    const parts = missingRuleParts(draft)
    if (parts.include || parts.category || parts.value || !draft.value) {
      setTried(true)
      onInvalid(t('RequiredMessage'))
      return
    }
    onAdd({
      isInclude: draft.include === 'true',
      category: draft.category,
      value: String(draft.value.id),
      valueDescription: draft.value.label,
    })
    setDraft(EMPTY)
    setTried(false)
  }

  const categoryLabel = (category: string) => {
    const key = categoryKey(category)
    return key ? t(key) : category
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,9rem)_minmax(0,11rem)_auto_minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.include} className="text-[13px] font-medium text-slate-700">
            {t('Include')}
          </label>
          <Select
            value={draft.include}
            onValueChange={value =>
              setDraft(current => ({ ...current, include: value === 'true' ? 'true' : 'false' }))
            }
            disabled={disabled}
          >
            <SelectTrigger
              id={ids.include}
              className="h-10 bg-white"
              aria-invalid={missing.include}
              aria-describedby={missing.include ? ids.includeError : undefined}
            >
              <SelectValue placeholder={t('Select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t('Include')}</SelectItem>
              <SelectItem value="false">{t('Exclude')}</SelectItem>
            </SelectContent>
          </Select>
          <RuleError
            id={ids.includeError}
            show={missing.include}
            message={ENGAGEMENT_FALLBACK_ONLY.ruleIncludeRequired}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.category} className="text-[13px] font-medium text-slate-700">
            {t('Category')}
          </label>
          <Select
            value={draft.category}
            onValueChange={value => setDraft(current => ({ ...current, category: value, value: null }))}
            disabled={disabled}
          >
            <SelectTrigger
              id={ids.category}
              className="h-10 bg-white"
              aria-invalid={missing.category}
              aria-describedby={missing.category ? ids.categoryError : undefined}
            >
              <SelectValue placeholder={t('Select')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {t(CATEGORY_TEXT[category])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RuleError
            id={ids.categoryError}
            show={missing.category}
            message={ENGAGEMENT_FALLBACK_ONLY.ruleCategoryRequired}
          />
        </div>
        <span
          aria-hidden
          className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-sm font-semibold text-slate-500"
        >
          {ENGAGEMENT_FALLBACK_ONLY.equals}
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={ids.value} className="text-[13px] font-medium text-slate-700">
            {t('Value')}
          </label>
          {search ? (
            <LookupSearch
              key={search}
              id={ids.value}
              label={t('Value')}
              placeholder={t('Select')}
              clearLabel={t('Clear')}
              cacheKey={`engagement-search:${search}`}
              minLength={0}
              maxResults={MAX_RESULTS}
              selected={draft.value}
              search={runSearch}
              onSelect={option => setDraft(current => ({ ...current, value: option }))}
            />
          ) : (
            <Select
              value={draft.value ? String(draft.value.id) : ''}
              onValueChange={value => {
                const item = options.data?.find(option => String(option.id) === value)
                setDraft(current => ({
                  ...current,
                  value: item ? { id: item.id, label: item.description ?? '' } : null,
                }))
              }}
              disabled={disabled || !dropdown || options.status !== 'success'}
            >
              <SelectTrigger
                id={ids.value}
                className="h-10 bg-white"
                aria-invalid={options.status === 'error' || missing.value}
                aria-describedby={missing.value ? ids.valueError : undefined}
              >
                <SelectValue placeholder={dropdown ? t('Select') : t('None')} />
              </SelectTrigger>
              <SelectContent>
                {(options.data ?? []).map(option => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <RuleError
            id={ids.valueError}
            show={missing.value}
            message={ENGAGEMENT_FALLBACK_ONLY.ruleValueRequired}
          />
          {options.status === 'error' ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {ENGAGEMENT_FALLBACK_ONLY.lookupFailed}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={add} disabled={disabled} className={ADD_BUTTON_CLASS}>
          <Plus aria-hidden className={ADD_ICON_CLASS} />
          {t('Add')}
        </button>
      </div>

      {constraints.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          {ENGAGEMENT_FALLBACK_ONLY.noRules}
        </p>
      ) : (
        <div className="max-h-72 scroll-pt-10 overflow-auto rounded-md border border-border">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide uppercase">
                <th scope="col" className={`sticky top-0 z-10 px-3 py-2 text-white ${NAV_BAND_CELL}`}>
                  {t('Include')}
                </th>
                <th scope="col" className={`sticky top-0 z-10 px-3 py-2 text-white ${NAV_BAND_CELL}`}>
                  {t('Category')}
                </th>
                <th scope="col" className={`sticky top-0 z-10 w-8 px-3 py-2 text-white ${NAV_BAND_CELL}`}>
                  <span className="sr-only">{ENGAGEMENT_FALLBACK_ONLY.equals}</span>
                </th>
                <th scope="col" className={`sticky top-0 z-10 px-3 py-2 text-white ${NAV_BAND_CELL}`}>
                  {t('Value')}
                </th>
                <th scope="col" className={`sticky top-0 z-10 w-12 px-3 py-2 text-white ${NAV_BAND_CELL}`}>
                  <span className="sr-only">{t('Delete')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {constraints.map((constraint, index) => (
                <tr
                  key={`${constraint.category}:${constraint.value}`}
                  className="animate-row-in hover:bg-slate-50 motion-reduce:animate-none"
                >
                  <td className="border-b border-border px-3 py-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        constraint.isInclude
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700',
                      )}
                    >
                      {constraint.isInclude ? t('Include') : t('Exclude')}
                    </span>
                  </td>
                  <td className="border-b border-border px-3 py-2 text-slate-700">
                    {categoryLabel(constraint.category)}
                  </td>
                  <td className="border-b border-border px-3 py-2 text-slate-500">
                    {ENGAGEMENT_FALLBACK_ONLY.equals}
                  </td>
                  <td className="border-b border-border px-3 py-2 font-medium text-foreground">
                    {constraint.valueDescription ?? constraint.value}
                  </td>
                  <td className="border-b border-border px-2 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={disabled}
                      aria-label={`${t('Delete')} ${constraint.valueDescription ?? constraint.value}`}
                      className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                    >
                      <MinusCircle aria-hidden className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RuleError({ id, show, message }: { id: string; show: boolean; message: string }) {
  return show ? (
    <p id={id} className="text-xs font-medium text-destructive">
      {message}
    </p>
  ) : null
}
