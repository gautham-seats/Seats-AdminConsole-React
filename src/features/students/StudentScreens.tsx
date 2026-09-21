'use client'

import { ArchiveRestore, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { formatShortDate } from '@/shared/i18n/culture'
import { DateRangeField } from '@/shared/ui'
import type { StudentDeleteRowDto, StudentRecycleBinRowDto, StudentRowDto } from '@/types/students'
import type { TableColumn } from '@/features/settings/shared/SettingsTable'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { addDays, toCultureDate } from './shared/student-list'
import { StudentListScreen } from './shared/StudentListScreen'
import { DueDate, PlainDate, StudentJourney } from './shared/StudentParts'

const ITEM = PermissionItem.StudentsAdmin
const ACCESS = { item: ITEM, action: PermissionAction.Access }

// Keys from Views/StudentDelete, Views/Student and Views/StudentRecycleBin.
const TEXT = {
  Student: 'Student',
  StudentNumber: 'Student Number',
  Email: 'Email',
  ExpiryDate: 'Expiry Date',
  DeletionDate: 'Deletion Date',
  MovedRecycleBinDate: 'Moved to Recycle Bin',
  From: 'From',
  To: 'To',
  Close: 'Close',
  Cancel: 'Cancel',
  Previous: 'Previous',
  Next: 'Next',
  Today: 'Today',
  Delete: 'Delete',
  Restore: 'Restore',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
  RestoreConfirmationMsg: 'Are you sure you want to restore selected items?',
  AlertDeleteSuccessDefault: 'The item was deleted succesfully.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
  AlertRestoreSucceededDefault: 'The item was restored successfully.',
  AlertRestoreErrorDefault: 'There was an error while trying to restore the item.',
} as const

const EN = {
  dateRange: 'Date range',
  selectRange: 'Select range',
  chooseMonthYear: 'Choose month and year',
  last7Days: 'Last 7 days',
  last14Days: 'Last 14 days',
  last30Days: 'Last 30 days',
} as const

// Views/StudentDelete/index.cshtml:70-71: three days either side of today.
const RANGE_DAYS = 3

export function StudentDeletionScreen() {
  const t = useScreenText(TEXT)
  const [today] = useState(() => new Date())
  const [from, setFrom] = useState(() => addDays(today, -RANGE_DAYS))
  const [to, setTo] = useState(() => addDays(today, RANGE_DAYS))
  const extraQuery = useMemo(() => ({ from: toCultureDate(from), to: toCultureDate(to) }), [from, to])
  const defaultFrom = toCultureDate(addDays(today, -RANGE_DAYS))
  const defaultTo = toCultureDate(addDays(today, RANGE_DAYS))
  const rangeChanged = extraQuery.from !== defaultFrom || extraQuery.to !== defaultTo
  const resetRange = () => {
    setFrom(addDays(today, -RANGE_DAYS))
    setTo(addDays(today, RANGE_DAYS))
  }

  const columns: TableColumn<StudentDeleteRowDto>[] = [
    { key: 'student', label: t('Student'), render: row => row.student },
    {
      key: 'confirmationDate',
      label: t('ExpiryDate'),
      render: row => <PlainDate value={row.confirmationDate} />,
    },
    {
      key: 'autoDeleteDate',
      label: t('DeletionDate'),
      render: row => <DueDate value={row.autoDeleteDate} today={today} />,
    },
  ]

  return (
    <StudentListScreen<StudentDeleteRowDto>
      sectionId="student-delete"
      access={ACCESS}
      readKey="students-deletion"
      path="StudentDeleteApi/GetStudentsConfirm"
      columns={columns}
      rowLabel={row => row.student ?? ''}
      initialSort={{ column: 'student', direction: 'desc' }}
      sortable={false}
      searchable
      extraQuery={extraQuery}
      intro={<StudentJourney active="student-delete" />}
      filters={{
        chips: [
          {
            id: 'range',
            label: EN.dateRange,
            value: `${formatShortDate(from)} → ${formatShortDate(to)}`,
            onRemove: rangeChanged ? resetRange : undefined,
          },
        ],
        canReset: rangeChanged,
        onReset: resetRange,
        content: (
          <DateRangeField
            id="student-deletion-range"
            start={from}
            end={to}
            formatDate={formatShortDate}
            onChange={(start, end) => {
              setFrom(start)
              setTo(end < start ? start : end)
            }}
            labels={{
              dateRange: EN.dateRange,
              startDate: t('From'),
              endDate: t('To'),
              close: t('Close'),
              cancel: t('Cancel'),
              selectRange: EN.selectRange,
              chooseMonthYear: EN.chooseMonthYear,
              previous: t('Previous'),
              next: t('Next'),
              today: t('Today'),
              last7Days: EN.last7Days,
              last14Days: EN.last14Days,
              last30Days: EN.last30Days,
            }}
          />
        ),
      }}
      action={{
        permission: { item: ITEM, action: PermissionAction.Confirm },
        label: t('Delete'),
        icon: Trash2,
        destructive: true,
        confirmTitle: t('Delete'),
        confirmMessage: t('DeleteConfirmationMsg'),
        successMessage: t('AlertDeleteSuccessDefault'),
        errorMessage: t('AlertDeleteErrorDefault'),
        path: 'StudentDeleteApi/GetStudentsConfirmBulkDelete',
      }}
    />
  )
}

export function ManualStudentDeletionScreen() {
  const t = useScreenText(TEXT)
  const columns: TableColumn<StudentRowDto>[] = [
    { key: 'fullName', label: t('Student'), sortable: true, render: row => row.fullName },
    {
      key: 'number',
      label: t('StudentNumber'),
      sortable: true,
      render: row => <span className="font-mono text-[13px] text-slate-600 tabular-nums">{row.number}</span>,
    },
    { key: 'email', label: t('Email'), sortable: true, render: row => row.email },
  ]

  return (
    <StudentListScreen<StudentRowDto>
      sectionId="student-manual-deletion"
      access={ACCESS}
      readKey="students-manual"
      path="StudentDeleteApi/GetStudents"
      columns={columns}
      rowLabel={row => row.fullName ?? ''}
      initialSort={{ column: 'student', direction: 'desc' }}
      sortable
      searchable
      intro={<StudentJourney active="student-manual-deletion" />}
      action={{
        permission: { item: ITEM, action: PermissionAction.Delete },
        label: t('Delete'),
        icon: Trash2,
        destructive: true,
        confirmTitle: t('Delete'),
        confirmMessage: t('DeleteConfirmationMsg'),
        successMessage: t('AlertDeleteSuccessDefault'),
        errorMessage: t('AlertDeleteErrorDefault'),
        path: 'StudentDeleteApi/GetStudentsBulkDelete',
      }}
    />
  )
}

export function StudentRecycleBinScreen() {
  const t = useScreenText(TEXT)
  const [today] = useState(() => new Date())
  const columns: TableColumn<StudentRecycleBinRowDto>[] = [
    { key: 'student', label: t('Student'), sortable: true, render: row => row.student },
    {
      key: 'movedToRecycleBin',
      label: t('MovedRecycleBinDate'),
      sortable: true,
      render: row => <PlainDate value={row.movedToRecycleBin} />,
    },
    {
      key: 'deleteDate',
      label: t('DeletionDate'),
      sortable: true,
      render: row => <DueDate value={row.deleteDate} today={today} />,
    },
  ]

  return (
    <StudentListScreen<StudentRecycleBinRowDto>
      sectionId="student-recycle-bin"
      access={ACCESS}
      readKey="students-recycle-bin"
      path="StudentDeleteApi/GetStudentsInRecycleBin"
      columns={columns}
      rowLabel={row => row.student ?? ''}
      initialSort={{ column: 'student', direction: 'desc' }}
      sortable
      searchable={false}
      intro={<StudentJourney active="student-recycle-bin" />}
      action={{
        permission: { item: ITEM, action: PermissionAction.Restore },
        label: t('Restore'),
        icon: ArchiveRestore,
        destructive: false,
        confirmTitle: t('Restore'),
        confirmMessage: t('RestoreConfirmationMsg'),
        successMessage: t('AlertRestoreSucceededDefault'),
        errorMessage: t('AlertRestoreErrorDefault'),
        path: 'StudentDeleteApi/GetStudentsInRecycleBinBulkRestore',
      }}
    />
  )
}
