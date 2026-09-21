import { fireEvent, render, screen } from '@testing-library/react'
import { ShortcutsDialog } from '../ShortcutsDialog'

describe('ShortcutsDialog (SL-52)', () => {
  it('opens on ? but not while a menu is open or a field is typed in', () => {
    render(
      <>
        <input aria-label="Name" />
        <ShortcutsDialog />
      </>,
    )
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Name' }), { key: '?' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    document.body.appendChild(menu)
    fireEvent.keyDown(document.body, { key: '?' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    menu.remove()
    fireEvent.keyDown(document.body, { key: '?' })
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  })
})
