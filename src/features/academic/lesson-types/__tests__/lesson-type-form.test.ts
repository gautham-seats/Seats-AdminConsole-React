import type { LessonTypeDto } from '@/types/lesson-types'
import {
  checkoutKey,
  INITIAL_SORT,
  nextSort,
  NUMBER_FIELDS,
  parseLessonType,
  parseLessonTypeId,
  parseLessonTypes,
  parseLessonTypeView,
  readTenantFlags,
  scalingKey,
  sortLessonTypes,
  toLessonTypeForm,
  toLessonTypePayload,
  validateLessonType,
} from '../lesson-type-form'

const DETAIL = {
  id: 4,
  name: 'LEC',
  description: 'Lecture',
  earlyCutoff: 10,
  lateCutoff: 15,
  absenceCutoff: 30,
  percentageCutoff: 50,
  checkoutCutoff: 5,
  isAbsenceBasedOnStart: true,
  isAttendanceBasedOnCheckout: null,
  attendanceScaling: null,
  isGPSEnabled: false,
  isActive: true,
  globalId: '6f1c0e5e-0000-0000-0000-000000000000',
  isConsecutiveAttendanceUpdate: false,
  isAbsenceBasedOnStartCutOff: null,
  isMandatory: null,
}

describe('lesson type form', () => {
  it('reads the tenant flags from the rendered partial', () => {
    const partial = `<script>x('/api/LessonTypeApi/')</script>`
    expect(readTenantFlags(`${partial}<th id="name-lesson-type-col"></th>`)).toEqual({
      attendanceByDuration: false,
      consecutiveAttendanceUpdate: false,
    })
    expect(
      readTenantFlags(
        `${partial}<th id="attendance-scaling-col"></th><th id="is-consecutive-attendance-update-col"></th>`,
      ),
    ).toEqual({ attendanceByDuration: true, consecutiveAttendanceUpdate: true })
    expect(readTenantFlags(`${partial}<select id="attendance-scaling"></select>`)?.attendanceByDuration).toBe(
      true,
    )
  })

  it('formats checkout and scaling like the index', () => {
    expect([null, true, false].map(checkoutKey)).toEqual(['Disabled', 'Mandatory', 'Optional'])
    expect([null, 0, 1, 2, 3].map(scalingKey)).toEqual([
      'None',
      'None',
      'Enabled',
      'OnlyIfAbsent',
      'OnlyIfAttended',
    ])
  })

  it('sorts by description first and flips the same column', () => {
    const rows = [
      { ...DETAIL, id: 1, description: 'Seminar', earlyCutoff: 5 },
      { ...DETAIL, id: 2, description: 'Lab', earlyCutoff: 20 },
      { ...DETAIL, id: 3, description: 'Lecture', earlyCutoff: 12 },
    ]
    expect(sortLessonTypes(rows, INITIAL_SORT).map(row => row.id)).toEqual([2, 3, 1])
    const byEarly = nextSort(INITIAL_SORT, 'earlyCutoff')
    expect(sortLessonTypes(rows, byEarly).map(row => row.id)).toEqual([1, 3, 2])
    expect(nextSort(byEarly, 'earlyCutoff').dir).toBe('desc')
  })

  it('requires the three cutoffs and whole numbers in visible fields only', () => {
    const form = {
      ...toLessonTypeForm(DETAIL),
      earlyCutoff: ' ',
      lateCutoff: '2.5',
      percentageCutoff: '',
      checkoutCutoff: 'x',
    }
    expect(
      validateLessonType(form, ['earlyCutoff', 'lateCutoff', 'absenceCutoff', 'percentageCutoff']),
    ).toEqual({
      earlyCutoff: 'required',
      lateCutoff: 'wholeNumber',
    })
    expect(validateLessonType(form, ['checkoutCutoff'])).toEqual({ checkoutCutoff: 'wholeNumber' })
  })

  it('posts the whole DTO with numbers and blank optional cutoffs as null', () => {
    const payload = toLessonTypePayload({
      ...toLessonTypeForm(DETAIL),
      lateCutoff: '20',
      percentageCutoff: '',
    })
    expect(payload).toEqual({ ...DETAIL, lateCutoff: 20, percentageCutoff: null })
  })

  it('accepts only positive ids and existing details', () => {
    expect(['4', '0', '-1', 'new', '4.5'].map(parseLessonTypeId)).toEqual([4, null, null, null, null])
    // Id 0 is the empty DTO the controller returns for a missing id, so it is "no such record".
    expect(parseLessonTypeView({ detail: { ...DETAIL, id: 0 } })).toEqual({ kind: 'notFound' })
    expect(
      parseLessonTypeView({
        detail: DETAIL,
        attendanceScalingAvailables: [{ id: 1, description: 'Enabled' }],
      }),
    ).toMatchObject({
      kind: 'ok',
      view: {
        attendanceScalingAvailables: [{ id: 1, description: 'Enabled' }],
        attendanceBasedOnCheckoutAvailables: [],
      },
    })
  })

  // A cut-off that is not a number must stay empty, never become the 0 the user did not type.
  it('keeps a null or unusable cut-off empty and blocks the save', () => {
    const parsed = parseLessonType({ ...DETAIL, earlyCutoff: null, lateCutoff: 'x', absenceCutoff: 15 })
    expect(parsed).toMatchObject({ earlyCutoff: null, lateCutoff: null, absenceCutoff: 15 })
    const form = toLessonTypeForm(parsed as LessonTypeDto)
    expect([form.earlyCutoff, form.lateCutoff, form.absenceCutoff]).toEqual(['', '', '15'])
    expect(validateLessonType(form, [...NUMBER_FIELDS])).toMatchObject({
      earlyCutoff: 'required',
      lateCutoff: 'required',
    })
  })

  // JSON.stringify used to hide this by turning NaN into null; the value is now null on purpose.
  it('sends null, never NaN, for a cut-off that is not a number', () => {
    const form = toLessonTypeForm(parseLessonType(DETAIL) as LessonTypeDto)
    const payload = toLessonTypePayload({ ...form, checkoutCutoff: 'abc', percentageCutoff: '' })
    expect(payload.checkoutCutoff).toBeNull()
    expect(payload.percentageCutoff).toBeNull()
    expect(payload.earlyCutoff).toBe(10)
  })

  // A body we cannot read is a broken contract, not a missing lesson type: the two states differ.
  it('separates a missing lesson type from an unreadable body', () => {
    expect(parseLessonTypeView({ detail: { ...DETAIL, id: 0 } })).toEqual({ kind: 'notFound' })
    for (const raw of [null, undefined, 'x', 42, {}, { detail: null }, { detail: {} }, { detail: [] }])
      expect(parseLessonTypeView(raw)).toEqual({ kind: 'malformed' })
  })

  // Alpha returns a bare null list for a tenant with no lesson types; that is empty, never an error.
  it('reads a null or unusable list as empty and drops rows with no id', () => {
    for (const raw of [null, undefined, {}, 'x']) expect(parseLessonTypes(raw)).toEqual([])
    expect(parseLessonTypes([])).toEqual([])
    expect(parseLessonTypes([DETAIL, { name: 'no id' }, null]).map(item => item.id)).toEqual([4])
  })
})

