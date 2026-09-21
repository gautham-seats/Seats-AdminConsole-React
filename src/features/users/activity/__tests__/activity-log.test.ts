import { ApiError } from '@/shared/api'
import { resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import {
  auditDetailLink,
  auditItemKey,
  describeAuditDetail,
  formatDisplayDate,
  initialAuditQuery,
  nextAuditSort,
  parseAuditPage,
  showAuditPager,
  toAuditBody,
} from '../activity-log'

const labels = { AdminSite: 'Administration Site', WebSite: 'WebSite', DefaultPage: 'Default Page' }
const detail = (auditType: string, value: object) => ({ auditType, detail: JSON.stringify(value) })

describe('audit query', () => {
  it('posts the legacy defaults for today', () => {
    expect(toAuditBody(initialAuditQuery(new Date(2026, 8, 15, 14, 30)))).toEqual({
      pageNumber: 0,
      pageSize: 100,
      sortCol: 'accessDate',
      sortDir: 'desc',
      type: '',
      user: '',
      site: '',
      from: '2026-09-15',
      to: '2026-09-15',
    })
  })

  it('sends the selected user id and range', () => {
    const query = {
      ...initialAuditQuery(new Date(2026, 8, 15)),
      user: { id: 42, name: 'maya.lee' },
      range: { from: new Date(2026, 7, 30), to: new Date(2026, 8, 2) },
    }
    expect(toAuditBody(query)).toMatchObject({ user: 42, from: '2026-08-30', to: '2026-09-02' })
  })

  it('sorts ascending first, flips the same column and returns to page 0', () => {
    const start = { ...initialAuditQuery(new Date()), pageIndex: 3 }
    const byUser = nextAuditSort(start, 'userName')
    expect([byUser.sortCol, byUser.sortDir, byUser.pageIndex]).toEqual(['userName', 'asc', 0])
    expect(nextAuditSort(byUser, 'userName').sortDir).toBe('desc')
    expect(nextAuditSort(start, 'accessDate').sortDir).toBe('asc')
  })

  it('shows the pager only past one page', () => {
    expect(showAuditPager(100, 100)).toBe(false)
    expect(showAuditPager(101, 100)).toBe(true)
  })

  it('reads a well-formed page', () => {
    const page = parseAuditPage({ items: [{ id: 1, auditType: 'Page' }], totalRowCount: 7 })
    expect(page.items).toHaveLength(1)
    expect(page.totalRowCount).toBe(7)
  })

  it('rejects a malformed body instead of showing an empty list', () => {
    expect(() => parseAuditPage({ items: [{ userName: 'x' }], totalRowCount: 7 })).toThrow(ApiError)
    expect(() => parseAuditPage({ unexpected: [] })).toThrow(ApiError)
    expect(() => parseAuditPage({ items: [], totalRowCount: '7' })).toThrow(ApiError)
  })

  it('G1-2 shows the range dates in the UI culture short-date pattern', () => {
    expect(formatDisplayDate(new Date(2026, 8, 15))).toBe('15/09/2026')
    setUiCulture('en-US')
    try {
      expect(formatDisplayDate(new Date(2026, 8, 15))).toBe('09/15/2026')
    } finally {
      resetUiCulture()
    }
  })
})

describe('audit detail', () => {
  it('names each audit type', () => {
    expect(['Page', 'Action', 'Cancel', 'Login', null].map(auditItemKey)).toEqual([
      'SeatsPageview',
      'SeatsAction',
      'SeatsCancel',
      'SeatsLogon',
      'SeatsLogon',
    ])
  })

  it('describes logons, page views and default pages', () => {
    expect(describeAuditDetail(detail('Login', { site: 'admin' }), labels)).toBe('Administration Site')
    expect(describeAuditDetail(detail('Login', { site: 'web' }), labels)).toBe('WebSite')
    expect(describeAuditDetail(detail('Page', { path: '#/user/Details/4', site: 'admin' }), labels)).toBe(
      '/User/Details/4',
    )
    expect(describeAuditDetail(detail('Page', { path: '#', site: 'admin' }), labels)).toBe(
      'Default Page  (ADMIN)',
    )
    expect(describeAuditDetail(detail('Page', { path: 'https://x.test/a' }), labels)).toBe('https://x.test/a')
  })

  it('describes actions with and without extra details', () => {
    const extra = (value: object, action = 'created') =>
      detail('Action', { action, extra: value, path: '#/room' })
    expect(describeAuditDetail(extra({ type: 'ROOM', roomCode: 'R1', roomName: 'Hall' }), labels)).toBe(
      'CREATED  Room R1 - Hall',
    )
    expect(
      describeAuditDetail(
        extra({ type: 'DEVICE-ROOM', roomCode: 'R1', roomName: 'Hall', serial: 'S9' }, 'deleted'),
        labels,
      ),
    ).toBe('DELETED room R1 - Hall from device S9')
    expect(
      describeAuditDetail(extra({ type: 'STUDENTSCHEDULE', lecture: 7, student: 3, module: 'M1' }), labels),
    ).toBe('CREATED  lecture 7  student 3 module M1')
    expect(
      describeAuditDetail(
        extra({
          type: 'QR-OPENED',
          qr: 'Dynamic',
          timetableId: 12,
          start: '2026-09-15T10:00:00',
          end: '2026-09-15T10:45:20',
        }),
        labels,
      ),
    ).toBe('CREATED type Dynamic lecture 12 duration 45 minutes')
    expect(
      describeAuditDetail(extra({ type: 'ATTACHMENT', detail: 'upload', attachement: 'a.pdf' }), labels),
    ).toBe('CREATED upload N/A - attachment a.pdf')
    expect(
      describeAuditDetail(detail('Cancel', { action: 'cancel', room: 'R2', path: '#/lecture' }), labels),
    ).toBe('(CANCEL) Room: R2 /Lecture')
  })

  it('links only safe URLs and skips deleted actions', () => {
    expect(auditDetailLink(detail('Page', { url: 'https://admin.test/#/User' }))).toBe(
      'https://admin.test/#/User',
    )
    expect(auditDetailLink(detail('Page', { url: 'javascript:alert(1)' }))).toBeNull()
    expect(
      auditDetailLink(
        detail('Action', { url: 'https://a.test/', action: 'deleted', extra: { type: 'ROOM' } }),
      ),
    ).toBeNull()
    expect(
      auditDetailLink(
        detail('Action', { url: 'https://a.test/', action: 'deleted', extra: { type: 'DEVICE-ROOM' } }),
      ),
    ).toBe('https://a.test/')
    expect(auditDetailLink(detail('Action', { url: 'https://a.test/', action: 'created' }))).toBeNull()
  })
})
