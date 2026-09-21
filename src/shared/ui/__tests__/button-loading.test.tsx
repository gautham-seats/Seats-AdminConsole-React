import { fireEvent, render, screen } from '@testing-library/react'
import { Button } from '../Button'

describe('Button loading (SL-33)', () => {
  it('keeps focus and blocks clicks while loading instead of going disabled', () => {
    const onClick = jest.fn()
    const { rerender } = render(<Button onClick={onClick}>Save</Button>)
    const save = screen.getByRole('button', { name: 'Save' })
    save.focus()
    rerender(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    expect(save).toHaveFocus()
    expect(save).toHaveAttribute('aria-disabled', 'true')
    expect(save).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(save)
    expect(onClick).not.toHaveBeenCalled()
    rerender(<Button onClick={onClick}>Save</Button>)
    expect(save).not.toHaveAttribute('aria-disabled')
    fireEvent.click(save)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('still honours an explicit disabled', () => {
    render(
      <Button disabled loading>
        Save
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
