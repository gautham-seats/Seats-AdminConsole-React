'use client'

import { Check, Copy, Globe, KeyRound, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { AuthenticationDto } from '@/types/authentication'
import { ChoiceGroup } from '../shared/ChoiceGroup'
import { SaveToast } from '../shared/SaveToast'
import { SettingsCard, SettingsField } from '../shared/SettingsCard'
import {
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
  AUTHENTICATION_BY,
  PERSONAS,
  PROTOCOLS,
  setDomainField,
  TEXT_MAX_LENGTH,
  usesOtherProvider,
  type AuthenticationTextField,
  type DomainTextField,
} from './authentication-form'
import { StatusBadge } from '@/shared/ui/StatusBadge'

const ACCESS = { item: PermissionItem.ConfigureAuthentication, action: PermissionAction.Access }

// Keys from seats-admin-authentication.html:348-365; values are English fallbacks.
const TEXT = {
  Authentication: 'Authentication',
  AuthenticationBy: 'Authentication by',
  AuthenticationProtocol: 'Authentication protocol',
  ClaimBasedAuthorisation: 'Claim based authorisation',
  SpecificUserClaim: 'Specific user claim',
  SpecificGroupClaim: 'Specific group claim',
  HomeRealm: 'Home realm',
  SpecificLogoutUrl: 'Specific logout URL',
  Url: 'URL',
  Thumbprint: 'Thumbprint',
  FederationMetadata: 'Federation metadata',
  Realm: 'Realm',
  IdentityIssuer: 'Identity issuer',
  IssuerAuthority: 'Issuer authority',
  Save: 'Save',
  Cancel: 'Cancel',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
} as const

const EN = {
  signIn: 'Sign-in method',
  signInHint: 'Who signs users in to SEAtS',
  provider: 'Identity provider',
  providerHint: 'Settings for your own sign-in service',
  site: 'Site',
  siteHint: 'Sign-in details for this site',
  seatsNote: 'SEAtS signs users in. No extra settings are needed.',
  // seats-admin-authentication.html:376, not a resource key in legacy.
  saved: 'Settings successfully updated.',
  copy: 'Copy',
  copied: 'Copied',
} as const

const TEXT_FIELDS: readonly { field: AuthenticationTextField; label: keyof typeof TEXT; link?: boolean }[] = [
  { field: 'SpecificUserIdentifierClaim', label: 'SpecificUserClaim' },
  { field: 'SpecificGroupClaim', label: 'SpecificGroupClaim' },
  { field: 'AuthHomeRealm', label: 'HomeRealm' },
  { field: 'AuthSpecificLogoutUrl', label: 'SpecificLogoutUrl', link: true },
]

const DOMAIN_FIELDS: readonly DomainTextField[] = [
  'Thumbprint',
  'FederationMetadata',
  'Realm',
  'IdentityIssuer',
  'IssuerAuthority',
]

const loadAuthentication = (signal: AbortSignal) =>
  api.get<AuthenticationDto>('AuthenticationApi/', { signal })
const saveAuthentication = (model: AuthenticationDto) =>
  api.put<AuthenticationDto>('AuthenticationApi/', { body: model })

export function AuthenticationScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <AuthenticationWorkspace />
    </SettingsGate>
  )
}

