'use client'

import { Copy, RefreshCw, Save, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  Button,
  Checkbox,
  DateRangeField,
  Dialog,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { EngagementModelGridItem } from '@/types/engagement'
import { ENGAGEMENT_FALLBACK_ONLY, type EngagementText } from '../engagement-text'
import { canSaveModel, formatDate, type AddModelForm } from './engagement-models'

function ChoiceCard({
  id,
  name,
  checked,
  title,
  help,
  icon,
  onSelect,
}: {
  id: string
  name: string
  checked: boolean
  title: string
  help: string
  icon?: ReactNode
  onSelect: () => void
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-[border-color,background-color,box-shadow] duration-200 focus-within:ring-2 focus-within:ring-ring',
        checked
          ? 'border-brand bg-brand/[0.04] shadow-[0_0_0_3px_rgba(21,102,162,.08)]'
          : 'border-border hover:border-slate-300',
      )}
    >
      <input id={id} name={name} type="radio" checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          'size-4 shrink-0 rounded-full border transition-[border-width,border-color] duration-200',
          checked ? 'border-[5px] border-brand' : 'border-slate-300',
        )}
      />
      {icon}
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{help}</span>
      </span>
    </label>
  )
}

const PRIMARY =
  'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-brand)_85%,white)_0%,var(--color-brand)_55%,color-mix(in_srgb,var(--color-brand)_88%,black)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_4px_12px_-4px_rgba(21,102,162,.45)] hover:brightness-105'

