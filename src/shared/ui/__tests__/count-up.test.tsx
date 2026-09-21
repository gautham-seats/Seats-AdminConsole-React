import { render, screen, act } from '@testing-library/react'
import { CountUp } from '../CountUp'
import { resetUiCulture, setUiCulture } from '@/shared/i18n/culture'

let frame: FrameRequestCallback | null = null
let now = 0

beforeEach(() => {
  now = 0
  frame = null
  window.matchMedia = () => ({ matches: false }) as MediaQueryList
  jest.spyOn(performance, 'now').mockImplementation(() => now)
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frame = callback
    return 1
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  resetUiCulture()
})

const tick = (at: number) => {
  now = at
  const callback = frame
  frame = null
  act(() => callback?.(at))
}

describe('CountUp culture (SL-29)', () => {
  it('reads and writes a grouped number in the UI culture', () => {
    setUiCulture('de-DE')
    render(<CountUp text="Gesamt 3.807" />)
    tick(0)
    tick(350)
    const shown = screen.getByLabelText('Gesamt 3.807').textContent ?? ''
    expect(shown).toMatch(/^Gesamt \d\.\d{3}$/)
    expect(shown).not.toBe('Gesamt 3.807')
    tick(700)
    expect(screen.getByText('Gesamt 3.807')).toBeInTheDocument()
  })

  it('keeps a plain number plain', () => {
    render(<CountUp text="Total 3807" />)
    tick(0)
    tick(350)
    expect(screen.getByLabelText('Total 3807').textContent).toMatch(/^Total \d{4}$/)
  })
})