function AuthenticationWorkspace() {
  const t = useScreenText(TEXT)
  const form = useObjectForm({
    key: 'settings-authentication',
    load: loadAuthentication,
    submit: saveAuthentication,
    successMessage: EN.saved,
    errorMessage: t('AlertSaveErrorDefault'),
  })
  const model = form.values
  const locked = form.saving
  useSaveShortcut(model !== null, form.save)

  return (
    <SettingsLayout
      sectionId="authentication"
      title={t('Authentication')}
      meta={
        form.dirty ? (
          <StatusBadge tone="warning" pulse className="animate-fade-in">
            {FRAME_EN.unsaved}
          </StatusBadge>
        ) : null
      }
      actions={
        model ? (
          <SaveActions
            dirty={form.dirty}
            saving={form.saving}
            saveLabel={t('Save')}
            discardLabel={t('Cancel')}
            onSave={() => void form.save()}
            onDiscard={form.reload}
            alwaysShowDiscard
          />
        ) : null
      }
    >
      <SaveToast notice={form.notice} onDismiss={form.dismissNotice} dismissLabel={FRAME_EN.dismiss} />
      <SettingsBody error={form.read.error} status={form.read.status} onRetry={form.reload}>
        {model ? (
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <SettingsCard icon={KeyRound} title={EN.signIn} hint={EN.signInHint}>
              <SettingsField
                htmlFor="auth-authentication-by"
                labelId="auth-authentication-by-label"
                label={t('AuthenticationBy')}
              >
                <ChoiceGroup
                  id="auth-authentication-by"
                  label={t('AuthenticationBy')}
                  labelledBy="auth-authentication-by-label"
                  value={model.AuthenticationBy}
                  choices={AUTHENTICATION_BY.map(value => ({ value, label: value }))}
                  disabled={locked}
                  onChange={value => form.update(current => ({ ...current, AuthenticationBy: value }))}
                />
                {!usesOtherProvider(model) ? (
                  <p className="mt-3 flex animate-fade-in items-center gap-2 text-sm text-slate-600 motion-reduce:animate-none">
                    <ShieldCheck aria-hidden className="size-4 text-emerald-600" />
                    {EN.seatsNote}
                  </p>
                ) : null}
              </SettingsField>
            </SettingsCard>

            {usesOtherProvider(model) ? (
              <>
                <SettingsCard icon={ShieldCheck} title={EN.provider} hint={EN.providerHint} delay={60}>
                  <div className="grid gap-x-2 md:grid-cols-2">
                    <SettingsField
                      htmlFor="auth-protocol"
                      labelId="auth-protocol-label"
                      label={t('AuthenticationProtocol')}
                    >
                      <ChoiceGroup
                        id="auth-protocol"
                        label={t('AuthenticationProtocol')}
                        labelledBy="auth-protocol-label"
                        value={model.AuthProtocol}
                        choices={PROTOCOLS}
                        disabled={locked}
                        onChange={value => form.update(current => ({ ...current, AuthProtocol: value }))}
                      />
                    </SettingsField>
                    <SettingsField
                      htmlFor="auth-personas"
                      labelId="auth-personas-label"
                      label={t('ClaimBasedAuthorisation')}
                    >
                      <ChoiceGroup
                        id="auth-personas"
                        label={t('ClaimBasedAuthorisation')}
                        labelledBy="auth-personas-label"
                        value={model.SeatsAuthorisationByPersonas}
                        choices={PERSONAS}
                        disabled={locked}
                        onChange={value =>
                          form.update(current => ({ ...current, SeatsAuthorisationByPersonas: value }))
                        }
                      />
                    </SettingsField>
                    {TEXT_FIELDS.map(({ field, label, link }) => (
                      <SettingsField key={field} htmlFor={`auth-${field}`} label={t(label)} link={link}>
                        <Input
                          id={`auth-${field}`}
                          value={model[field] ?? ''}
                          maxLength={TEXT_MAX_LENGTH}
                          disabled={locked}
                          spellCheck={false}
                          onChange={event => {
                            const value = event.target.value
                            form.update(current => ({ ...current, [field]: value }))
                          }}
                          className="h-9 w-full bg-white"
                        />
                      </SettingsField>
                    ))}
                  </div>
                </SettingsCard>

                {(model.Domains ?? []).map((domain, index) => (
                  <SettingsCard
                    key={`${domain.Id}-${domain.SiteTypeId}`}
                    icon={Globe}
                    title={domain.SiteType || EN.site}
                    hint={EN.siteHint}
                    delay={120 + index * 40}
                  >
                    <div className="grid gap-x-2 md:grid-cols-2">
                      <SettingsField
                        htmlFor={`domain-url-${domain.Id}-${domain.SiteTypeId}`}
                        label={t('Url')}
                        link
                        className="md:col-span-2"
                      >
                        <ReadOnlyValue
                          id={`domain-url-${domain.Id}-${domain.SiteTypeId}`}
                          value={domain.Url ?? ''}
                        />
                      </SettingsField>
                      {DOMAIN_FIELDS.map(field => {
                        const id = `domain-${field}-${domain.Id}-${domain.SiteTypeId}`
                        return (
                          <SettingsField key={field} htmlFor={id} label={t(field)}>
                            <Input
                              id={id}
                              value={domain[field] ?? ''}
                              disabled={locked}
                              spellCheck={false}
                              onChange={event => {
                                const value = event.target.value
                                form.update(current => setDomainField(current, index, field, value))
                              }}
                              className="h-9 w-full bg-white font-mono text-[13px]"
                            />
                          </SettingsField>
                        )
                      })}
                    </div>
                  </SettingsCard>
                ))}
              </>
            ) : null}
          </div>
        ) : null}
      </SettingsBody>
    </SettingsLayout>
  )
}

function ReadOnlyValue({ id, value }: { id: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    [],
  )
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        value={value}
        readOnly
        className="h-9 w-full bg-slate-50 font-mono text-[13px] text-slate-600"
      />
      <button
        type="button"
        onClick={() => void copy()}
        disabled={!value}
        aria-label={copied ? EN.copied : EN.copy}
        title={copied ? EN.copied : EN.copy}
        className={cn(
          'lift-bloom lift-icon grid size-9 shrink-0 place-items-center rounded-md border border-input bg-white text-slate-500 transition-[color,border-color,transform] hover:border-brand/80 hover:text-brand focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-40',
          copied && 'border-emerald-300 text-emerald-600',
        )}
      >
        {copied ? (
          <Check aria-hidden className="size-4 animate-zoom-in" />
        ) : (
          <Copy aria-hidden className="size-4" />
        )}
      </button>
    </div>
  )
}
