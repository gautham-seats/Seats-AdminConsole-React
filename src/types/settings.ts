// Seats.Trunk.Contracts SettingDto, camelCased by the Admin Web API formatter.
export type SettingDto = {
  id: number
  key: string
  value: string | null
  description: string | null
}

// Body item of POST api/SettingsApi, the three fields seats-admin-setting-color sends.
export type SettingUpdateDto = {
  id: number
  value: string | null
  key: string
}
