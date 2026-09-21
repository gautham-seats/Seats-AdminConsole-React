import { render, screen } from '@testing-library/react'
import { ProfilePreview } from '../ProfilePreview'
import type { StudioGroup } from '../permission-studio'

const actions = (base: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: base + i, name: `Action ${base + i}` }))

const groups = (count: number): StudioGroup[] => [
  {
    key: 'site',
    area: 'Seats Website',
    title: 'Seats Website',
    permissions: [{ id: 1, name: 'Students', actions: actions(100, count) }],
  },
]

const TEXT = {
  title: 'Live preview',
  hint: 'hint',
  empty: 'empty',
  pages: 'pages',
  landingNone: 'none',
  landingOk: (page: string) => page,
  landingBlocked: (page: string) => page,
}

const allowedList = () =>
  screen.getByText('Allowed').closest('section')?.querySelector('[class*="grid gap-1"]') as HTMLElement

beforeEach(() =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: true, media: query }),
  }),
)

describe('ProfilePreview', () => {
  it('reads "updated" while nothing is changing', () => {
    render(<ProfilePreview groups={groups(2)} selected={[100, 101]} focusId={1} landing={null} text={TEXT} />)
    expect(screen.getByText('updated')).toBeInTheDocument()
    expect(screen.queryByText('updating…')).not.toBeInTheDocument()
  })

  it('reads "updating…" right after a grant changes', () => {
    const { rerender } = render(
      <ProfilePreview groups={groups(2)} selected={[100, 101]} focusId={1} landing={null} text={TEXT} />,
    )
    rerender(<ProfilePreview groups={groups(2)} selected={[100]} focusId={1} landing={null} text={TEXT} />)
    expect(screen.getByText('updating…')).toBeInTheDocument()
  })

  it('marks each preview toggle as pressed or not and always gives the full name as a title', () => {
    render(
      <ProfilePreview
        groups={groups(2)}
        selected={[100]}
        focusId={1}
        landing={null}
        text={TEXT}
        onToggle={jest.fn()}
      />,
    )
    const on = screen.getByTitle(/^Action 100 \(/)
    const off = screen.getByTitle(/^Action 101 \(/)
    expect(on).toHaveAttribute('aria-pressed', 'true')
    expect(off).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps a short list in one column', () => {
    render(
      <ProfilePreview groups={groups(3)} selected={[100, 101, 102]} focusId={1} landing={null} text={TEXT} />,
    )
    expect(allowedList().className).not.toContain('grid-cols-2')
  })

  it('splits a long list into two columns that fill the left one first', () => {
    render(
      <ProfilePreview
        groups={groups(7)}
        selected={actions(100, 7).map(a => a.id)}
        focusId={1}
        landing={null}
        text={TEXT}
      />,
    )
    const list = allowedList()
    expect(list.className).toContain('grid-cols-2')
    expect(list.className).toContain('grid-flow-col')
    expect(list.style.gridTemplateRows).toBe('repeat(4, auto)')
  })
})
