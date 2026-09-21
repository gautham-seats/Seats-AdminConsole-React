import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { getLegacyViewHtml } from '@/shared/api/legacy-view'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { receiveNotificationPush, refreshNotificationCount } from '@/shared/shell/use-shell-data'
import type { UserNotificationDto } from '@/types/notifications'
import {
  canDeleteNotification,
  formatNotificationDate,
  isUnreadNotification,
  notificationListQuery,
} from '../notification-list'
import { parseShowExpirationColumn } from '../use-expiration-column'
import { UserNotificationsScreen } from '../UserNotificationsScreen'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/notifications',
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))
jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})
jest.mock('@/shared/api/legacy-view', () => ({ getLegacyViewHtml: jest.fn() }))
jest.mock('@/shared/shell/use-shell-data', () => {
  const actual = jest.requireActual('@/shared/shell/use-shell-data')
  return { ...actual, refreshNotificationCount: jest.fn() }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const view = jest.mocked(getLegacyViewHtml)
const refreshCount = jest.mocked(refreshNotificationCount)

const ROW: UserNotificationDto = {
  id: 7,
  userId: 1,
  userNotificationTypeId: 2,
  userNotificationTypeName: 'Export',
  description: 'Report ready',
  userNotificationStatusId: 2,
  userNotificationStatusName: 'Complete',
  dateCreated: '2026-09-15T14:30:00',
  expiresInDays: 3,
  externalGuid: null,
  showAsNew: true,
  userNotificationFile: { url: 'https://example.test/file.pdf' },
}

function claims() {
  return Promise.resolve([{ id: 40, actions: [{ id: 1 }] }])
}

function page(rows: UserNotificationDto[] = [ROW], total = rows.length) {
  return Promise.resolve({ items: rows, totalRowCount: total })
}

const renderScreen = () =>
  render(
    <ProfileProvider>
      <UserNotificationsScreen />
    </ProfileProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockResolvedValue(undefined)
  view.mockResolvedValue('showExpirationColumn: true')
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') return claims()
    if (path === 'UserNotificationApi') return page()
    if (path === 'usernotificationapi/count') return Promise.resolve(2)
    return Promise.resolve(null)
  })
})

describe('notification helpers', () => {
  it('builds the swgrid query in legacy order', () => {
    expect(
      notificationListQuery({
        pageIndex: 1,
        pageSize: 100,
        sort: { column: 'dateCreated', direction: 'desc' },
        search: '',
      }),
    ).toEqual({
      currentPageIndex: '1',
      pageSize: '100',
      sortCol: 'dateCreated',
      sortDir: 'desc',
      searchFilter: '',
    })
    expect(formatNotificationDate('2026-09-15T14:30:00')).toBe('15/09/2026 14:30')
    expect(isUnreadNotification({ showAsNew: true })).toBe(true)
    expect(canDeleteNotification({ userNotificationStatusId: 2 })).toBe(true)
    expect(canDeleteNotification({ userNotificationStatusId: 1 })).toBe(false)
    expect(parseShowExpirationColumn('showExpirationColumn: false')).toBe(false)
  })
})

