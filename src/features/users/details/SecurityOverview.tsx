'use client'

import { ChevronRight } from 'lucide-react'
import { Checkbox } from '@/shared/ui'
import type { SecurityLevel } from '@/types/users'
import type { UsersTextKey } from '../index/users-text'
import { SECURITY_LEVELS } from './security-levels'

export const LEVEL_LABELS: Record<SecurityLevel, UsersTextKey> = {
  school: 'Schools',
  course: 'Courses',
  module: 'Modules',
  programme: 'Programmes',
  faculty: 'Faculties',
  student: 'Students',
}

export type SecurityOverviewProps = {
  isSuperUser: boolean
  isOwnClasses: boolean
  levelOverview: Record<SecurityLevel, string | null>
  showLecturerVisibility: boolean
  t: (key: UsersTextKey) => string
  onSuperUserChange: (value: boolean) => void
  onOwnClassesChange: (value: boolean) => void
  onOpenLevel: (level: SecurityLevel) => void
}

const ROW =
  'grid grid-cols-1 items-center gap-1 border-b border-border py-2.5 last:border-0 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] sm:gap-0'

// Views/User/Details.cshtml:190-272: super user makes every level read-only and disables lecturer visibility.
export function SecurityOverview({
  isSuperUser,
  isOwnClasses,
  levelOverview,
  showLecturerVisibility,
  t,
  onSuperUserChange,
  onOwnClassesChange,
  onOpenLevel,
}: SecurityOverviewProps) {
  return (
    <div className="text-sm">
      <div className={ROW}>
        <label htmlFor="user-super-user" className="cursor-pointer text-muted-foreground">
          {t('IsSuperUser')}
        </label>
        <Checkbox
          id="user-super-user"
          checked={isSuperUser}
          onCheckedChange={() => onSuperUserChange(!isSuperUser)}
          label={t('IsSuperUser')}
        />
      </div>
      {showLecturerVisibility ? (
        <div className={ROW}>
          <label htmlFor="user-lecturer-visibility" className="text-muted-foreground">
            {t('LecturerVisibility')}
          </label>
          <Checkbox
            id="user-lecturer-visibility"
            checked={isOwnClasses}
            disabled={isSuperUser}
            onCheckedChange={() => onOwnClassesChange(!isOwnClasses)}
            label={t('LecturerVisibility')}
          />
        </div>
      ) : null}
      {SECURITY_LEVELS.map(level => {
        const value = levelOverview[level]
        const text = value && value.trim() ? value : t('None')
        const label = t(LEVEL_LABELS[level])
        return (
          <div key={level} className={ROW}>
            <span className="text-muted-foreground">{label}</span>
            {isSuperUser ? (
              <span className="truncate text-foreground" title={text}>
                {text}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onOpenLevel(level)}
                aria-label={`${label}: ${text}`}
                title={text}
                className="group -ml-2 flex max-w-full items-center gap-1 justify-self-start rounded-md px-2 py-1 text-left text-brand transition-colors duration-150 hover:bg-brand/[0.06] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="truncate underline-offset-4 group-hover:underline">{text}</span>
                <ChevronRight
                  aria-hidden
                  className="size-3.5 shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
