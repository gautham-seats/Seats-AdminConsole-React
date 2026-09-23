import { render } from '@testing-library/react'
import { BatteryGlyph, fillWidth } from '../BatteryGlyph'

const fillOf = (container: HTMLElement) => container.querySelector('span > span') as HTMLElement

describe('BatteryGlyph', () => {
  it('is hidden from assistive technology, so the number beside it carries the meaning', () => {
    const { container } = render(<BatteryGlyph percent={50} level="good" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it.each([
    [-5, 0],
    [0, 0],
    [42, 42],
    [150, 100],
  ])('draws %s %% as a %s %% fill', (percent, drawn) => {
    expect(fillWidth(percent)).toBe(`calc((100% - 4px) * ${drawn} / 100)`)
  })

  it('pulses the shell only when the level is low, and never under reduced motion', () => {
    const low = render(<BatteryGlyph percent={5} level="low" />).container.firstElementChild
    expect(low?.className).toContain('animate-battery-low')
    expect(low?.className).toContain('motion-reduce:animate-none')
    const good = render(<BatteryGlyph percent={90} level="good" />).container.firstElementChild
    expect(good?.className).not.toContain('animate-battery-low')
  })

  it('staggers the fill animation by the given delay', () => {
    const { container } = render(<BatteryGlyph percent={60} level="good" delayMs={135} />)
    expect(fillOf(container).style.animationDelay).toBe('135ms')
  })
})
