import {
  buildPermissionLookup,
  copyProfile,
  eventHeaderState,
  filterEventTypes,
  isLandingPageEnabled,
  isUnknownLandingPage,
  landingPageValid,
  parseAccessProfileContainer,
  parseEventTypes,
  setEventColumn,
  toggleEventColumn,
  togglePermission,
  toSaveBody,
  validateAccessProfile,
} from '../access-profile-form'

const container = parseAccessProfileContainer({
  details: {
    id: 4,
    name: 'Registry',
    selectedPermissions: [101],
    defaultLandingPage: 2,
    selectedEvents: null,
  },
  nodes: [
    {
      id: 0,
      description: null,
      childNodes: [
        {
          id: 1,
          description: 'Attendance',
          childNodes: [],
          permissions: [
            {
              id: 20,
              name: 'Lectures',
              permissionDefinitionActions: [
                { id: 1, name: 'Access', permissionDefinitionActionInItemId: 101 },
                { id: 3, name: 'Edit', permissionDefinitionActionInItemId: 102 },
              ],
            },
          ],
        },
      ],
      permissions: null,
    },
  ],
})

const lookup = buildPermissionLookup(container.nodes)
const lectures = { id: 2, description: null, permissionDefinitionItemId: 20, permissionDefinitionActionId: 1 }
const reports = { id: 3, description: null, permissionDefinitionItemId: 21, permissionDefinitionActionId: 1 }

describe('access profile form', () => {
  it('flags a landing page id that no loaded page has', () => {
    expect(isUnknownLandingPage(null, [])).toBe(false)
    expect(isUnknownLandingPage(2, [lectures, reports])).toBe(false)
    expect(isUnknownLandingPage(7, [lectures, reports])).toBe(true)
    expect(isUnknownLandingPage(2, [])).toBe(true)
  })

  it('maps permission item and action to the saved action-in-item id', () => {
    expect(lookup.get('20_1')).toBe(101)
    expect(lookup.get('20_3')).toBe(102)
  })

  it('enables a landing page only when its Access permission is ticked', () => {
    expect(isLandingPageEnabled(lectures, lookup, [101])).toBe(true)
    expect(isLandingPageEnabled(lectures, lookup, [102])).toBe(false)
    expect(isLandingPageEnabled(reports, lookup, [101])).toBe(false)
    expect(landingPageValid(null, [], lookup, [])).toBe(true)
    expect(landingPageValid(2, [lectures], lookup, togglePermission([101], 101))).toBe(false)
  })

  it('copies a profile as a new one with a suffixed name', () => {
    expect(copyProfile(container.details)).toMatchObject({
      id: 0,
      name: 'Registry (1)',
      selectedPermissions: [101],
    })
  })

  it('saves missing visibility lists as empty lists', () => {
    expect(toSaveBody(container.details)).toMatchObject({
      selectedEvents: [],
      selectedCases: [],
      selectedWorkflows: [],
    })
    const kept = { ...container.details, selectedCases: [5] }
    expect(toSaveBody(kept).selectedCases).toEqual([5])
  })

  it('requires a name and blocks angle brackets once the special character rule is on', () => {
    expect(validateAccessProfile({ ...container.details, name: ' ', externalKey: '<x>' }, true)).toEqual({
      name: 'required',
      externalKey: 'specialCharacters',
    })
    expect(validateAccessProfile({ ...container.details, name: '<a>', externalKey: '<x>' }, true)).toEqual({
      name: 'specialCharacters',
      externalKey: 'specialCharacters',
    })
  })

  it('checks only Required before the first Save switches the special character rule on', () => {
    expect(validateAccessProfile({ ...container.details, name: '<a>', externalKey: '<x>' })).toEqual({})
    expect(validateAccessProfile({ ...container.details, name: '' })).toEqual({ name: 'required' })
  })
})

describe('event visibility', () => {
  const types = parseEventTypes({
    events: [{ id: 7, type: 5, subType: 7, description: 'Exam' }],
    caseSteps: [{ id: 2, type: 1, subType: 2, description: 'Referral' }],
    general: [{ id: 'Stage Changes', value: [{ id: 3, type: 3, subType: 3, description: 'Stage changes' }] }],
    selected: [{ id: 9, accessProfileId: 4, type: 5, subType: 7, detail: true, comment: false }],
  })
  const rows = [...types.caseSteps, ...types.general[0].value, ...types.events]

  it('adds a row with Event, flips Details only on a selected row and removes with Event', () => {
    const added = toggleEventColumn(types.selected, types.caseSteps[0], 'event', 4)
    expect(added[1]).toEqual({
      id: 0,
      type: 1,
      subType: 2,
      accessProfileId: 4,
      detail: false,
      comment: false,
    })
    expect(toggleEventColumn(added, types.caseSteps[0], 'detail', 4)[1].detail).toBe(true)
    expect(toggleEventColumn(types.selected, types.caseSteps[0], 'comment', 4)).toHaveLength(1)
    expect(toggleEventColumn(added, types.events[0], 'event', 4)).toHaveLength(1)
  })

  it('ticks whole columns and reports the header states', () => {
    const all = setEventColumn(types.selected, rows, 'event', true, 4)
    expect(all).toHaveLength(3)
    expect(eventHeaderState(all, rows.length)).toEqual({
      event: true,
      detail: false,
      comment: false,
      detailDisabled: false,
    })
    expect(eventHeaderState(setEventColumn(all, rows, 'detail', true, 4), rows.length).detail).toBe(true)
    expect(setEventColumn(all, rows, 'event', false, 4)).toEqual([])
    expect(eventHeaderState([], rows.length).detailDisabled).toBe(true)
  })

  it('changes only the rows shown by the search when a header box is clicked', () => {
    const all = setEventColumn(types.selected, rows, 'event', true, 4)
    const shown = filterEventTypes(types, 'refer', 'Events')
    const shownRows = [...shown.caseSteps, ...shown.general.flatMap(group => group.value), ...shown.events]
    const commented = setEventColumn(all, shownRows, 'comment', true, 4)
    expect(commented.map(event => [event.type, event.comment])).toEqual([
      [5, false],
      [1, true],
      [3, false],
    ])
    expect(setEventColumn(all, shownRows, 'event', false, 4).map(event => event.type)).toEqual([5, 3])
    expect(setEventColumn([], shownRows, 'event', true, 4).map(event => event.type)).toEqual([1])
  })

  it('filters by description, group name or the Events title', () => {
    const referral = filterEventTypes(types, 'refer', 'Events')
    expect([referral.caseSteps.length, referral.events.length, referral.general.length]).toEqual([1, 0, 0])
    expect(filterEventTypes(types, 'stage', 'Events').general).toHaveLength(1)
    expect(filterEventTypes(types, 'even', 'Events').events).toHaveLength(1)
  })
})
