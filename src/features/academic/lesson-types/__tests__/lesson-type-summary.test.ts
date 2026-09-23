import { buildMeaning, type SummaryInput } from '../LessonTypeSummary'

const base: SummaryInput = {
  early: '30',
  late: '15',
  absence: '30',
  percentage: '75',
  checkoutCutoff: '10',
  absenceBasedOnStart: true,
  isActive: true,
  gpsEnabled: true,
  checkout: false,
  showCheckout: true,
  scalingLabel: null,
  consecutive: false,
  showConsecutive: false,
}

const joined = (over: Partial<SummaryInput> = {}) => buildMeaning({ ...base, ...over }).join(' | ')

describe('buildMeaning', () => {
  it('states each cut-off as the rule it produces', () => {
    const text = joined()
    expect(text).toContain('from 30 minutes before the lesson starts')
    expect(text).toContain('up to 15 minutes after the start')
    expect(text).toContain('After 30 minutes from the start')
    expect(text).toContain('At least 75%')
  })

  it('switches the absence sentence when absence is measured from the end', () => {
    expect(joined({ absenceBasedOnStart: false })).toContain('After 30 minutes from the end')
  })

  it('reads a blank cut-off as unset rather than printing NaN', () => {
    const text = joined({ early: '', late: '  ', absence: '', percentage: '' })
    expect(text).not.toContain('NaN')
    expect(text).toContain('No early cut-off is set')
    expect(text).toContain('No late cut-off is set')
    expect(text).toContain('No absence cut-off is set')
    expect(text).toContain('No minimum attended percentage is set')
  })

  // Real Alpha rows store 0 for "no constraint"; "At least 0%" would be a false statement.
  it('reads zero as no constraint for percentage and the check-out window', () => {
    const text = joined({ percentage: '0', checkoutCutoff: '0' })
    expect(text).toContain('No minimum attended percentage is set')
    expect(text).not.toContain('At least 0%')
    expect(text).not.toContain('up to 0 minutes')
  })

  it('keeps a zero early cut-off, where zero is a real boundary', () => {
    expect(joined({ early: '0' })).toContain('from 0 minutes before the lesson starts')
  })

  it('describes each check-out policy and hides the block without the permission', () => {
    expect(joined({ checkout: true })).toContain('must check out')
    expect(joined({ checkout: false })).toContain('may check out')
    expect(joined({ checkout: null })).toContain('Check-out is turned off')
    expect(joined({ showCheckout: false })).not.toContain('check out')
  })

  // These four are plain values listed in AllSettingsList; repeating them as sentences pushed the
  // panel past the bottom of the screen, so the meaning list covers the cut-off rules only.
  it('leaves the plain values to the All settings list', () => {
    const text = joined({
      scalingLabel: 'Only If Absent',
      consecutive: true,
      showConsecutive: true,
      isActive: false,
    })
    expect(text).not.toContain('scaled by duration')
    expect(text).not.toContain('Consecutive absences')
    expect(text).not.toContain('inactive')
    expect(joined({ gpsEnabled: true })).not.toContain('room location')
  })

  // Six is the ceiling: four cut-off rules, the check-out policy and the check-out window.
  it('stays short enough to fit beside the form', () => {
    expect(buildMeaning(base).length).toBeLessThanOrEqual(6)
    expect(buildMeaning({ ...base, showCheckout: false }).length).toBeLessThanOrEqual(4)
  })

  it('produces no duplicate lines, which would collide as React keys', () => {
    const lines = buildMeaning({ ...base, early: '', late: '' })
    expect(new Set(lines).size).toBe(lines.length)
  })
})
