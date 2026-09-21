import type { MenuLink, TopEntry } from '../admin-menu'
import { buildSearchItems, completion, matchName, parseScope, pushRecent, rankItems } from '../nav-search'

const link = (id: string, fallback: string): MenuLink => ({
  id,
  labelKey: null,
  fallback,
  icon: 'users',
  legacyRoute: `#/${id}`,
})
const entry = (id: string, fallback: string, children: MenuLink[] = []): TopEntry => ({
  ...link(id, fallback),
  children,
})

const ENTRIES = [
  entry('imports', 'Imports'),
  entry('students', 'Students', [link('delete', 'Student Deletion'), link('bin', 'Recycle Bin')]),
]
const items = buildSearchItems(ENTRIES, item => item.fallback)

describe('nav search', () => {
  it('flattens groups and keeps single entries', () => {
    expect(items.map(item => [item.name, item.area])).toEqual([
      ['Imports', null],
      ['Student Deletion', 'Students'],
      ['Recycle Bin', 'Students'],
    ])
  })

  it('ranks prefix over contains over letters in order', () => {
    expect(matchName('Imports', 'imp')?.score).toBe(300)
    expect(matchName('Recycle Bin', 'bin')?.indices).toEqual([8, 9, 10])
    expect(matchName('Recycle Bin', 'rcyl')?.indices).toEqual([0, 2, 3, 5])
    expect(matchName('Imports', 'zz')).toBeNull()
  })

  it('filters by scope and matches the area name', () => {
    expect(rankItems(items, 'stud', null).map(match => match.item.name)).toEqual([
      'Student Deletion',
      'Recycle Bin',
    ])
    expect(rankItems(items, 'i', 'Students').every(match => match.item.area === 'Students')).toBe(true)
  })

  it('reads an @area prefix', () => {
    expect(parseScope('@stu bin', ['Students'])).toEqual({ scope: 'Students', rest: 'bin' })
    expect(parseScope('@stu', ['Students'])).toBeNull()
    expect(parseScope('@zz ', ['Students'])).toBeNull()
  })

  it('completes only a page that starts with the text', () => {
    expect(completion('rec', items[2])).toBe('ycle Bin')
    expect(completion('bin', items[2])).toBe('')
  })

  it('keeps recent keys unique and short', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b', 2)).toEqual(['b', 'a'])
  })
})

describe('nav search accent folding (SL-32)', () => {
  it('matches accented names with plain letters and keeps highlight indices', () => {
    expect(matchName('Étudiants', 'etu')).toEqual({ score: 300, indices: [0, 1, 2] })
    expect(matchName('Zoë', 'zoe')).not.toBeNull()
    const accented = buildSearchItems(
      [entry('etudiants', 'Étudiants', [link('liste', 'Liste')])],
      item => item.fallback,
    )
    expect(rankItems(accented, 'etud', null).map(match => match.item.name)).toEqual(['Étudiants'])
    expect(parseScope('@etu x', ['Étudiants'])).toEqual({ scope: 'Étudiants', rest: 'x' })
    expect(completion('Étu', accented[0])).toBe('diants')
    expect(completion('etu', { ...accented[0], name: 'Étudiants' })).toBe('diants')
  })
})
