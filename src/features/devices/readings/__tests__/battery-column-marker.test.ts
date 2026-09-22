import { hasBatteryColumn } from '../../index/devices-api'

// Placed here because src/features/devices/index/__tests__ is owned by another agent this pass.
describe('hasBatteryColumn', () => {
  it('detects the data-column marker used by Views/Device/Index.cshtml:127', () => {
    expect(
      hasBatteryColumn(
        '<th tabindex="0" name="battery-percent-col" data-column="batteryPercent">Battery %</th>',
      ),
    ).toBe(true)
  })

  it('still detects the legacy id marker', () => {
    expect(hasBatteryColumn('<th id="battery-percent-col">Battery %</th>')).toBe(true)
  })

  it('ignores the knockout battery bindings on the body cells', () => {
    expect(hasBatteryColumn('<td data-bind="attr: { \'data-battery\': batteryPercent }"></td>')).toBe(false)
  })
})
