import type { SettingDto, SettingUpdateDto } from '@/types/settings'

// Keys from Views/GraphAPI/Index.cshtml:42-47 and GraphApiController.cs:30.
export const GRAPH_KEYS = {
  enabled: 'GRAPHAPI_ENABLED',
  tenantId: 'GRAPHAPI_TENANTID',
  clientId: 'GRAPHAPI_CLIENTID',
  apiKey: 'GRAPHAPI_APIKEY',
} as const

export type GraphField = Exclude<keyof typeof GRAPH_KEYS, 'enabled'>

// GraphApiController.cs:70 never returns the stored secret, only this mask.
export const MASKED_KEY = '***************'

export function graphValue(settings: readonly SettingDto[], key: string): string {
  return settings.find(setting => setting.key === key)?.value ?? ''
}

export function setGraphValue(settings: readonly SettingDto[], key: string, value: string): SettingDto[] {
  return settings.map(setting => (setting.key === key ? { ...setting, value } : setting))
}

// PUT body order of seats-admin-graphapi.html:274-282: tenant, client, key, enabled.
export function buildGraphPayload(settings: readonly SettingDto[]): SettingUpdateDto[] {
  return [GRAPH_KEYS.tenantId, GRAPH_KEYS.clientId, GRAPH_KEYS.apiKey, GRAPH_KEYS.enabled].flatMap(key => {
    const setting = settings.find(item => item.key === key)
    return setting ? [{ id: setting.id, value: setting.value, key: setting.key }] : []
  })
}

// The PUT answers with the recalculated GRAPHAPI_ENABLED setting only.
export function mergeEnabled(
  settings: readonly SettingDto[],
  enabled: SettingDto | null | undefined,
): SettingDto[] {
  if (!enabled) return [...settings]
  return settings.map(setting =>
    setting.key === GRAPH_KEYS.enabled ? { ...setting, value: enabled.value } : setting,
  )
}
