import { api } from '@/shared/api'
import type { SettingDto, SettingUpdateDto } from '@/types/settings'
import { LOAD_KEYS, LOGO_CONTAINER, SETTING_KEYS } from './settings-form'

export const fetchBrandingSettings = (signal: AbortSignal) =>
  api.post<SettingDto[] | null>('SettingsApi/GetSettingByKeys', { body: LOAD_KEYS, signal })

// GET returns the stored logo as a full file URI (SettingsApiController.cs:53-56).
export const fetchLogoSetting = (signal: AbortSignal) =>
  api.get<SettingDto | null>(`SettingsApi/${SETTING_KEYS.menuCustomLogo}`, { signal })

export function uploadLogo(file: File) {
  const form = new FormData()
  form.append('file0', file)
  form.append('container', LOGO_CONTAINER)
  return api.post<unknown>('image', { body: form })
}

export const saveBrandingSettings = (settings: SettingUpdateDto[]) =>
  api.post<void>('SettingsApi', { body: settings })
