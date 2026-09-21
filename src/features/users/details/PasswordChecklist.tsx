'use client'

import { Check, Circle } from 'lucide-react'
import { cn } from '@/shared/ui/cn'
import { USERS_FALLBACK_ONLY } from '../index/users-text'

export type PasswordRule = {
  key: 'length' | 'upper' | 'lower' | 'digit' | 'symbol' | 'notUserName' | 'match'
  met: boolean
}

// The same rule set as isStrongPassword + passwordUserNameMatches (swapp.js:2586-2618), shown live.
export function passwordRules(password: string, confirmation: string, userName: string): PasswordRule[] {
  return [
    { key: 'length', met: password.length >= 10 },
    { key: 'upper', met: /[A-Z]/.test(password) },
    { key: 'lower', met: /[a-z]/.test(password) },
    { key: 'digit', met: /\d/.test(password) },
    { key: 'symbol', met: /[^a-zA-Z0-9]/.test(password) },
    { key: 'notUserName', met: password !== '' && (userName === '' || !password.includes(userName)) },
    { key: 'match', met: password !== '' && confirmation === password },
  ]
}

const LABEL: Record<PasswordRule['key'], string> = {
  length: USERS_FALLBACK_ONLY.ruleLength,
  upper: USERS_FALLBACK_ONLY.ruleUpper,
  lower: USERS_FALLBACK_ONLY.ruleLower,
  digit: USERS_FALLBACK_ONLY.ruleDigit,
  symbol: USERS_FALLBACK_ONLY.ruleSymbol,
  notUserName: USERS_FALLBACK_ONLY.ruleNotUserName,
  match: USERS_FALLBACK_ONLY.ruleMatch,
}

export function PasswordChecklist({ rules }: { rules: readonly PasswordRule[] }) {
  return (
    <ul
      aria-label={USERS_FALLBACK_ONLY.passwordRulesLabel}
      className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2"
    >
      {rules.map(rule => (
        <li
          key={rule.key}
          data-met={rule.met}
          className={cn(
            'flex items-center gap-2 text-xs transition-colors duration-200 ease-premium',
            rule.met ? 'text-emerald-700' : 'text-muted-foreground',
          )}
        >
          {rule.met ? (
            <Check aria-hidden className="size-3.5 shrink-0 animate-rise-in motion-reduce:animate-none" />
          ) : (
            <Circle aria-hidden className="size-3.5 shrink-0 opacity-50" />
          )}
          <span>{LABEL[rule.key]}</span>
        </li>
      ))}
    </ul>
  )
}
