'use client'

import { Check, Cloud, Eye, EyeOff, KeySquare, Lock } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { api } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { SettingDto } from '@/types/settings'
import { SaveToast } from '../shared/SaveToast'
import { SettingsCard, SettingsField } from '../shared/SettingsCard'
import {
  FormStatusPill,
  FRAME_EN,
  SaveActions,
  SettingsBody,
  SettingsGate,
  SettingsLayout,
  useSaveShortcut,
} from '../shared/SettingsFrame'
import { useObjectForm } from '../shared/use-object-form'
import { useScreenText } from '../shared/use-screen-text'
import {
  buildGraphPayload,
  GRAPH_KEYS,
  graphValue,
  MASKED_KEY,
  mergeEnabled,
  setGraphValue,
  type GraphField,
} from './graph-api-form'

const ACCESS = { item: PermissionItem.Settings, action: PermissionAction.Contacts }
const EDIT = { item: PermissionItem.Settings, action: PermissionAction.Edit }

// Keys from seats-admin-graphapi.html:172-179.
const TEXT = {
  Enabled: 'Enabled',
  TenantId: 'Tenant ID',
  ClientId: 'Client ID',
  Key: 'Key',
  Save: 'Save',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
} as const

const EN = {
  // The tab label is hard-coded "GraphAPI" in legacy.
  title: 'Graph API',
  connection: 'Microsoft Graph connection',
  connectionHint: 'Azure app registration used to read Microsoft 365 data',
  yes: 'Yes',
  no: 'No',
  enabledHint: 'Worked out by the server: on when all three values below are filled.',
  tenantHint: 'Azure tenant ID',
  clientHint: 'Azure app registration ID',
  keyHint: 'Azure app registration secret. The saved value is never shown; type a new one to replace it.',
  show: 'Show key',
  hide: 'Hide key',
  needsEdit: 'Graph API settings need the Settings edit permission.',
  stepDone: 'Filled in',
  progress: (done: number, total: number) => `${done} of ${total} complete`,
} as const

// The server turns the connection on only when all three are filled, so the page is shaped as three steps.
const STEPS: readonly { field: GraphField; label: keyof typeof TEXT; hint: string }[] = [
  { field: 'tenantId', label: 'TenantId', hint: EN.tenantHint },
  { field: 'clientId', label: 'ClientId', hint: EN.clientHint },
  { field: 'apiKey', label: 'Key', hint: EN.keyHint },
]

const loadGraphSettings = (signal: AbortSignal) => api.get<SettingDto[]>('GraphApi', { signal })

async function saveGraphSettings(settings: SettingDto[]) {
  const enabled = await api.put<SettingDto | null>('GraphApi', { body: buildGraphPayload(settings) })
  return mergeEnabled(settings, enabled)
}

export function GraphApiScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <GraphApiGuard />
    </SettingsGate>
  )
}

// Both GraphApi calls demand Settings + Edit (GraphApiController.cs:26,91) although the page only needs Contacts.
function GraphApiGuard() {
  const profile = useProfile()
  if (profile.can(EDIT)) return <GraphApiWorkspace />
  return (
    <SettingsLayout
      sectionId="graph-api"
      title={EN.title}
      meta={<FormStatusPill canEdit={false} dirty={false} />}
    >
      <div className="grid flex-1 place-items-center p-6">
        <p
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <Lock aria-hidden className="size-4 text-amber-700" />
          {EN.needsEdit}
        </p>
      </div>
    </SettingsLayout>
  )
}

// How far the three values are from switching the connection on.
function GraphProgress({
  done,
  total,
  enabled,
  label,
}: {
  done: number
  total: number
  enabled: boolean
  label: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
      <span className="text-[13px] font-semibold text-slate-700">{EN.progress(done, total)}</span>
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full bg-brand transition-[width] duration-500 ease-premium motion-reduce:transition-none"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors',
          enabled
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-slate-50 text-slate-600 ring-slate-200',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'size-2 rounded-full',
            enabled ? 'animate-soft-pulse bg-emerald-500 motion-reduce:animate-none' : 'bg-slate-400',
          )}
        />
        {label}
      </span>
    </div>
  )
}

