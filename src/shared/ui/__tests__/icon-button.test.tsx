import { fireEvent, render, screen } from '@testing-library/react'
import { IconButton } from '../IconButton'

describe('IconButton', () => {
  it('renders an icon-sized button named by its required aria-label', () => {
    const onClick = jest.fn()
    render(
      <IconButton aria-label="Remove logo" onClick={onClick}>
        <svg aria-hidden />
      </IconButton>,
    )
    const button = screen.getByRole('button', { name: 'Remove logo' })
    expect(button).toHaveClass('h-10', 'w-10')
    expect(button).toHaveAttribute('type', 'button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalled()
  })

  it('does not compile without aria-label', () => {
    // @ts-expect-error aria-label is required
    const unnamed = <IconButton />
    expect(unnamed.props).not.toHaveProperty('aria-label')
  })
})
