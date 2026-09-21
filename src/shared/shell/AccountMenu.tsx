'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CircleHelp, FileText, KeyRound, LockKeyholeOpen, LogOut, Settings } from 'lucide-react'
import { useCallback, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useApiRead } from '@/shared/api'
import { SIGN_OUT_PATH } from '@/shared/api/config'
import { clearUserStorage } from '@/shared/storage'
import { SharedResourceKeys, useResources } from '@/shared/resources'
import { cn } from '@/shared/ui/cn'
import { Toast, useToastAutoClose } from '@/shared/ui/Toast'
import {
  AccessibilityDialog,
  ChangePasswordDialog,
  LanguageDialog,
  useAccountText,
  type AccountNotice,
} from './AccountDialogs'
import { fetchOnlineHelpUrl, loadPasswordAccount } from './account-settings'
import { PermissionAction, PermissionItem } from './admin-menu'
import { DeveloperKeyDialog } from './DeveloperKeyDialog'
import { CARD_PANEL, ICON, ICON_HUES, ITEM } from './NavMenuCards'
import { useProfile } from './profile'
import { useSessionHeader } from './use-shell-data'

export const PROFILE_LABEL = 'Profile Menu'
// Views/Login/_GetDeveloperKeyButton.cshtml:4.
const DEVELOPER_KEY_PERMISSION = { item: PermissionItem.AdminUserMenu, action: PermissionAction.DeveloperKey }

const SEPARATOR = 'mx-1 my-1 h-px bg-line-soft'

type RowIcon = ComponentType<{ 'aria-hidden'?: boolean; className?: string; style?: CSSProperties }>

// Same row, icon hue and stagger as the nav bar menus (NavMenuCards.tsx).
const rowStyle = (index: number): CSSProperties => ({ animationDelay: `${70 + index * 45}ms` })
function RowContent({ icon: Icon, index, children }: { icon: RowIcon; index: number; children: ReactNode }) {
  return (
    <>
      <Icon
        aria-hidden
        className={ICON}
        style={{ '--icon-hue': ICON_HUES[index % ICON_HUES.length] } as CSSProperties}
      />
      {children}
    </>
  )
}

type AccountMenuProps = {
  trigger: ReactNode
  triggerClassName: string
  side?: 'top' | 'bottom' | 'right'
  align?: 'start' | 'end'
}

