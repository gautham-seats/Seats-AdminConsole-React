'use client'

import { ArchiveRestore, ClipboardCheck, Trash2, UserX } from 'lucide-react'
import Link from 'next/link'
import {
  MANUAL_STUDENT_DELETION_ROUTE,
  STUDENT_DELETION_ROUTE,
  STUDENT_RECYCLE_BIN_ROUTE,
} from '@/shared/shell/admin-menu'
import { cn } from '@/shared/ui/cn'
import { daysUntil, formatDate } from './student-list'

const EN = {
  journey: 'Student deletion steps',
  steps: [
    {
      id: 'student-delete',
      title: 'Requested',
      hint: 'Students asked to be deleted',
      href: STUDENT_DELETION_ROUTE,
      icon: ClipboardCheck,
    },
    {
      id: 'student-manual-deletion',
      title: 'Chosen by an admin',
      hint: 'Delete any student directly',
      href: MANUAL_STUDENT_DELETION_ROUTE,
      icon: UserX,
    },
    {
      id: 'student-recycle-bin',
      title: 'Recycle bin',
      hint: 'Restore until the deletion date',
      href: STUDENT_RECYCLE_BIN_ROUTE,
      icon: ArchiveRestore,
    },
  ],
  deleted: 'Deleted for good',
  deletedHint: 'After the deletion date',
  today: 'today',
  inDays: (days: number) => `in ${days} ${days === 1 ? 'day' : 'days'}`,
  daysAgo: (days: number) => `${days} ${days === 1 ? 'day' : 'days'} ago`,
} as const

// Where each screen sits in the GDPR flow; purely navigational.
export function StudentJourney({ active }: { active: string }) {
  return (
    <nav aria-label={EN.journey} className="animate-rise-in motion-reduce:animate-none">
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {EN.steps.map((step, index) => {
          const Icon = step.icon
          const current = step.id === active
          return (
            <li key={step.id} className="relative">
              <Link
                href={step.href}
                aria-current={current ? 'page' : undefined}
                style={{ animationDelay: `${index * 50}ms` }}
                className={cn(
                  'group flex h-full animate-rise-in items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-[border-color,background-color,box-shadow,transform] duration-300 outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:animate-none motion-reduce:hover:translate-y-0',
                  current
                    ? 'border-brand/30 bg-brand/[0.06] shadow-[0_8px_20px_-14px_rgba(21,102,162,.7)]'
                    : 'border-border bg-white hover:border-brand/25 hover:shadow-sm',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-300',
                    current
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-brand/10 group-hover:text-brand',
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-[13px] font-semibold break-words',
                      current ? 'text-brand' : 'text-slate-800',
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="block text-xs break-words text-slate-600">{step.hint}</span>
                </span>
              </Link>
            </li>
          )
        })}
        <li className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3.5 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-border">
            <Trash2 aria-hidden className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold break-words text-slate-600">{EN.deleted}</span>
            <span className="block text-xs break-words text-slate-600">{EN.deletedHint}</span>
          </span>
        </li>
      </ol>
    </nav>
  )
}

// A date with how far away it is; close or passed dates stand out.
export function DueDate({
  value,
  today,
  warnDays = 3,
}: {
  value: string | null
  today: Date
  warnDays?: number
}) {
  const days = daysUntil(value, today)
  if (!value) return null
  const relative =
    days === null ? null : days === 0 ? EN.today : days > 0 ? EN.inDays(days) : EN.daysAgo(-days)
  return (
    <span className="inline-flex flex-wrap items-center gap-2 whitespace-nowrap">
      <span className="tabular-nums">{formatDate(value)}</span>
      {relative ? (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            days !== null && days < 0
              ? 'bg-red-50 text-red-700'
              : days !== null && days <= warnDays
                ? 'bg-amber-50 text-amber-800'
                : 'bg-slate-100 text-slate-600',
          )}
        >
          {relative}
        </span>
      ) : null}
    </span>
  )
}

export function PlainDate({ value }: { value: string | null }) {
  return <span className="whitespace-nowrap tabular-nums">{formatDate(value)}</span>
}
