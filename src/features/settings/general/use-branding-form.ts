'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toApiError, useApiRead, type ApiError } from '@/shared/api'
import type { SettingDto } from '@/types/settings'
import { fetchBrandingSettings, fetchLogoSetting, saveBrandingSettings, uploadLogo } from './settings-api'
import {
  buildSettingsPayload,
  indexSettings,
  initialValues,
  logoFileName,
  sameValues,
  BRANDING_FIELDS,
  brandingFieldErrors,
  unsavableFields,
  SETTING_KEYS,
  validateBranding,
  type BrandingField,
  type BrandingValues,
  type ValidationFailure,
} from './settings-form'
import type { Notice } from '../shared/SaveToast'
import { SETTINGS_FALLBACK_ONLY, type SettingsTextKey } from './settings-text'

type Draft = {
  source: SettingDto[] | null | undefined
  values: BrandingValues
  baseline: BrandingValues
  logoName: string
}

type PickedLogo = { file: File; url: string }

type Text = (key: SettingsTextKey) => string

function saveErrorMessage(error: ApiError, t: Text): string {
  if (error.kind === 'blocked') return SETTINGS_FALLBACK_ONLY.safeMode
  if (error.kind === 'http' && error.status === 400 && error.serverMessage) return error.serverMessage
  return t('AlertSaveErrorDefault')
}

export function useBrandingForm(t: Text) {
  const read = useApiRead('settings-branding', fetchBrandingSettings)
  const [logoVersion, setLogoVersion] = useState(0)
  const logoRead = useApiRead(`settings-logo#${logoVersion}`, fetchLogoSetting)
  const index = useMemo(() => indexSettings(read.data), [read.data])

  const [draft, setDraft] = useState<Draft | null>(null)
  const current = useMemo<Draft>(() => {
    if (draft && draft.source === read.data) return draft
    const values = initialValues(index)
    return { source: read.data, values, baseline: values, logoName: index.menuCustomLogo?.value ?? '' }
  }, [draft, read.data, index])

  const [picked, setPicked] = useState<PickedLogo | null>(null)
  // After the first Save attempt every field is rechecked from the current values on each change.
  const [submitted, setSubmitted] = useState(false)
  const errors = useMemo<ValidationFailure[]>(
    () => (submitted ? brandingFieldErrors(current.values) : []),
    [submitted, current.values],
  )
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const pickedRef = useRef<PickedLogo | null>(null)

  useEffect(() => {
    pickedRef.current = picked
  }, [picked])
  useEffect(
    () => () => {
      if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url)
    },
    [],
  )

  const replacePicked = useCallback((next: PickedLogo | null) => {
    setPicked(previous => {
      if (previous) URL.revokeObjectURL(previous.url)
      return next
    })
  }, [])

  const setValue = useCallback(
    (field: BrandingField, value: string) => {
      setDraft({ ...current, values: { ...current.values, [field]: value } })
    },
    [current],
  )

  const pickLogo = useCallback(
    (file: File) => {
      replacePicked({ file, url: URL.createObjectURL(file) })
      setDraft({ ...current, logoName: file.name })
    },
    [current, replacePicked],
  )

  const clearPicked = useCallback(() => {
    replacePicked(null)
    setDraft({ ...current, logoName: index.menuCustomLogo?.value ?? '' })
  }, [current, index, replacePicked])

  const discard = useCallback(() => {
    replacePicked(null)
    setSubmitted(false)
    setDraft({ ...current, values: current.baseline, logoName: index.menuCustomLogo?.value ?? '' })
  }, [current, index, replacePicked])

  const resetColours = useCallback(() => {
    setDraft({
      ...current,
      values: {
        ...current.values,
        menuBackgroundColor: '',
        tableBackgroundColor: '',
        tableHeaderTextColor: '',
      },
    })
  }, [current])

  const dismissNotice = useCallback(() => setNotice(null), [])
  const fail = (message: string) => setNotice({ id: Date.now(), tone: 'error', message })

  const save = async () => {
    if (saving || read.status !== 'success') return
    const failure = validateBranding(current.values)
    setSubmitted(true)
    if (failure) {
      fail(t(failure.messageKey))
      document.getElementById(`setting-${failure.field}`)?.focus()
      return
    }

    const logoSetting = index.menuCustomLogo
    if (picked && !logoSetting) {
      fail(SETTINGS_FALLBACK_ONLY.missingSettings)
      return
    }
    // SettingsApiController.cs:61-77 saves whatever rows exist; a field with no row is reported, not blocking.
    const skipped = unsavableFields(index, current.values, current.baseline)

    const payload = buildSettingsPayload(index, current.values)
    if (payload.length === 0 && !picked) {
      fail(SETTINGS_FALLBACK_ONLY.missingSettings)
      return
    }
    setSaving(true)
    try {
      let logoName = current.logoName
      if (picked && logoSetting) {
        try {
          logoName = logoFileName(await uploadLogo(picked.file))
        } catch (error) {
          const uploadError = toApiError(error)
          const unsupported =
            uploadError.kind === 'http' && (uploadError.status === 406 || uploadError.status === 415)
          fail(unsupported ? t('FileNotSupported') : saveErrorMessage(uploadError, t))
          return
        }
        payload.push({ id: logoSetting.id, value: logoName, key: SETTING_KEYS.menuCustomLogo })
      }
      await saveBrandingSettings(payload)
      const baseline = { ...current.values }
      for (const field of skipped) baseline[field] = current.baseline[field]
      setDraft({ ...current, values: baseline, baseline, logoName })
      if (picked) {
        replacePicked(null)
        setLogoVersion(version => version + 1)
      }
      if (skipped.length > 0) fail(SETTINGS_FALLBACK_ONLY.savedExceptMissing)
      else setNotice({ id: Date.now(), tone: 'success', message: t('AlertSaveSucceededDefault') })
    } catch (error) {
      fail(saveErrorMessage(toApiError(error), t))
    } finally {
      setSaving(false)
    }
  }

  const savedLogoUrl = logoRead.status === 'success' ? (logoRead.data?.value ?? '') : ''
  const dirty = !sameValues(current.values, current.baseline) || picked !== null

  return {
    read,
    index,
    values: current.values,
    baseline: current.baseline,
    missingSettings:
      read.status === 'success' && (BRANDING_FIELDS.some(field => !index[field]) || !index.menuCustomLogo),
    logoName: current.logoName,
    logoUrl: picked?.url ?? savedLogoUrl,
    hasPickedLogo: picked !== null,
    invalid: errors[0] ?? null,
    errors,
    fieldError: (field: BrandingField) => errors.find(error => error.field === field) ?? null,
    saving,
    dirty,
    notice,
    setValue,
    pickLogo,
    clearPicked,
    discard,
    resetColours,
    save,
    dismissNotice,
  }
}

export type BrandingForm = ReturnType<typeof useBrandingForm>