// The profile menu from _Layout.cshtml, shared by the nav bar avatar and the sidebar account row.
export function AccountMenu({ trigger, triggerClassName, side = 'bottom', align = 'end' }: AccountMenuProps) {
  const profile = useProfile()
  const session = useSessionHeader()
  const [developerKeyOpen, setDeveloperKeyOpen] = useState(false)
  const [accessibilityOpen, setAccessibilityOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [notice, setNotice] = useState<AccountNotice | null>(null)
  const { text } = useResources(useMemo(() => ['SignOut', 'DeveloperKey'], []))
  const t = useAccountText()
  const label = (key: string, fallback: string) => {
    const value = text(key)
    return !value.trim() || value === key ? fallback : value
  }
  const account = useApiRead(
    'shell-password-account',
    useCallback(() => loadPasswordAccount(), []),
  )
  const helpUrl = useApiRead('shell-online-help-url', fetchOnlineHelpUrl)

  const dismissNotice = useCallback(() => setNotice(null), [])
  const noticeMs = useToastAutoClose(notice !== null, notice?.durationMs ?? 0, dismissNotice)

  type Row =
    | { kind: 'separator'; key: string }
    | {
        kind: 'item'
        key: string
        icon: RowIcon
        label: string
        onSelect?: () => void
        href?: string
        link?: boolean
        newTab?: boolean
      }
  const rows: Row[] = [
    {
      kind: 'item',
      key: 'accessibility',
      icon: Settings,
      label: t('AccessibilitySettings'),
      onSelect: () => setAccessibilityOpen(true),
    },
    { kind: 'separator', key: 'after-accessibility' },
    ...(account.data?.canChangePassword
      ? [
          {
            kind: 'item' as const,
            key: 'password',
            icon: LockKeyholeOpen,
            label: t('ChangePassword'),
            onSelect: () => setPasswordOpen(true),
          },
        ]
      : []),
    {
      kind: 'item',
      key: 'language',
      icon: FileText,
      label: t('ChangeLanguage'),
      onSelect: () => setLanguageOpen(true),
    },
    ...(profile.can(DEVELOPER_KEY_PERMISSION)
      ? [
          {
            kind: 'item' as const,
            key: 'developer-key',
            icon: KeyRound,
            label: label('DeveloperKey', 'Developer Key'),
            onSelect: () => setDeveloperKeyOpen(true),
          },
        ]
      : []),
    // _Layout.cshtml:358-360: without the setting the legacy link has no href and does nothing.
    {
      kind: 'item',
      key: 'help',
      icon: CircleHelp,
      label: t('OnlineHelp'),
      href: helpUrl.data ?? undefined,
      link: true,
      newTab: true,
    },
    { kind: 'separator', key: 'before-sign-out' },
    {
      kind: 'item',
      key: 'sign-out',
      icon: LogOut,
      label: label('SignOut', 'Sign Out'),
      href: SIGN_OUT_PATH,
      link: true,
      onSelect: clearUserStorage,
    },
  ]

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger aria-label={PROFILE_LABEL} className={triggerClassName}>
          {trigger}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content side={side} align={align} sideOffset={10} className={CARD_PANEL}>
            {session?.fullName || session?.email ? (
              <>
                <DropdownMenu.Label className="px-3 pt-2 pb-1.5 text-center">
                  {session.fullName ? (
                    <span className="block text-sm font-semibold text-slate-800">{session.fullName}</span>
                  ) : null}
                  {session.email ? (
                    <span className="block text-xs text-muted-foreground">{session.email}</span>
                  ) : null}
                </DropdownMenu.Label>
                <DropdownMenu.Separator className={SEPARATOR} />
              </>
            ) : null}
            {rows.map((row, index) =>
              row.kind === 'separator' ? (
                <DropdownMenu.Separator key={row.key} className={SEPARATOR} />
              ) : row.href !== undefined || row.link ? (
                <DropdownMenu.Item key={row.key} asChild>
                  <a
                    href={row.href}
                    target={row.newTab ? '_blank' : undefined}
                    rel={row.newTab ? 'noreferrer' : undefined}
                    className={cn(ITEM, 'cursor-pointer')}
                    style={rowStyle(index)}
                    onClick={row.onSelect}
                  >
                    <RowContent icon={row.icon} index={index}>
                      {row.label}
                    </RowContent>
                  </a>
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item
                  key={row.key}
                  onSelect={row.onSelect}
                  className={cn(ITEM, 'cursor-pointer')}
                  style={rowStyle(index)}
                >
                  <RowContent icon={row.icon} index={index}>
                    {row.label}
                  </RowContent>
                </DropdownMenu.Item>
              ),
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <DeveloperKeyDialog open={developerKeyOpen} onOpenChange={setDeveloperKeyOpen} />
      <AccessibilityDialog open={accessibilityOpen} onOpenChange={setAccessibilityOpen} />
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        userName={account.data?.userName ?? ''}
        onNotice={setNotice}
      />
      <LanguageDialog open={languageOpen} onOpenChange={setLanguageOpen} />
      {notice && typeof document !== 'undefined'
        ? createPortal(
            <Toast
              id={notice.id}
              tone={notice.tone}
              message={notice.message}
              durationMs={noticeMs}
              dismissLabel={t(SharedResourceKeys.close)}
              onDismiss={dismissNotice}
            />,
            document.body,
          )
        : null}
    </>
  )
}
