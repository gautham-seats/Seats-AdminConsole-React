import type { EventTypeInAccessProfileDto, ItemTypeViewModel } from '@/types/access-profiles'
import { buildVisibilityLens, eventRowId, type VisibilityCatalogue } from '../visibility-lens'

const eventType = (type: number, subType: number, description: string) =>
  ({ type, subType, description }) as ItemTypeViewModel

const picked = (
  type: number,
  subType: number,
  detail = false,
  comment = false,
): EventTypeInAccessProfileDto => ({ id: 0, accessProfileId: 1, type, subType, detail, comment })

const CATALOGUE: VisibilityCatalogue = {
  events: [eventType(1, 0, 'Exam'), eventType(1, 1, 'Lecture'), eventType(2, 0, 'Absence')],
  cases: [
    { id: 5, description: 'Attendance concern' },
    { id: 6, description: 'Appeal' },
    { id: 7, description: 'Complaint' },
  ],
  workflows: [
    { id: 11, description: 'Escalation' },
    { id: 12, description: 'At-risk review' },
  ],
}

const build = (
  tab: 'events' | 'cases' | 'workflows',
  over: Partial<Parameters<typeof buildVisibilityLens>[0]>,
) =>
  buildVisibilityLens({
    tab,
    catalogue: CATALOGUE,
    selectedEvents: [],
    selectedCases: [],
    selectedWorkflows: [],
    ...over,
  })

describe('visibility lens', () => {
  it('splits event types into visible and hidden, and counts details and comments', () => {
    const lens = build('events', {
      selectedEvents: [picked(1, 0, true, true), picked(1, 1, false, false)],
    })
    expect(lens.counts).toEqual({ open: 2, allowed: 1, shut: 1 })
    expect(lens.visible.map(item => item.name)).toEqual(['Exam', 'Lecture'])
    expect(lens.hidden.map(item => item.name)).toEqual(['Absence'])
    expect(lens.tail).toContain('comments on 1')
  })

  // type and subType together identify a row; 1:1 must not be read as 1:0.
  it('keeps event sub-types apart', () => {
    expect(eventRowId(eventType(1, 0, 'Exam'))).not.toBe(eventRowId(eventType(1, 1, 'Lecture')))
    const lens = build('events', { selectedEvents: [picked(1, 1)] })
    expect(lens.visible.map(item => item.name)).toEqual(['Lecture'])
  })

  it('reads cases as "only these of the total"', () => {
    const lens = build('cases', { selectedCases: [6] })
    expect(lens.counts).toEqual({ open: 1, allowed: 3, shut: 2 })
    expect(lens.typed).toBe('Appeal')
    expect(lens.hidden.map(item => item.id)).toEqual([5, 7])
  })

  it('reads workflows the same way', () => {
    const lens = build('workflows', { selectedWorkflows: [11, 12] })
    expect(lens.counts).toEqual({ open: 2, allowed: 2, shut: 0 })
    expect(lens.hidden).toHaveLength(0)
  })

  it('says nothing is selected rather than showing an empty sentence', () => {
    const lens = build('cases', {})
    expect(lens.counts.open).toBe(0)
    expect(lens.typed).toBe('')
    expect(lens.emptyVisible).toMatch(/No case type/)
  })

  it('caps the typed names and counts the rest', () => {
    const lens = build('cases', { selectedCases: [5, 6, 7] })
    expect(lens.typed).toBe('Attendance concern, Appeal, Complaint')
    const many = buildVisibilityLens({
      tab: 'workflows',
      catalogue: {
        ...CATALOGUE,
        workflows: [1, 2, 3, 4, 5].map(id => ({ id, description: `Flow ${id}` })),
      },
      selectedEvents: [],
      selectedCases: [],
      selectedWorkflows: [1, 2, 3, 4, 5],
    })
    expect(many.typed).toBe('Flow 1, Flow 2, Flow 3 +2')
  })
})
