'use client'

import {
  Accessibility,
  CircleHelp,
  ExternalLink,
  Image as ImageIcon,
  Palette,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { Button, buttonVariants, Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { SaveToast } from '../shared/SaveToast'
import { SettingsCard, SettingsField } from '../shared/SettingsCard'
import {
  FormStatusPill,
  SaveActions,
  SettingsBody,
  SettingsGate,
  SettingsLayout,
  useSaveShortcut,
} from '../shared/SettingsFrame'
import { BrandPreview } from './BrandPreview'
import { ColorField } from './ColorField'
import { LogoField } from './LogoField'
import {
  contrastGrade,
  contrastRatio,
  DEFAULT_COLOURS,
  openableUrl,
  previewColor,
  specificMessageKey,
  type BrandingField,
  type ColourField,
} from './settings-form'
import { SETTINGS_FALLBACK_ONLY as EN, useSettingsText, type SettingsTextKey } from './settings-text'
import { useBrandingForm, type BrandingForm } from './use-branding-form'

const SETTINGS_ACCESS = { item: PermissionItem.Settings, action: PermissionAction.Access }
const SETTINGS_EDIT = { item: PermissionItem.Settings, action: PermissionAction.Edit }

export function SettingsScreen() {
  return (
    <SettingsGate access={SETTINGS_ACCESS}>
      <BrandingWorkspace />
    </SettingsGate>
  )
}

function BrandingWorkspace() {
  const profile = useProfile()
  const canEdit = profile.can(SETTINGS_EDIT)
  const t = useSettingsText()
  const form = useBrandingForm(t)
  const ready = form.read.status === 'success'
  useSaveShortcut(canEdit, form.save)

  return (
    <SettingsLayout
      sectionId="settings-general"
      title={t('Settings')}
      meta={<FormStatusPill canEdit={canEdit} dirty={form.dirty} />}
      actions={
        canEdit && ready ? (
          <SaveActions
            dirty={form.dirty}
            saving={form.saving}
            saveLabel={t('Save')}
            onSave={() => void form.save()}
            onDiscard={form.discard}
          />
        ) : null
      }
    >
      <SaveToast notice={form.notice} onDismiss={form.dismissNotice} dismissLabel={EN.dismiss} />
      <SettingsBody error={form.read.error} status={form.read.status} onRetry={form.read.reload}>
        <BrandingEditor form={form} t={t} canEdit={canEdit} />
      </SettingsBody>
    </SettingsLayout>
  )
}

type Text = (key: SettingsTextKey) => string

function BrandingEditor({ form, t, canEdit }: { form: BrandingForm; t: Text; canEdit: boolean }) {
  const locked = !canEdit || form.saving

  const textField = (field: BrandingField, label: string, linkable = false) => {
    const href = linkable ? openableUrl(form.values[field]) : null
    const failure = form.fieldError(field)
    const specific = failure ? specificMessageKey(failure) : null
    const message = failure ? (specific ? EN[specific] : t(failure.messageKey)) : null
    return (
      <SettingsField
        htmlFor={`setting-${field}`}
        link={field.endsWith('Url')}
        label={label}
        hint={EN.hints[field]}
        error={message}
      >
        <div className="flex items-center gap-2">
          <Input
            id={`setting-${field}`}
            value={form.values[field]}
            disabled={locked}
            onChange={event => form.setValue(field, event.target.value)}
            aria-invalid={failure !== null || undefined}
            aria-describedby={failure ? `setting-${field}-error` : undefined}
            spellCheck={false}
            className="h-9 w-full bg-white"
          />
          {linkable ? (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'group/link shrink-0 bg-white transition-[color,border-color,transform] hover:border-brand/40 hover:text-brand active:scale-[.97]',
                )}
              >
                <ExternalLink
                  aria-hidden
                  className="size-4 transition-transform duration-300 ease-premium group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                />
                {EN.openLink}
              </a>
            ) : (
              <span
                title={EN.noLinkToOpen}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'pointer-events-none shrink-0 bg-white opacity-65',
                )}
              >
                <ExternalLink aria-hidden className="size-4" />
                {EN.openLink}
              </span>
            )
          ) : null}
        </div>
      </SettingsField>
    )
  }

  const headerText = previewColor(form.values.tableHeaderTextColor, DEFAULT_COLOURS.tableHeaderTextColor)
  const headerColour = previewColor(form.values.tableBackgroundColor, DEFAULT_COLOURS.tableBackgroundColor)
  const ratio = contrastRatio(headerText, headerColour)
  const grade = ratio === null ? null : contrastGrade(ratio)
  const contrastMessage =
    ratio !== null && grade ? `${EN.hardToRead} (${ratio.toFixed(1)}:1 · ${grade.label}). ${EN.aimFor}` : ''
  const contrastNote =
    ratio !== null && grade && grade.tone !== 'ok' ? (
      <p
        role="status"
        className={cn(
          'mt-2 flex animate-fade-in items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium motion-reduce:animate-none',
          grade.tone === 'bad' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800',
        )}
      >
        <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
        {contrastMessage}
      </p>
    ) : null
  const hasCustomColours = [
    form.values.menuBackgroundColor,
    form.values.tableBackgroundColor,
    form.values.tableHeaderTextColor,
  ].some(Boolean)

  const colorField = (field: ColourField, label: string) => (
    <SettingsField
      htmlFor={`setting-${field}`}
      label={label}
      hint={EN.hints[field]}
      note={field === 'tableHeaderTextColor' ? contrastNote : null}
    >
      <ColorField
        id={`setting-${field}`}
        label={label}
        value={form.values[field]}
        disabled={locked}
        paletteLabel={EN.palette}
        customLabel={EN.customColour}
        placeholder={`${EN.defaultValue} · ${DEFAULT_COLOURS[field]}`}
        defaultColor={DEFAULT_COLOURS[field]}
        onChange={value => form.setValue(field, value)}
      />
    </SettingsField>
  )

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.85fr)] xl:items-start">
      <form
        className="flex min-w-0 flex-col gap-4"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          if (canEdit) void form.save()
        }}
      >
        {form.missingSettings ? (
          <p
            role="note"
            className="flex animate-fade-in items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 motion-reduce:animate-none"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
            {EN.missingSettings}
          </p>
        ) : null}

        <SettingsCard icon={CircleHelp} title={EN.help} hint={EN.cardHints.help} delay={0}>
          {textField('onlineHelpUrl', t('OnlineHelpUrl'), true)}
        </SettingsCard>

        <SettingsCard
          icon={Palette}
          title={EN.colours}
          hint={EN.cardHints.colours}
          delay={40}
          action={
            canEdit && hasCustomColours ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={locked}
                onClick={form.resetColours}
                className="group/reset animate-fade-in text-white/90 hover:bg-white/15 hover:text-white focus-visible:ring-white/80 focus-visible:ring-offset-0 motion-reduce:animate-none"
              >
                <RotateCcw
                  aria-hidden
                  className="size-4 transition-transform duration-500 ease-premium group-hover/reset:-rotate-180"
                />
                {EN.useDefaultColours}
              </Button>
            ) : null
          }
        >
          {colorField('menuBackgroundColor', t('MenuColor'))}
          {colorField('tableBackgroundColor', t('TableHeaderColor'))}
          {colorField('tableHeaderTextColor', t('TableHeaderTextColor'))}
        </SettingsCard>

        <SettingsCard icon={ImageIcon} title={EN.logo} hint={EN.cardHints.logo} delay={80}>
          <SettingsField
            htmlFor="setting-menuCustomLogo"
            label={t('MenuCustomLogo')}
            hint={EN.hints.menuCustomLogo}
          >
            <LogoField
              id="setting-menuCustomLogo"
              label={t('MenuCustomLogo')}
              fileName={form.logoName}
              previewUrl={form.logoUrl}
              isNew={form.hasPickedLogo}
              disabled={locked}
              text={{
                browse: t('Browse'),
                drop: EN.dropImage,
                newLogo: EN.newLogo,
                currentLogo: EN.currentLogo,
                noLogo: EN.noLogo,
                remove: EN.removeFile,
              }}
              onPick={form.pickLogo}
              onRemove={form.clearPicked}
            />
          </SettingsField>
        </SettingsCard>

        <SettingsCard
          icon={Accessibility}
          title={EN.accessibility}
          hint={EN.cardHints.accessibility}
          delay={120}
        >
          {textField('customAccessibilityStatementName', t('CustomAccessibilityStatementName'))}
          {textField('customAccessibilityStatementUrl', t('CustomAccessibilityStatementUrl'), true)}
        </SettingsCard>

        <button type="submit" hidden />
      </form>

      <div className="h-[42rem] xl:sticky xl:top-0 xl:h-[calc(100dvh-10.5rem)] xl:min-h-[38rem]">
        <BrandPreview
          brand={{
            menuColor: form.values.menuBackgroundColor,
            tableColor: form.values.tableBackgroundColor,
            tableTextColor: form.values.tableHeaderTextColor,
            logoUrl: form.logoUrl,
            helpUrl: form.values.onlineHelpUrl,
            statementName: form.values.customAccessibilityStatementName,
          }}
          labels={{
            menuColor: t('MenuColor'),
            menuCustomLogo: t('MenuCustomLogo'),
            onlineHelpUrl: t('OnlineHelpUrl'),
          }}
        />
      </div>
    </div>
  )
}
