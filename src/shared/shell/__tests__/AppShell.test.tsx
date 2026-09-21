import { render, screen } from '@testing-library/react'
import { AppShell, SHELL_EN } from '../AppShell'

jest.mock('../NavBar', () => ({ NavBar: () => <div data-testid="nav" /> }))
jest.mock('../profile', () => ({
  ProfileProvider: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock('../AccessibilityPrefs', () => ({ AccessibilityPrefs: () => null }))
jest.mock('../LeaveDialog', () => ({ LeaveDialog: () => null }))
jest.mock('../ShortcutsDialog', () => ({ ShortcutsDialog: () => null }))
jest.mock('../TideSplash', () => ({ TideSplash: () => null }))
jest.mock('@/shared/ui/FrostTooltips', () => ({ FrostTooltips: () => null }))

describe('AppShell skip link', () => {
  it('moves focus into main when activated', () => {
    render(
      <AppShell>
        <p>Page body</p>
      </AppShell>,
    )
    const skip = screen.getByRole('link', { name: SHELL_EN.skipToContent })
    const main = document.getElementById('admin-main')
    expect(main).not.toBeNull()
    skip.click()
    expect(document.activeElement).toBe(main)
  })
})