// Index.cshtml:154 and Details.cshtml:142 both print this url in their init script.
const PARTIAL = `<script>x({ apiController: '/Seats.Trunk.Admin/api/LessonTypeApi/' })</script>`

describe('readTenantFlags with real partial markup', () => {
  it('finds the flags regardless of quote style, attribute order and spacing', () => {
    const index = `${PARTIAL}<table><thead><tr><th class="text-center" id = 'attendance-scaling-col' data-bind="text: x">Scaling</th>
      <th data-sort="c" id="is-consecutive-attendance-update-col">Consecutive</th></tr></thead></table>`
    expect(readTenantFlags(index)).toEqual({ attendanceByDuration: true, consecutiveAttendanceUpdate: true })
    const details = `${PARTIAL}<select class="form-control" ID="attendance-scaling"></select>`
    expect(readTenantFlags(details)).toEqual({
      attendanceByDuration: true,
      consecutiveAttendanceUpdate: false,
    })
    expect(readTenantFlags(`${PARTIAL}<div data-id="attendance-scaling"></div>`)).toEqual({
      attendanceByDuration: false,
      consecutiveAttendanceUpdate: false,
    })
  })

  // A sign-in page or a changed partial must not read as "both tenant flags are off".
  it('returns null when the response is not the lesson type partial', () => {
    expect(readTenantFlags('<form action="/Account/ForceLogin"><input name="password"/></form>')).toBeNull()
    expect(readTenantFlags('')).toBeNull()
    expect(readTenantFlags('<th id="attendance-scaling-col"></th>')).toBeNull()
  })
})
