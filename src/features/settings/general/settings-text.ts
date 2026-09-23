'use client'

import { useCallback } from 'react'
import { useResources } from '@/shared/resources'

// Resource keys of seats-admin-setting-color and Settings/Index.cshtml; values are English fallbacks.
const SETTINGS_TEXT = {
  Settings: 'Settings',
  OnlineHelpUrl: 'Online Help Url',
  MenuColor: 'Menu color',
  TableHeaderColor: 'Table header color',
  TableHeaderTextColor: 'Table header text color',
  MenuCustomLogo: 'Menu custom logo',
  CustomAccessibilityStatementName: 'Custom accessibility statement name',
  CustomAccessibilityStatementUrl: 'Custom accessibility statement URL',
  Save: 'Save',
  Browse: 'Browse',
  Clear: 'Clear',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  OnlineHelpUrlValidationMessage: 'Use format http://website.com',
  RequiredMessage: 'There are fields with input validation errors.',
  FileNotSupported: 'File not supported.',
} as const

// No resource key exists for these yet.
export const SETTINGS_FALLBACK_ONLY = {
  missingSettings: 'Some settings were not found on the server, so changes to them cannot be saved.',
  savedExceptMissing: 'Saved. Fields whose setting was not found on the server were left unchanged.',
  safeMode: 'Saving is switched off (safe mode). Nothing was changed.',
  help: 'Help',
  colours: 'Colours',
  logo: 'Logo',
  accessibility: 'Accessibility statement',
  livePreview: 'Live preview',
  palette: 'Colour palette',
  customColour: 'Pick a custom colour',
  dropImage: 'Drop an image here, or',
  newLogo: 'Uploads when you save',
  currentLogo: 'Current logo',
  noLogo: 'No custom logo',
  removeFile: 'Remove selected image',
  hints: {
    onlineHelpUrl: 'Where the help (?) link in the menu takes people.',
    menuBackgroundColor: 'Background of the top menu bar.',
    tableBackgroundColor: 'Header row of every table.',
    tableHeaderTextColor: 'Text in the table header row.',
    menuCustomLogo: 'Shown on the left of the menu bar. Uploads when you save.',
    customAccessibilityStatementName: 'Link text shown to users.',
    customAccessibilityStatementUrl: 'Where the statement link goes. Fill both fields, or neither.',
  },
  cardHints: {
    help: 'Online help link',
    colours: 'Menu and table colours',
    logo: 'Your organisation logo',
    accessibility: 'Statement link for users',
  },
  defaultValue: 'Default',
  useDefaultColours: 'Use default colours',
  openLink: 'Open link',
  noLinkToOpen: 'Enter a valid web address to open it',
  hardToRead: 'Hard to read',
  aimFor: 'Aim for 4.5:1 or more (AA).',
  eachSetting: 'Each setting, where it shows',
  menuBar: 'Menu bar',
  tables: 'Tables',
  footerLinks: 'Footer links',
  logoTag: 'Logo',
  headerTag: 'Header',
  textTag: 'Text',
  onMenuColour: 'On menu color',
  onLight: 'On light grey',
  onDark: 'On dark',
  previewSearch: 'Search',
  columns: ['User Name', 'E-mail', 'Full Name', 'Profile'],
  sampleNormal: 'Aa 14px',
  sampleLarge: 'Aa 20px',
  normalText: 'Normal text',
  largeText: 'Large text',
  wcagLevel: 'WCAG level',
  notMeasurable: 'Use hex to measure',
  noHelpLink: 'No help link',
  helpLink: 'Online help',
  dismiss: 'Close',
  statementNameRequired: 'Enter a name for the accessibility statement link.',
  statementUrlRequired: 'Enter the accessibility statement web address.',
} as const

export type SettingsTextKey = keyof typeof SETTINGS_TEXT

const KEYS = Object.keys(SETTINGS_TEXT)

export function useSettingsText() {
  const { text } = useResources(KEYS)
  return useCallback(
    (key: SettingsTextKey) => {
      const value = text(key)
      return value && value !== key ? value : SETTINGS_TEXT[key]
    },
    [text],
  )
}
