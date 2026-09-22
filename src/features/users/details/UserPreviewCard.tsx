'use client'

import { Contact, GraduationCap, KeyRound, Mail, ShieldCheck, Smartphone, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { SettingsCard } from '@/features/settings/shared/SettingsCard'
import { cn } from '@/shared/ui/cn'
import type { SimpleListItemDto, UserDetailsViewModel } from '@/types/users'
import { USERS_FALLBACK_ONLY, type UsersTextKey } from '../index/users-text'
import { LEVEL_LABELS } from './SecurityOverview'
import { SECURITY_LEVELS } from './security-levels'
import type { UserForm } from './user-form'

type Props = {
  form: UserForm
  view: UserDetailsViewModel
  creating: boolean
  t: (key: UsersTextKey) => string
}

// Two letters from the full name, or the user name, like the account menu avatar.
function initialsOf(fullName: string, userName: string): string {
  const source = fullName.trim() || userName.trim()
  if (!source) return ''
  const parts = source.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2)
  return letters.toUpperCase()
}

const profileName = (options: readonly SimpleListItemDto[] | null, id: number | null): string | null =>
  id === null || id === 0 ? null : (options?.find(option => option.id === id)?.description ?? null)

function Line({ icon: Icon, muted, children }: { icon: typeof Mail; muted?: boolean; children: ReactNode }) {
  return (
    <li
      className={cn(
        'flex items-start gap-2.5 text-[13px] leading-5 transition-colors duration-300',
        muted ? 'text-muted-foreground' : 'text-slate-700',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  )
}

export function UserPreviewCard({ form, view, creating, t }: Props) {
  const { detail } = view
  const name = form.fullName.trim() || form.userName.trim() || USERS_FALLBACK_ONLY.previewNoName
  const initials = initialsOf(form.fullName, form.userName)
  const email = form.emailAddress.trim()
  const student = form.studentId !== null ? form.studentDescription.trim() : ''
  const personas = form.personas
    .map(row => profileName(view.accessProfileAll ?? view.accessProfileAvailables, row.accessProfileId))
    .filter((value): value is string => value !== null)
  const scopes = SECURITY_LEVELS.filter(level => form.levelOverview[level]).map(
    level => `${t(LEVEL_LABELS[level])}: ${form.levelOverview[level]}`,
  )

  return (
    <SettingsCard
      icon={Contact}
      title={USERS_FALLBACK_ONLY.userPreview}
      hint={USERS_FALLBACK_ONLY.userPreviewHint}
      delay={80}
      bodyClassName="divide-y-0"
    >
      <div className="flex items-center gap-4 px-5 pt-5 pb-4">
        <span
          aria-hidden
          className={cn(
            'grid size-14 shrink-0 place-items-center rounded-full text-lg font-semibold tracking-wide transition-colors duration-300 ease-premium',
            form.accountActive ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground',
          )}
        >
          {initials || <Users className="size-6" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] leading-6 font-semibold text-foreground">{name}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] leading-5 text-muted-foreground">
            <span className="truncate">{form.userName.trim() || t('UserName')}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors duration-300',
                form.accountActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-1.5 rounded-full',
                  form.accountActive ? 'bg-emerald-500' : 'bg-slate-400',
                )}
              />
              {form.accountActive ? USERS_FALLBACK_ONLY.previewActive : USERS_FALLBACK_ONLY.previewInactive}
            </span>
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5 border-t border-border/70 px-5 py-4">
        <Line icon={Mail} muted={!email}>
          {email || USERS_FALLBACK_ONLY.previewNoEmail}
        </Line>
        <Line icon={GraduationCap} muted={!student}>
          {student || USERS_FALLBACK_ONLY.previewNoStudent}
        </Line>
        <Line icon={Smartphone} muted={!form.isMobileAppLoggingActive}>
          {form.isMobileAppLoggingActive
            ? USERS_FALLBACK_ONLY.previewMobileOn
            : USERS_FALLBACK_ONLY.previewMobileOff}
        </Line>
      </ul>

      <div className="border-t border-border/70 px-5 py-4">
        <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-slate-600 uppercase">
          <ShieldCheck aria-hidden className="size-3.5 text-brand" />
          {detail.seatsAuthorisationByPersonas
            ? USERS_FALLBACK_ONLY.previewPersonas
            : t('SecurityLevelPermissions')}
        </p>
        {detail.seatsAuthorisationByPersonas ? (
          personas.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {personas.map((persona, index) => (
                <li
                  key={`${persona}-${index}`}
                  className="animate-rise-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-medium text-brand motion-reduce:animate-none"
                >
                  {persona}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted-foreground">{USERS_FALLBACK_ONLY.previewNoPersonas}</p>
          )
        ) : form.isSuperUser ? (
          <p className="text-[13px] text-slate-700">{USERS_FALLBACK_ONLY.previewSuperUser}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[13px] text-slate-700">
            {form.isOwnClasses ? <li>{USERS_FALLBACK_ONLY.previewOwnClasses}</li> : null}
            {scopes.map(scope => (
              <li key={scope}>{scope}</li>
            ))}
            {!form.isOwnClasses && scopes.length === 0 ? (
              <li className="text-muted-foreground">{USERS_FALLBACK_ONLY.previewNoScope}</li>
            ) : null}
          </ul>
        )}
      </div>

      {creating && detail.seatsAuthenticationByOurIdentityProvider ? (
        <p className="flex items-start gap-2 border-t border-border/70 bg-slate-50/80 px-5 py-3 text-[12px] leading-5 text-muted-foreground">
          <KeyRound aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {USERS_FALLBACK_ONLY.previewAfterSave}
        </p>
      ) : null}
    </SettingsCard>
  )
}
