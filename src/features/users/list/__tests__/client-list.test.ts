import { resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import { parseAccessProfiles } from '../../access-profiles/access-profiles-api'
import { formatExpiryDate, parseDeveloperKeysPage } from '../../developer-keys/developer-keys-api'
import { deleteIdsPath, legacyCompare, nextListSort, pageItems, searchItems, sortItems } from '../client-list'
import { NO_SELECTION, togglePageSelection } from '../list-state'

type Row = { id: number; name: string | null; email: string | null }

const rows: Row[] = [
  { id: 1, name: 'beta', email: 'b@example.com' },
  { id: 2, name: 'Alpha', email: null },
  { id: 3, name: null, email: 'alpha@example.com' },
  { id: 4, name: 'alpha', email: 'a@example.com' },
]

describe('client list helpers', () => {
  it('searches the listed fields ignoring case', () => {
    expect(searchItems(rows, 'ALPHA', ['name']).map(row => row.id)).toEqual([2, 4])
    expect(searchItems(rows, 'alpha', ['name', 'email']).map(row => row.id)).toEqual([2, 3, 4])
    expect(searchItems(rows, '', ['name'])).toHaveLength(4)
  })

  it('sorts like the legacy comparison with nulls first and keeps ties in order', () => {
    expect(legacyCompare('a', 'B')).toBe(1)
    expect(legacyCompare(null, 'a')).toBe(-1)
    expect(
      sortItems(rows, { col: 'name', dir: 'asc' }, (row, col: 'name') => row[col]).map(row => row.id),
    ).toEqual([3, 2, 4, 1])
    expect(
      sortItems(rows, { col: 'name', dir: 'desc' }, (row, col: 'name') => row[col]).map(row => row.id),
    ).toEqual([1, 4, 2, 3])
  })

  it('flips the same column and starts a new column ascending', () => {
    expect(nextListSort({ col: 'name', dir: 'asc' }, 'name')).toEqual({ col: 'name', dir: 'desc' })
    expect(nextListSort<'name' | 'email'>({ col: 'name', dir: 'desc' }, 'email')).toEqual({
      col: 'email',
      dir: 'asc',
    })
  })

  it('pages and builds the repeated ids delete path', () => {
    expect(pageItems(rows, 1, 3).map(row => row.id)).toEqual([4])
    expect(deleteIdsPath('ContactGroupApi', [5, 9])).toBe('ContactGroupApi?ids=5&ids=9')
  })

  it('adds the page to the selection or clears everything when the page is already selected', () => {
    const partial = togglePageSelection(new Set([9]), [1, 2])
    expect([...partial]).toEqual([9, 1, 2])
    expect(togglePageSelection(partial, [1, 2])).toBe(NO_SELECTION)
  })
})

describe('list parsers', () => {
  it('treats a null access profile response as an empty list', () => {
    expect(parseAccessProfiles(null)).toEqual([])
    expect(parseAccessProfiles([{ id: 4, description: 'Admin', isEnabled: false }])).toEqual([
      { id: 4, description: 'Admin', isEnabled: false, globalId: null, visible: false },
    ])
  })

  it('never keeps the developer key value', () => {
    const page = parseDeveloperKeysPage({
      items: [
        {
          id: 1,
          userId: 7,
          userName: 'a.b',
          fullName: 'A B',
          developerKey: 'secret',
          expiryDate: '2026-10-01T09:05:00',
        },
      ],
      totalRowCount: 31,
    })
    expect(page.totalRowCount).toBe(31)
    expect(page.items[0]).not.toHaveProperty('developerKey')
    expect(JSON.stringify(page)).not.toContain('secret')
  })

  it('formats the expiry date as en-GB wall-clock time', () => {
    expect(formatExpiryDate('2026-10-01T09:05:07.123Z')).toBe('01/10/2026 09:05:07')
    expect(formatExpiryDate(null)).toBe('')
    expect(formatExpiryDate('not a date')).toBe('')
  })

  it('G1-2 follows the UI culture short-date pattern', () => {
    setUiCulture('en-US')
    try {
      expect(formatExpiryDate('2026-10-01T09:05:07.123Z')).toBe('10/01/2026 09:05:07')
    } finally {
      resetUiCulture()
    }
  })
})
