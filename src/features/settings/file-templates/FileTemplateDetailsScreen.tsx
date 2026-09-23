'use client'

import { BadgeCheck, Braces, FileCode2, FileUp, PenLine, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { api, toApiError, useApiRead } from '@/shared/api'
import { FILE_TEMPLATES_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { LEAVE_EN } from '@/shared/shell/LeaveDialog'
import { useProfile } from '@/shared/shell/profile'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import { Button, Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { FileTemplateDetailsDto, FileTemplateDto, GlobalListItemDto } from '@/types/file-templates'
import { setFlash } from '../shared/flash'
import { NativeSelect } from '../shared/NativeSelect'
import { SaveToast, type Notice } from '../shared/SaveToast'
import { SettingsCard, SettingsField } from '../shared/SettingsCard'
import {
  DetailActions,
  FormStatusPill,
  FRAME_EN,
  SecondaryAction,
  SettingsBody,
  SettingsGate,
  SettingsLayout,
  useSaveShortcut,
} from '../shared/SettingsFrame'
import { useScreenText } from '../shared/use-screen-text'
import {
  appendSubjectWildcard,
  buildContentFile,
  COMMENT_MAX,
  extractTitle,
  hasRelativeLinks,
  isAllowedTemplateFile,
  isEditorEmpty,
  missingTemplateFields,
  NAME_MAX,
  readTemplateFile,
  SUBJECT_MAX,
  subjectWildcardsHidden,
  TEMPLATE_ACCEPT,
  TITLE_MAX,
  toEditorHtml,
  validationBody,
  wildcardInsertion,
  wildcardsFor,
} from './file-template-form'
import { TemplateEditor, type TemplateEditorHandle } from './TemplateEditor'
import { NAV_BAND, NavBandGlow } from '@/shared/ui/nav-band'

const ITEM = PermissionItem.FileTemplate
const ACCESS = { item: ITEM, action: PermissionAction.Access }
const ADD = { item: ITEM, action: PermissionAction.Add }
const EDIT = { item: ITEM, action: PermissionAction.Edit }

// Keys from seats-website-file-template.html.
const TEXT = {
  FileTemplate: 'File Template',
  Template: 'Template',
  ChooseFile: 'Choose file',
  FileName: 'File Name',
  Name: 'Name',
  Comment: 'Comment',
  TitleTemplate: 'Title template',
  FileTemplateType: 'File Template Type',
  Subject: 'Subject',
  FileEditor: 'File Template Editor',
  Wildcards: 'Wildcards',
  Save: 'Save',
  Cancel: 'Cancel',
  Validate: 'Validate',
  RequiredMessage: 'There are fields with input validation errors.',
  ValidFormat: 'The template file has a valid format.',
  InvalidFormat: 'There was an error validating the template. It has an invalid format.',
  FileNotSupported: 'Attachment file format is not supported.',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
} as const

const AT = '@'

const EN = {
  isRequired: 'is required.',
  // Hard-coded in legacy (:746).
  urlPrefix: "URL prefix 'http://' or 'https://' is required.",
  newTemplate: 'New file template',
  details: 'Details',
  detailsHint: 'Name, type and e-mail subject',
  content: 'Content',
  contentHint: 'Write the template or start from a file',
  noFile: 'No file chosen',
  fileHint: 'HTML, CSHTML, TXT or CSV. Replaces the editor content.',
  pickType: 'Select a type',
  addWildcard: 'Insert wildcard',
  wildcardHint: 'Click to insert at the cursor',
  editorPlaceholder: 'Write the template here, or insert a wildcard from the list.',
  filter: 'Filter wildcards',
} as const

const loadDetails = (id: number, signal: AbortSignal) =>
  api.get<FileTemplateDetailsDto>('FileTemplateApi/', { query: { id: id > 0 ? id : '' }, signal })
const loadSubjects = (signal: AbortSignal) =>
  api.get<GlobalListItemDto[] | null>('FileTemplateApi/GetSubjectTemplateTypes', { signal })

export function FileTemplateDetailsScreen({ id }: { id: number }) {
  return (
    <SettingsGate access={ACCESS}>
      <FileTemplateWorkspace id={id} />
    </SettingsGate>
  )
}

function FileTemplateWorkspace({ id }: { id: number }) {
  const t = useScreenText(TEXT)
  const router = useRouter()
  const profile = useProfile()
  const canSave = profile.can(id > 0 ? EDIT : ADD)
  const load = useCallback((signal: AbortSignal) => loadDetails(id, signal), [id])
  const read = useApiRead(`settings-file-template:${id}`, load)
  const subjects = useApiRead('settings-file-template-subjects', loadSubjects)
  const details = read.data

  const editorRef = useRef<TemplateEditorHandle>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<{
    source: FileTemplateDetailsDto
    template: FileTemplateDto
    title: string
  } | null>(null)
  const initial = useMemo(
    () =>
      details ? { template: details.detail, title: extractTitle(details.detail.contentFile ?? '') } : null,
    [details],
  )
  const current = draft && draft.source === details ? draft : initial
  const [editorDirty, setEditorDirty] = useState(false)
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState<'save' | 'validate' | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const fail = (message: string) => setNotice({ id: Date.now(), tone: 'error', message })

  const update = (change: Partial<FileTemplateDto>, title?: string) => {
    if (!details || !current) return
    setDraft({
      source: details,
      template: { ...current.template, ...change },
      title: title ?? current.title,
    })
  }

  const wildcards = useMemo(
    () =>
      details && current
        ? wildcardsFor(
            current.template.fileTemplateTypeId,
            details.fileTemplateTypeAvailables ?? [],
            details.typeValuesAvailables ?? [],
          )
        : [],
    [details, current],
  )
  const shownWildcards = wildcards.filter(item => item.toLowerCase().includes(filter.trim().toLowerCase()))

  // Returns the finished document, or null after showing why it cannot be built.
  const buildContent = (): string | null => {
    const html = editorRef.current?.getHtml() ?? ''
    if (isEditorEmpty(html)) return null
    if (hasRelativeLinks(html)) {
      fail(EN.urlPrefix)
      return null
    }
    return buildContentFile(current?.title ?? '', html)
  }

  const validateOnServer = async (template: FileTemplateDto, contentFile: string) => {
    await api.post<void>('FileTemplateApi/ValidateTemplateTypes', {
      body: validationBody(template, contentFile),
    })
  }

  const errorText = (caught: unknown, fallback: string) => {
    const error = toApiError(caught)
    if (error.kind === 'blocked') return FRAME_EN.safeMode
    return error.serverMessage || fallback
  }

  const validate = async () => {
    if (!current || busy) return
    const html = editorRef.current?.getHtml() ?? ''
    const gaps = missingTemplateFields(current.template, !isEditorEmpty(html))
    setMissing(gaps)
    if (gaps.length > 0) {
      fail([t('RequiredMessage'), ...gaps.map(key => `${t(key)} ${EN.isRequired}`)].join('\n'))
      return
    }
    const contentFile = buildContent()
    if (!contentFile) return
    setBusy('validate')
    try {
      await validateOnServer(current.template, contentFile)
      setNotice({ id: Date.now(), tone: 'success', message: t('ValidFormat') })
    } catch (caught) {
      fail(errorText(caught, t('InvalidFormat')))
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    if (!current || busy || !canSave) return
    const html = editorRef.current?.getHtml() ?? ''
    const gaps = missingTemplateFields(current.template, !isEditorEmpty(html))
    setMissing(gaps)
    if (gaps.length > 0) {
      fail([t('RequiredMessage'), ...gaps.map(key => `${t(key)} ${EN.isRequired}`)].join('\n'))
      return
    }
    const contentFile = buildContent()
    if (!contentFile) return
    setBusy('save')
    try {
      await validateOnServer(current.template, contentFile)
    } catch (caught) {
      fail(errorText(caught, t('InvalidFormat')))
      setBusy(null)
      return
    }
    try {
      await api.post<void>('FileTemplateApi/', { body: { ...current.template, contentFile } })
      setFlash(t('AlertSaveSucceededDefault'))
      router.push(FILE_TEMPLATES_ROUTE)
    } catch (caught) {
      fail(errorText(caught, t('AlertSaveErrorDefault')))
      setBusy(null)
    }
  }
  useSaveShortcut(canSave && current !== null, save)

  const pickFile = (file: File | undefined) => {
    if (!file) return
    if (!isAllowedTemplateFile(file)) {
      fail(t('FileNotSupported'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const { title, body } = readTemplateFile(String(reader.result ?? ''))
      update({ fileName: file.name }, title)
      editorRef.current?.replaceWithHtml(body)
      setEditorDirty(true)
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const locked = !canSave || busy !== null
  const fileNameLabel = `${t('FileName')}:`
  const dirty = editorDirty || (draft !== null && draft.source === details)
  useLeaveGuard(dirty && busy !== 'save', LEAVE_EN.message)
  const title = id > 0 ? (initial?.template.name ?? t('FileTemplate')) : EN.newTemplate
  // a flagged field clears as soon as it has a value again, without waiting for the next Save
  const stillMissing = current ? missingTemplateFields(current.template, true) : []
  const isMissing = (key: string) =>
    missing.includes(key) && (key === 'FileEditor' || stillMissing.some(gap => gap === key))
  const missingError = (key: string) =>
    isMissing(key) ? `${t(key as keyof typeof TEXT)} ${EN.isRequired}` : null

  return (
    <SettingsLayout
      sectionId="file-template"
      title={title}
      meta={<FormStatusPill canEdit={canSave} dirty={dirty} />}
      actions={
        <DetailActions
          cancelHref={FILE_TEMPLATES_ROUTE}
          cancelLabel={t('Cancel')}
          saveLabel={t('Save')}
          onSave={() => void save()}
          saving={busy === 'save'}
          disabled={busy !== null}
          canSave={canSave && current !== null}
          extra={
            canSave && current ? (
              <SecondaryAction
                onClick={() => void validate()}
                disabled={busy !== null}
                icon={
                  <BadgeCheck
                    aria-hidden
                    className={cn('size-[18px]', busy === 'validate' && 'animate-pulse')}
                  />
                }
              >
                {t('Validate')}
              </SecondaryAction>
            ) : null
          }
        />
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />
      <SettingsBody error={read.error} status={read.status} onRetry={read.reload}>
        {details && current ? (
          <div className="flex flex-col gap-4">
            <SettingsCard icon={FileCode2} title={EN.details} hint={EN.detailsHint}>
              <div className="grid lg:grid-cols-2">
                <SettingsField htmlFor="template-name" label={t('Name')} error={missingError('Name')}>
                  <Input
                    id="template-name"
                    value={current.template.name ?? ''}
                    maxLength={NAME_MAX}
                    disabled={locked}
                    aria-invalid={isMissing('Name') || undefined}
                    aria-describedby={isMissing('Name') ? 'template-name-error' : undefined}
                    onChange={event => update({ name: event.target.value })}
                    className="h-9 w-full bg-white"
                  />
                </SettingsField>
                <SettingsField
                  htmlFor="template-type"
                  label={t('FileTemplateType')}
                  error={missingError('FileTemplateType')}
                >
                  <NativeSelect
                    id="template-type"
                    value={current.template.fileTemplateTypeId || ''}
                    disabled={locked}
                    aria-invalid={isMissing('FileTemplateType') || undefined}
                    aria-describedby={isMissing('FileTemplateType') ? 'template-type-error' : undefined}
                    onChange={event => update({ fileTemplateTypeId: Number(event.target.value) })}
                  >
                    <option value="" disabled>
                      {EN.pickType}
                    </option>
                    {(details.fileTemplateTypeAvailables ?? []).map(option => (
                      <option key={option.id} value={option.id}>
                        {option.description}
                      </option>
                    ))}
                  </NativeSelect>
                </SettingsField>
                <SettingsField htmlFor="template-comment" label={t('Comment')}>
                  <Input
                    id="template-comment"
                    value={current.template.comment ?? ''}
                    maxLength={COMMENT_MAX}
                    disabled={locked}
                    onChange={event => update({ comment: event.target.value })}
                    className="h-9 w-full bg-white"
                  />
                </SettingsField>
                <SettingsField htmlFor="template-title" label={t('TitleTemplate')}>
                  <Input
                    id="template-title"
                    value={current.title}
                    maxLength={TITLE_MAX}
                    disabled={locked}
                    onChange={event => update({}, event.target.value)}
                    className="h-9 w-full bg-white"
                  />
                </SettingsField>
                <SettingsField
                  htmlFor="template-subject"
                  label={t('Subject')}
                  error={missingError('Subject')}
                  className="lg:col-span-2"
                >
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="template-subject"
                      value={current.template.subject ?? ''}
                      maxLength={SUBJECT_MAX}
                      disabled={locked}
                      spellCheck={false}
                      aria-invalid={isMissing('Subject') || undefined}
                      aria-describedby={isMissing('Subject') ? 'template-subject-error' : undefined}
                      onChange={event => update({ subject: event.target.value })}
                      className="h-9 w-full bg-white font-mono text-[13px]"
                    />
                    {!subjectWildcardsHidden(current.template.fileTemplateTypeId) ? (
                      <NativeSelect
                        aria-label={EN.addWildcard}
                        value=""
                        disabled={locked}
                        onChange={event => {
                          if (event.target.value) {
                            update({
                              subject: appendSubjectWildcard(current.template.subject, event.target.value),
                            })
                          }
                        }}
                        className="sm:w-64"
                      >
                        <option value="">{EN.addWildcard}</option>
                        {(subjects.data ?? []).map(option => (
                          <option key={option.description} value={option.description}>
                            {option.description}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : null}
                  </div>
                </SettingsField>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={PenLine}
              title={EN.content}
              hint={EN.contentHint}
              delay={60}
              action={
                canSave ? (
                  <>
                    <input
                      ref={fileRef}
                      id="template-file"
                      type="file"
                      accept={TEMPLATE_ACCEPT}
                      className="sr-only"
                      tabIndex={-1}
                      aria-label={t('Template')}
                      disabled={locked}
                      onChange={event => pickFile(event.target.files?.[0])}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={locked}
                      onClick={() => fileRef.current?.click()}
                      // A ghost button disappears into the band, so it carries its own chrome here.
                      className="group/file rounded-lg border border-white/45 bg-white/15 px-4 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.28)] backdrop-blur-[1px] hover:border-white/70 hover:bg-white/25 hover:text-white focus-visible:ring-white/80"
                      title={EN.fileHint}
                    >
                      <FileUp
                        aria-hidden
                        className="size-4 transition-transform duration-300 group-hover/file:-translate-y-0.5"
                      />
                      {t('ChooseFile')}
                    </Button>
                  </>
                ) : null
              }
            >
              <div className="flex items-center gap-2 bg-slate-50 px-5 py-2 text-xs text-slate-500">
                <FileCode2 aria-hidden className="size-3.5" />
                <span className="font-medium text-slate-700">{fileNameLabel}</span>
                <span className="min-w-0 truncate" title={current.template.fileName || undefined}>
                  {current.template.fileName || EN.noFile}
                </span>
              </div>
              <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
                <div>
                  <TemplateEditor
                    ref={editorRef}
                    label={t('FileEditor')}
                    placeholder={EN.editorPlaceholder}
                    disabled={locked}
                    invalid={missing.includes('FileEditor')}
                    describedBy={missing.includes('FileEditor') ? 'template-editor-error' : undefined}
                    initialHtml={toEditorHtml(details.detail.contentFile)}
                    onChange={() => {
                      setEditorDirty(true)
                      setMissing(gaps => gaps.filter(gap => gap !== 'FileEditor'))
                    }}
                  />
                  {missing.includes('FileEditor') ? (
                    <p
                      id="template-editor-error"
                      className="mt-1.5 animate-fade-in text-xs font-medium text-destructive"
                    >
                      {missingError('FileEditor')}
                    </p>
                  ) : null}
                </div>
                <aside
                  aria-label={t('Wildcards')}
                  className="flex max-h-[28rem] flex-col overflow-hidden rounded-lg border border-border bg-white"
                >
                  <div className={cn('flex items-center gap-2 px-3 py-2', NAV_BAND)}>
                    <NavBandGlow />
                    <Braces aria-hidden className="size-4 text-white" />
                    <span className="text-sm font-semibold text-white">{t('Wildcards')}</span>
                  </div>
                  <div className="relative border-b border-border p-2">
                    <Search
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-slate-500"
                    />
                    <Input
                      aria-label={EN.filter}
                      placeholder={EN.filter}
                      value={filter}
                      onChange={event => setFilter(event.target.value)}
                      className="h-8 bg-white pl-7 text-xs"
                    />
                  </div>
                  <p className="px-3 pt-2 text-[11px] text-slate-500">{EN.wildcardHint}</p>
                  <ul className="min-h-0 flex-1 overflow-auto p-2">
                    {shownWildcards.map(item => (
                      <li key={item}>
                        <button
                          type="button"
                          disabled={locked}
                          title={item}
                          onClick={() => {
                            editorRef.current?.insertAtCursor(wildcardInsertion(item))
                            setEditorDirty(true)
                          }}
                          className="group/wc flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-xs text-slate-700 transition-colors hover:bg-brand/[0.07] hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                        >
                          <span className="text-brand transition-transform duration-200 group-hover/wc:translate-x-0.5">
                            {AT}
                          </span>
                          <span className="min-w-0 break-all">{item}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>
            </SettingsCard>
          </div>
        ) : null}
      </SettingsBody>
    </SettingsLayout>
  )
}