describe('UserNotificationsScreen', () => {
  it('blocks users without UserNotifications access', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? Promise.resolve([{ id: 6, actions: [{ id: 1 }] }])
        : Promise.resolve(null),
    )
    renderScreen()
    expect(await screen.findByText('You do not have permission to view this page.')).toBeInTheDocument()
  })

  it('marks all notifications read on open and loads the paged list', async () => {
    renderScreen()
    expect(await screen.findAllByText('Report ready')).not.toHaveLength(0)
    await waitFor(() => expect(post).toHaveBeenCalledWith('usernotificationapi/setAllAsRead'))
    expect(refreshCount).toHaveBeenCalled()
    const call = get.mock.calls.find(([path]) => path === 'UserNotificationApi')
    expect(call?.[1]?.query).toEqual({
      currentPageIndex: '0',
      pageSize: '100',
      sortCol: '',
      sortDir: 'asc',
      searchFilter: '',
    })
  })

  it('reloads the list on a live push without hiding the current rows', async () => {
    renderScreen()
    expect(await screen.findAllByText('Report ready')).not.toHaveLength(0)
    let release: () => void = () => undefined
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'UserNotificationApi')
        return new Promise(resolve => {
          release = () =>
            resolve({ items: [{ ...ROW, id: 8, description: 'Import done' }, ROW], totalRowCount: 2 })
        })
      return Promise.resolve(null)
    })
    act(() => receiveNotificationPush())
    expect(screen.getAllByText('Report ready')).not.toHaveLength(0)
    await act(async () => release())
    expect(await screen.findAllByText('Import done')).not.toHaveLength(0)
    expect(screen.getByText('Total 2')).toBeInTheDocument()
  })

  it('keeps returned rows visible when the server reports a zero total', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'UserNotificationApi') return page([ROW], 0)
      return Promise.resolve(null)
    })
    renderScreen()
    expect(await screen.findAllByText('Report ready')).not.toHaveLength(0)
    expect(screen.getByText('Total 1')).toBeInTheDocument()
  })

  it('shows unread styling and can mark all as read again', async () => {
    renderScreen()
    expect(await screen.findAllByText('Report ready')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Mark all as read' })).not.toBeDisabled()
    post.mockClear()
    refreshCount.mockClear()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    })
    await waitFor(() => expect(post).toHaveBeenCalledWith('usernotificationapi/setAllAsRead'))
    expect(refreshCount).toHaveBeenCalled()
  })

  it('confirms delete, posts delete?id= and reloads', async () => {
    renderScreen()
    expect(await screen.findAllByText('Report ready')).not.toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByText('Are you sure you want to delete selected items?')).toBeInTheDocument()
    post.mockClear()
    refreshCount.mockClear()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    })
    await waitFor(() => expect(post).toHaveBeenCalledWith('usernotificationapi/delete', { query: { id: 7 } }))
    expect(refreshCount).toHaveBeenCalled()
    expect(await screen.findByText('The item was deleted succesfully.')).toBeInTheDocument()
  })

  it('shows safe mode when delete is blocked', async () => {
    post.mockImplementation((path: string) =>
      path === 'usernotificationapi/delete'
        ? Promise.reject(new ApiError('blocked', path))
        : Promise.resolve(undefined),
    )
    renderScreen()
    expect(await screen.findAllByText('Report ready')).not.toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    expect(
      await screen.findByText('Saving is switched off (safe mode). Nothing was changed.'),
    ).toBeInTheDocument()
  })

  it('shows empty and error states', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'UserNotificationApi') return Promise.resolve({ items: [], totalRowCount: 0 })
      if (path === 'usernotificationapi/count') return Promise.resolve(0)
      return Promise.resolve(null)
    })
    renderScreen()
    expect(await screen.findByText('There are no items to show.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()

    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'UserNotificationApi') return Promise.reject(new Error('fail'))
      return Promise.resolve(null)
    })
    renderScreen()
    expect(await screen.findAllByText('There was an error while processing your request.')).not.toHaveLength(
      0,
    )
  })

  it('F4-01 shows Retry instead of hiding expiration when its setting fails', async () => {
    view.mockRejectedValueOnce(new Error('fail'))
    renderScreen()

    expect(await screen.findByText('There was an error while processing your request.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Report ready' })).not.toBeInTheDocument()

    view.mockResolvedValue('showExpirationColumn: true')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('heading', { name: 'Report ready' })).toBeInTheDocument()
    expect(screen.getByText('3 Days')).toBeInTheDocument()
  })

  it('opens the chosen notification, filters by type and locks delete while processing', async () => {
    const processing: UserNotificationDto = {
      ...ROW,
      id: 8,
      userNotificationTypeId: 3,
      userNotificationTypeName: 'Security',
      description: 'Key rotation running',
      userNotificationStatusId: 1,
      userNotificationStatusName: 'Processing',
      showAsNew: false,
      userNotificationFile: null,
    }
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'UserNotificationApi') return page([ROW, processing])
      return Promise.resolve(null)
    })
    renderScreen()
    expect(await screen.findByRole('heading', { name: 'Report ready' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download file' })).toHaveAttribute(
      'href',
      'https://example.test/file.pdf',
    )

    fireEvent.click(screen.getByRole('option', { name: /Key rotation running/ }))
    expect(screen.getByRole('heading', { name: 'Key rotation running' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Export/ }))
    expect(screen.queryByRole('option', { name: /Key rotation running/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Report ready' })).toBeInTheDocument()
  })

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>'])(
    'does not render an unsafe notification file URL: %s',
    async unsafeUrl => {
      get.mockImplementation((path: string) => {
        if (path === 'UserApi/GetClaims') return claims()
        if (path === 'UserNotificationApi')
          return page([{ ...ROW, userNotificationFile: { url: unsafeUrl } }])
        return Promise.resolve(null)
      })
      renderScreen()
      expect(await screen.findByRole('heading', { name: 'Report ready' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Download file' })).not.toBeInTheDocument()
      expect(screen.getByText('This notification has no file.')).toBeInTheDocument()
    },
  )
})