// seats-admin-engagement-crud.html:44-83.
export function AddModelDialog({
  models,
  pending,
  t,
  onSave,
  onClose,
}: {
  models: readonly EngagementModelGridItem[]
  pending: boolean
  t: EngagementText
  onSave: (form: AddModelForm) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<AddModelForm>({ modelName: '', copy: false, modelIdToClone: null })
  const [nameMissing, setNameMissing] = useState(false)
  const needsModel = !canSaveModel(form)

  const save = () => {
    if (!form.modelName) {
      setNameMissing(true)
      return
    }
    if (canSaveModel(form)) onSave(form)
  }

  return (
    <Dialog
      open
      onOpenChange={open => (open || pending ? undefined : onClose())}
      title={t('AddNewModel')}
      description={ENGAGEMENT_FALLBACK_ONLY.addHelp}
      closeLabel={t('Cancel')}
      footer={
        <>
          <Button variant="outline" size="sm" disabled={pending} onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            size="sm"
            type="submit"
            form="add-model-form"
            disabled={needsModel}
            aria-describedby={needsModel ? 'model-to-copy-hint' : undefined}
            loading={pending}
            className={PRIMARY}
          >
            <Save aria-hidden className="size-4" />
            {t('Save')}
          </Button>
        </>
      }
    >
      <form
        id="add-model-form"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          if (!pending) save()
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="model-name" className="text-[13px] font-medium text-slate-700">
            {t('Name')}
          </label>
          <Input
            id="model-name"
            value={form.modelName}
            maxLength={200}
            autoFocus
            aria-invalid={nameMissing}
            aria-describedby={nameMissing ? 'model-name-error' : undefined}
            onChange={event => {
              setForm({ ...form, modelName: event.target.value })
              setNameMissing(false)
            }}
            className={cn('h-10 bg-white', nameMissing && 'border-destructive')}
          />
          {nameMissing ? (
            <p
              id="model-name-error"
              role="alert"
              className="animate-rise-in text-xs font-medium text-destructive motion-reduce:animate-none"
            >
              {t('NameIsRequired')}
            </p>
          ) : null}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{t('Option')}</legend>
          <ChoiceCard
            id="model-default"
            name="add-model-option"
            checked={!form.copy}
            title={t('DefaultSetup')}
            help={ENGAGEMENT_FALLBACK_ONLY.defaultHelp}
            icon={<Sparkles aria-hidden className="size-4 text-brand" />}
            onSelect={() => setForm({ ...form, copy: false, modelIdToClone: null })}
          />
          <ChoiceCard
            id="model-copy"
            name="add-model-option"
            checked={form.copy}
            title={t('CopyExisting')}
            help={ENGAGEMENT_FALLBACK_ONLY.copyHelp}
            icon={<Copy aria-hidden className="size-4 text-brand" />}
            onSelect={() => setForm({ ...form, copy: true })}
          />
        </fieldset>
        {form.copy ? (
          <div className="flex animate-rise-in flex-col gap-1.5 motion-reduce:animate-none">
            <label htmlFor="model-to-copy" className="text-[13px] font-medium text-slate-700">
              {t('Models')}
            </label>
            <Select
              value={form.modelIdToClone === null ? undefined : String(form.modelIdToClone)}
              onValueChange={value => setForm({ ...form, modelIdToClone: Number(value) })}
            >
              <SelectTrigger
                id="model-to-copy"
                className="h-10 bg-white"
                aria-describedby={needsModel ? 'model-to-copy-hint' : undefined}
              >
                <SelectValue placeholder={t('Select')} />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.id} value={String(model.id)}>
                    {model.modelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {needsModel ? (
              <p id="model-to-copy-hint" className="text-xs text-muted-foreground">
                {ENGAGEMENT_FALLBACK_ONLY.copyNeedsModel}
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    </Dialog>
  )
}

// seats-admin-engagement-recalculate.html:41-86; dates default to today.
export function RecalculateDialog({
  selected,
  pending,
  t,
  onRun,
  onClose,
}: {
  selected: readonly EngagementModelGridItem[]
  pending: boolean
  t: EngagementText
  onRun: (selectAll: boolean, reSyncStudents: boolean, start: Date, end: Date) => void
  onClose: () => void
}) {
  const [selectAll, setSelectAll] = useState(true)
  const [reSync, setReSync] = useState(false)
  const [range, setRange] = useState(() => ({ start: new Date(), end: new Date() }))
  const activeCount = selected.filter(model => model.isActive).length
  const selectedTitle = `${t('Selected')} (${selected.length})`
  const activeTitle = `${t('ActiveModelsInSelection')} (${activeCount})`

  return (
    <Dialog
      open
      onOpenChange={open => (open || pending ? undefined : onClose())}
      title={t('ReCalculateModels')}
      description={ENGAGEMENT_FALLBACK_ONLY.recalcHelp}
      closeLabel={t('Cancel')}
      footer={
        <>
          <Button variant="outline" size="sm" disabled={pending} onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            size="sm"
            loading={pending}

            className={PRIMARY}
            onClick={() => onRun(selectAll, reSync, range.start, range.end)}
          >
            <RefreshCw
              aria-hidden
              className={cn('size-4', pending && 'animate-spin motion-reduce:animate-none')}
            />
            {t('Run')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t('Option')}</legend>
          <ChoiceCard
            id="recalc-selected"
            name="recalc-models"
            checked={selectAll}
            title={selectedTitle}
            help={ENGAGEMENT_FALLBACK_ONLY.selectedHelp}
            onSelect={() => setSelectAll(true)}
          />
          {activeCount > 0 ? (
            <ChoiceCard
              id="recalc-active"
              name="recalc-models"
              checked={!selectAll}
              title={activeTitle}
              help={ENGAGEMENT_FALLBACK_ONLY.activeHelp}
              onSelect={() => setSelectAll(false)}
            />
          ) : null}
        </fieldset>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-foreground">
          <Checkbox
            checked={reSync}
            onCheckedChange={() => setReSync(value => !value)}
            label={t('ReSyncStudents')}
          />
          <span aria-hidden>{t('ReSyncStudents')}</span>
        </label>
        <DateRangeField
          id="recalc-range"
          start={range.start}
          end={range.end}
          onChange={(start, end) => setRange({ start, end })}
          formatDate={formatDate}
          labels={{
            dateRange: t('DateRange'),
            startDate: t('From'),
            endDate: t('To'),
            close: ENGAGEMENT_FALLBACK_ONLY.close,
            cancel: t('Cancel'),
            selectRange: t('SelectRange'),
            chooseMonthYear: ENGAGEMENT_FALLBACK_ONLY.chooseMonthYear,
            previous: t('Previous'),
            next: t('Next'),
            today: t('Today'),
            last7Days: ENGAGEMENT_FALLBACK_ONLY.last7Days,
            last14Days: ENGAGEMENT_FALLBACK_ONLY.last14Days,
            last30Days: ENGAGEMENT_FALLBACK_ONLY.last30Days,
          }}
        />
      </div>
    </Dialog>
  )
}