// One numbered step; the marker becomes a tick once its value is filled in.
function GraphStep({ step, done, children }: { step: number; done: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-4 transition-colors duration-300',
        done && 'bg-emerald-50/40',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-colors duration-300',
          done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-500 bg-white text-slate-500',
        )}
      >
        {done ? <Check className="size-3.5" /> : step}
      </span>
      <span className="sr-only">{done ? EN.stepDone : null}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function GraphApiWorkspace() {
  const t = useScreenText(TEXT)
  const [showKey, setShowKey] = useState(false)
  const form = useObjectForm({
    key: 'settings-graph-api',
    load: loadGraphSettings,
    submit: saveGraphSettings,
    successMessage: t('AlertSaveSucceededDefault'),
    errorMessage: t('AlertSaveErrorDefault'),
  })
  const settings = form.values
  useSaveShortcut(settings !== null, form.save)

  const set = (key: string, value: string) => form.update(current => setGraphValue(current, key, value))
  const enabled = settings ? graphValue(settings, GRAPH_KEYS.enabled) === 'Yes' : false
  const keyValue = settings ? graphValue(settings, GRAPH_KEYS.apiKey) : ''
  const enabledLabel = `${t('Enabled')}: ${enabled ? EN.yes : EN.no}`
  const filled = (field: GraphField) =>
    settings ? graphValue(settings, GRAPH_KEYS[field]).trim().length > 0 : false
  const doneCount = STEPS.filter(step => filled(step.field)).length

  return (
    <SettingsLayout
      sectionId="graph-api"
      title={EN.title}
      meta={<FormStatusPill canEdit dirty={form.dirty} />}
      actions={
        settings ? (
          <SaveActions
            dirty={form.dirty}
            saving={form.saving}
            saveLabel={t('Save')}
            onSave={() => void form.save()}
            onDiscard={form.reload}
          />
        ) : null
      }
    >
      <SaveToast notice={form.notice} onDismiss={form.dismissNotice} dismissLabel={FRAME_EN.dismiss} />
      <SettingsBody error={form.read.error} status={form.read.status} onRetry={form.reload}>
        {settings ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <GraphProgress done={doneCount} total={STEPS.length} enabled={enabled} label={enabledLabel} />
            <SettingsCard icon={Cloud} title={EN.connection} hint={EN.connectionHint}>
              <p className="bg-slate-50 px-4 py-2.5 text-xs text-slate-500">{EN.enabledHint}</p>
              {STEPS.slice(0, 2).map(({ field, label, hint }, index) => (
                <GraphStep key={field} step={index + 1} done={filled(field)}>
                  <SettingsField
                    htmlFor={`graph-${field}`}
                    label={t(label)}
                    hint={hint}
                    className="px-0 py-0"
                  >
                    <Input
                      id={`graph-${field}`}
                      value={graphValue(settings, GRAPH_KEYS[field])}
                      disabled={form.saving}
                      spellCheck={false}
                      autoComplete="off"
                      onChange={event => set(GRAPH_KEYS[field], event.target.value)}
                      className="h-9 w-full bg-white font-mono text-[13px]"
                    />
                  </SettingsField>
                </GraphStep>
              ))}
              <GraphStep step={3} done={filled('apiKey')}>
                <SettingsField
                  htmlFor="graph-apiKey"
                  label={t('Key')}
                  hint={EN.keyHint}
                  className="px-0 py-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <KeySquare
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
                      />
                      <Input
                        id="graph-apiKey"
                        type={showKey && keyValue !== MASKED_KEY ? 'text' : 'password'}
                        value={keyValue}
                        disabled={form.saving}
                        spellCheck={false}
                        autoComplete="new-password"
                        onChange={event => set(GRAPH_KEYS.apiKey, event.target.value)}
                        className="h-9 w-full bg-white pl-9 font-mono text-[13px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKey(value => !value)}
                      disabled={keyValue === MASKED_KEY || !keyValue}
                      aria-label={showKey ? EN.hide : EN.show}
                      title={showKey ? EN.hide : EN.show}
                      aria-pressed={showKey}
                      className="lift-bloom lift-icon grid size-9 shrink-0 place-items-center rounded-md border border-input bg-white text-slate-500 transition-[color,border-color,transform] hover:border-brand/80 hover:text-brand focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-40"
                    >
                      {showKey ? (
                        <EyeOff aria-hidden className="size-4" />
                      ) : (
                        <Eye aria-hidden className="size-4" />
                      )}
                    </button>
                  </div>
                </SettingsField>
              </GraphStep>
            </SettingsCard>
          </div>
        ) : null}
      </SettingsBody>
    </SettingsLayout>
  )
}
