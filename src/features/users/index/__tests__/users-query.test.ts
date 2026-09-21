import {
  cleanSearch,
  deleteUsersPath,
  INITIAL_QUERY,
  nextSort,
  PAGE_SIZES,
  parseUsersPage,
  queryKey,
  toParams,
} from '../users-query'

describe('users query rules', () => {
  it('starts on userName ascending with 100 rows', () => {
    expect(toParams(INITIAL_QUERY)).toEqual({
      currentPageIndex: 0,
      pageSize: 100,
      sortCol: 'userName',
      sortDir: 'asc',
      searchFilter: '',
    })
    expect(PAGE_SIZES).toEqual([10, 15, 20, 50, 100, 200])
  })

  it('trims and collapses repeated spaces like swgrid', () => {
    expect(cleanSearch('   maya     lee  ')).toBe('maya lee')
    expect(cleanSearch('')).toBe('')
  })

  it('flips the direction on the same column and starts a new column ascending', () => {
    const desc = nextSort(INITIAL_QUERY, 'userName')
    expect(desc).toMatchObject({ sortCol: 'userName', sortDir: 'desc' })
    expect(nextSort(desc, 'emailAddress')).toMatchObject({ sortCol: 'emailAddress', sortDir: 'asc' })
    expect(nextSort(desc, 'userName')).toMatchObject({ sortDir: 'asc' })
  })

  it('keeps the page index when sorting', () => {
    expect(nextSort({ ...INITIAL_QUERY, pageIndex: 3 }, 'fullName').pageIndex).toBe(3)
  })

  it('repeats the ids parameter for delete', () => {
    expect(deleteUsersPath([5, 6, 7])).toBe('UserApi?ids=5&ids=6&ids=7')
  })

  it('builds a stable key per query', () => {
    expect(queryKey(INITIAL_QUERY)).toBe(queryKey({ ...INITIAL_QUERY }))
    expect(queryKey(INITIAL_QUERY)).not.toBe(queryKey({ ...INITIAL_QUERY, search: 'a' }))
  })

  it('parses the paged response and rejects malformed rows or bodies', () => {
    const page = parseUsersPage({
      items: [
        {
          id: 1,
          userName: 'a',
          emailAddress: 'a@example.com',
          fullName: 'A',
          realName: 'A',
          associatedStudentId: null,
          accessProfiles: 'Admin',
        },
      ],
      totalRowCount: 12,
      seatsAuthorisationByPersonas: true,
    })
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({ id: 1, accessProfiles: 'Admin' })
    expect(page.totalRowCount).toBe(12)
    expect(page.seatsAuthorisationByPersonas).toBe(true)
    expect(() => parseUsersPage(null)).toThrow('parse: UserApi')
    expect(() => parseUsersPage({ items: [{ id: 'x' }], totalRowCount: 1 })).toThrow('parse: UserApi')
    expect(() => parseUsersPage({ items: [] })).toThrow('parse: UserApi')
  })

  // totalRowCount counts the row, so dropping it would hide an account an admin cannot then find or delete.
  it('keeps a user whose userName is null', () => {
    const page = parseUsersPage({
      items: [{ id: 9, userName: null, emailAddress: 'nine@example.com', fullName: 'Nine' }],
      totalRowCount: 1,
    })
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({ id: 9, userName: '', emailAddress: 'nine@example.com' })
  })
})
