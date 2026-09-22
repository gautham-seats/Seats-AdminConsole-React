'use client'

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CircleAlert,
  CircleCheck,
  Download,
  FileSpreadsheet,
  Info,
  Lock,
  RotateCw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { IMPORTS_ROUTE, PermissionAction, PermissionItem, type MenuLink } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import {
  Button,
  DelayedLoading,
  ErrorState,
  GearworkLoader,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { useToastAutoClose } from '@/shared/ui/Toast'
import { cn } from '@/shared/ui/cn'
import type { ImportErrorDto, ImportErrorSort } from '@/types/imports'
import { fetchImportTypes, importSampleUrl, uploadImportFile, validateImportFile } from './import-api'
import {
  checkImport,
  formatFileSize,
  IMPORT_ERROR_CAP,
  IMPORT_ERROR_DEFAULT_PAGE_SIZE,
  IMPORT_ERROR_PAGE_SIZES,
  INITIAL_ERROR_SORT,
  nextErrorSort,
  sortImportErrors,
  type ImportProblem,
} from './import-file'
import { IMPORT_FALLBACK_ONLY, useImportText } from './import-text'
import { StatusBadge } from '@/shared/ui/StatusBadge'

const IMPORT_ACCESS = { item: PermissionItem.Import, action: PermissionAction.Access }
const IMPORT_ADD = { item: PermissionItem.Import, action: PermissionAction.Add }

const SECTION: MenuLink = {
  id: 'imports',
  labelKey: 'Imports',
  fallback: 'Imports',
  icon: 'upload',
  legacyRoute: '#/Import',
  reactRoute: IMPORTS_ROUTE,
  permission: IMPORT_ACCESS,
}

type Notice = { id: number; tone: 'success' | 'error' | 'info'; message: string; duration: number }
type Busy = 'validate' | 'process' | null

const GLOSSY =
  'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-brand)_85%,white)_0%,var(--color-brand)_55%,color-mix(in_srgb,var(--color-brand)_88%,black)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),inset_0_-1px_0_rgba(0,0,0,.12),0_4px_12px_-4px_rgba(21,102,162,.45)] hover:brightness-105 hover:-translate-y-px active:translate-y-0 transition-[transform,filter] duration-300 motion-reduce:transition-none'

// ImportController.cs:15 serves the page with Import + Access.
export function ImportScreen() {
  const profile = useProfile()
  const t = useImportText()
  if (profile.status === 'error')
    return (
      <div className="grid flex-1 place-items-center p-6">
        <ErrorState
          variant="page"
          headingLevel={1}
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={profile.reload}
          error={profile.error}
        />
      </div>
    )
  if (profile.status !== 'success')
    return (
      <div className="grid flex-1 place-items-center">
        <h1 className="sr-only">{t('Loading')}</h1>
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  if (!profile.can(IMPORT_ACCESS))
    return (
      <div className="grid flex-1 place-items-center p-6">
        <div
          role="alert"
          className="flex max-w-md animate-rise-in flex-col items-center gap-3 rounded-lg border border-border bg-white p-8 text-center shadow-sm"
        >
          <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <Lock aria-hidden className="size-5" />
          </span>
          <h1 className="text-[15px] font-semibold text-foreground">{IMPORT_FALLBACK_ONLY.noAccess}</h1>
        </div>
      </div>
    )
  return <ImportWorkspace />
}

function StepCard({
  step,
  done,
  title,
  children,
}: {
  step: number
  done: boolean
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-white p-5 shadow-sm">
      <header className="flex items-center gap-2.5">
        <span
          className={cn(
            'grid size-7 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-300',
            done ? 'bg-emerald-600 text-white' : 'bg-brand text-white',
          )}
        >
          {done ? <CircleCheck aria-hidden className="size-4" /> : step}
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      {children}
    </section>
  )
}

function ImportWorkspace() {
  const t = useImportText()
  const profile = useProfile()
  const canProcess = profile.can(IMPORT_ADD)
  const sections = useMemo(() => [{ ...SECTION, label: t('Imports') }], [t])
  const loadTypes = useCallback((signal: AbortSignal) => fetchImportTypes(signal), [])
  const types = useApiRead('import:types', loadTypes)
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [typeId, setTypeId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState<Busy>(null)
  const [errors, setErrors] = useState<ImportErrorDto[] | null>(null)
  const [sort, setSort] = useState<ImportErrorSort>(INITIAL_ERROR_SORT)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState<number>(IMPORT_ERROR_DEFAULT_PAGE_SIZE)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [progress, setProgress] = useState(0)
  const [retryAction, setRetryAction] = useState<Exclude<Busy, null> | null>(null)
  const [tried, setTried] = useState(false)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  const dismissNotice = useCallback(() => setNotice(null), [])
  useToastAutoClose(notice !== null, notice?.duration ?? 0, dismissNotice)

  const say = (tone: Notice['tone'], message: string, duration = 6000) =>
    setNotice({ id: Date.now(), tone, message, duration })

  const problemText = (problem: ImportProblem) =>
    problem === 'typeRequired'
      ? IMPORT_FALLBACK_ONLY.typeRequired
      : problem === 'fileRequired'
        ? IMPORT_FALLBACK_ONLY.fileRequired
        : t('FileNotSupported')

  const failureText = (error: unknown, fallback: string) => {
    const failure = toApiError(error)
    if (failure.kind === 'blocked') return IMPORT_FALLBACK_ONLY.safeMode
    return failure.serverMessage ?? fallback
  }

  const pickFile = (next: File | null) => {
    setFile(next)
    setErrors(null)
    setRetryAction(null)
  }

  // Inline flags appear after a failed attempt and follow the current type and file from then on.
  const typeProblem = tried && typeId === null
  const fileProblem: ImportProblem | null = !tried ? null : file ? checkImport(0, file) : 'fileRequired'

  const run = async (action: Exclude<Busy, null>) => {
    const problem = checkImport(typeId, file)
    if (problem || typeId === null || !file) {
      setTried(true)
      // seats-file-importer.html:482-494: 500 ms for missing type or file, 5 s otherwise.
      const kind = problem ?? 'fileRequired'
      say('error', problemText(kind), kind === 'fileNotSupported' ? 5000 : 500)
      return
    }
    setTried(false)
    const controller = new AbortController()
    requestRef.current = controller
    const options = { signal: controller.signal, onUploadProgress: setProgress }
    setBusy(action)
    setProgress(0)
    setRetryAction(null)
    setErrors(null)
    try {
      if (action === 'validate') {
        const rows = await validateImportFile(typeId, file, options)
        setSort(INITIAL_ERROR_SORT)
        setPageIndex(0)
        if (rows.length > 0) {
          setErrors(rows)
          say('info', IMPORT_FALLBACK_ONLY.invalid)
        } else say('success', IMPORT_FALLBACK_ONLY.valid)
      } else {
        await uploadImportFile(typeId, file, options)
        pickFile(null)
        if (inputRef.current) inputRef.current.value = ''
        say('success', IMPORT_FALLBACK_ONLY.uploaded)
      }
    } catch (error) {
      const failure = toApiError(error)
      if (failure.kind !== 'blocked') setRetryAction(action)
      if (failure.kind === 'aborted') say('info', IMPORT_FALLBACK_ONLY.cancelled)
      else say('error', failureText(failure, IMPORT_FALLBACK_ONLY.uploadError), 5000)
    } finally {
      if (requestRef.current === controller) requestRef.current = null
      setBusy(null)
    }
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files
    if (dropped.length > 0) pickFile(dropped[dropped.length - 1])
  }

  const progressText = `${Math.round(progress * 100)}%`
  const sorted = errors ? sortImportErrors(errors, sort) : []
  const pageRows = sorted.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
  // ImportApiController.cs:277 returns ErrorDetails.Take(100), so a full page of errors may not be all of them.
  const capped = errors !== null && errors.length >= IMPORT_ERROR_CAP
  const errorBadge = `${errors?.length ?? 0}${capped ? '+' : ''} ${IMPORT_FALLBACK_ONLY.errorCount}`
  const SortIcon = (column: ImportErrorSort['column']) =>
    sort.column !== column ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown

  return (
    <AreaWorkspace
      areaLabel={t('Imports')}
      sections={sections}
      activeId="imports"
      title={t('Imports')}
      meta={
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {IMPORT_FALLBACK_ONLY.csvBadge}
        </span>
      }
      collapseLabel={t('Collapse')}
      expandLabel={IMPORT_FALLBACK_ONLY.expand}
      navigation="admin"
    >
      {notice ? (
        <div
          key={notice.id}
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'flex animate-rise-in items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-sm motion-reduce:animate-none',
            notice.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
            notice.tone === 'error' && 'border-red-200 bg-red-50 text-red-900',
            notice.tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900',
          )}
        >
          {notice.tone === 'success' ? (
            <CircleCheck aria-hidden className="size-4 shrink-0 text-emerald-600" />
          ) : notice.tone === 'error' ? (
            <CircleAlert aria-hidden className="size-4 shrink-0 text-red-600" />
          ) : (
            <Info aria-hidden className="size-4 shrink-0 text-sky-600" />
          )}
          <span className="flex-1">{notice.message}</span>
          {retryAction && busy === null && notice.tone !== 'success' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 bg-white"
              onClick={() => void run(retryAction)}
            >
              <RotateCw aria-hidden className="size-3.5" />
              {IMPORT_FALLBACK_ONLY.retry}
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label={IMPORT_FALLBACK_ONLY.dismiss}
            className="grid size-6 place-items-center rounded-sm opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <StepCard step={1} done={typeId !== null} title={IMPORT_FALLBACK_ONLY.importType}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="import-type"
              className="text-[13px] font-medium text-slate-700 after:ml-0.5 after:text-destructive after:content-['*']"
            >
              {IMPORT_FALLBACK_ONLY.importType}
            </label>
            {types.status === 'error' ? (
              <ErrorState
                message={t('AlertGeneralErrorDefault')}
                retryLabel={t('Refresh')}
                onRetry={types.reload}
                error={types.error}
                className="p-4"
              />
            ) : (
              <Select
                value={typeId === null ? undefined : String(typeId)}
                onValueChange={value => {
                  setTypeId(Number(value))
                  setErrors(null)
                }}
                disabled={types.status !== 'success' || busy !== null}
              >
                <SelectTrigger
                  id="import-type"
                  className="h-10 bg-white"
                  aria-invalid={typeProblem}
                  aria-describedby={typeProblem ? 'import-type-error' : undefined}
                >
                  <SelectValue placeholder={IMPORT_FALLBACK_ONLY.select} />
                </SelectTrigger>
                <SelectContent>
                  {(types.data ?? []).map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {typeProblem ? (
              <p id="import-type-error" className="text-xs font-medium text-destructive">
                {problemText('typeRequired')}
              </p>
            ) : null}
          </div>
          {typeId !== null ? (
            <a
              href={importSampleUrl(typeId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit animate-fade-in items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Download aria-hidden className="size-4" />
              {IMPORT_FALLBACK_ONLY.sample}
            </a>
          ) : null}
        </StepCard>

        <StepCard step={2} done={file !== null} title={IMPORT_FALLBACK_ONLY.file}>
          <label
            htmlFor={inputId}
            onDragOver={event => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed px-4 py-5 text-center transition-[border-color,background-color] duration-300 focus-within:ring-2 focus-within:ring-ring',
              fileProblem && !dragging && 'border-destructive',
              dragging
                ? 'border-brand bg-brand/[0.06]'
                : 'border-slate-300 bg-slate-50/70 hover:border-brand/60 hover:bg-brand/[0.03]',
            )}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-brand/[0.08] text-brand">
              <Upload aria-hidden className="size-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">{IMPORT_FALLBACK_ONLY.dropText}</span>
            <span className="text-xs text-muted-foreground">{IMPORT_FALLBACK_ONLY.csvOnly}</span>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept=".csv"
              className="sr-only"
              aria-invalid={fileProblem !== null}
              aria-describedby={fileProblem ? 'import-file-error' : undefined}
              disabled={busy !== null}
              onChange={event => pickFile(event.target.files?.[event.target.files.length - 1] ?? null)}
            />
          </label>
          {fileProblem ? (
            <p id="import-file-error" className="text-xs font-medium text-destructive">
              {problemText(fileProblem)}
            </p>
          ) : null}
          {file ? (
            <div className="flex animate-rise-in items-center gap-3 rounded-lg border border-border bg-white px-3 py-2 motion-reduce:animate-none">
              <span className="grid size-9 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                <FileSpreadsheet aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span title={file.name} className="block truncate text-sm font-semibold text-foreground">
                  {file.name}
                </span>
                <span className="block text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  pickFile(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
                aria-label={IMPORT_FALLBACK_ONLY.removeFile}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ) : null}
        </StepCard>

        <StepCard step={3} done={false} title={IMPORT_FALLBACK_ONLY.checkAndImport}>
          <p className="text-sm text-muted-foreground">{IMPORT_FALLBACK_ONLY.checkHelp}</p>
          <div className="mt-auto flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-lg"
              disabled={busy !== null}
              aria-busy={busy === 'validate'}
              onClick={() => void run('validate')}
            >
              {busy === 'validate' ? (
                <GearworkLoader className="h-5 w-6" />
              ) : (
                <ShieldCheck aria-hidden className="size-4" />
              )}
              {IMPORT_FALLBACK_ONLY.validate}
            </Button>
            {busy !== null ? (
              <div className="flex items-center gap-2" aria-live="polite">
                <div
                  role="progressbar"
                  aria-label={IMPORT_FALLBACK_ONLY.uploading}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-200 motion-reduce:transition-none"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                  {progressText}
                </span>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => requestRef.current?.abort()}>
                  {IMPORT_FALLBACK_ONLY.cancel}
                </Button>
              </div>
            ) : null}
            {canProcess ? (
              <button
                type="button"
                disabled={busy !== null}
                aria-busy={busy === 'process'}
                onClick={() => void run('process')}
                className={cn(
                  'lift-bloom inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60',
                  GLOSSY,
                )}
              >
                {busy === 'process' ? (
                  <GearworkLoader className="h-5 w-6" />
                ) : (
                  <Upload aria-hidden className="size-4" />
                )}
                {IMPORT_FALLBACK_ONLY.process}
              </button>
            ) : null}
          </div>
        </StepCard>
      </div>

      {errors && errors.length > 0 ? (
        <section className="flex min-h-0 animate-rise-in flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm motion-reduce:animate-none">
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <StatusBadge tone="danger" className="tabular-nums">
              {errorBadge}
            </StatusBadge>
            <h2 className="text-sm font-semibold text-foreground">{IMPORT_FALLBACK_ONLY.errorsTitle}</h2>
          </header>
          <div className="overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  {(['lineNumber', 'exceptionInfo'] as const).map(column => {
                    const Icon = SortIcon(column)
                    const active = sort.column === column
                    return (
                      <th
                        key={column}
                        scope="col"
                        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className={cn(
                          'h-10 border-b border-border px-4 text-left font-medium text-muted-foreground',
                          column === 'lineNumber' && 'w-40',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSort(current => nextErrorSort(current, column))
                            setPageIndex(0)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {column === 'lineNumber'
                            ? IMPORT_FALLBACK_ONLY.lineNumber
                            : IMPORT_FALLBACK_ONLY.exceptionInfo}
                          <Icon
                            aria-hidden
                            className={cn('size-3.5', active ? 'text-brand' : 'opacity-50')}
                          />
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr
                    key={`${row.lineNumber}-${index}-${row.exceptionInfo ?? ''}`}
                    style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
                    className="animate-row-in hover:bg-slate-50 motion-reduce:animate-none"
                  >
                    <td className="border-b border-border px-4 py-2.5 font-semibold tabular-nums text-foreground">
                      {row.lineNumber}
                    </td>
                    <td className="border-b border-border px-4 py-2.5 text-slate-700">{row.exceptionInfo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            id="import-errors-page-size"
            pageIndex={pageIndex}
            pageSize={pageSize}
            total={sorted.length}
            pageSizes={IMPORT_ERROR_PAGE_SIZES}
            onPageChange={setPageIndex}
            onPageSizeChange={size => {
              setPageSize(size)
              setPageIndex(0)
            }}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: IMPORT_FALLBACK_ONLY.first,
              previous: t('Previous'),
              next: t('Next'),
              last: IMPORT_FALLBACK_ONLY.last,
            }}
          />
        </section>
      ) : null}
    </AreaWorkspace>
  )
}
