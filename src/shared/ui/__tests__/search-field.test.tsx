import { fireEvent, render, screen } from '@testing-library/react'
import { SearchField } from '../SearchField'

function renderField(onSubmit: () => void) {
  render(
    <SearchField
      id="q"
      value="東京"
      onValueChange={() => {}}
      onSubmit={onSubmit}
      onClear={() => {}}
      placeholder="Search"
      submitLabel="Enter"
      clearLabel="Clear"
      showClear={false}
    />,
  )
  return screen.getByRole('searchbox')
}

describe('SF-30 search field', () => {
  it('SF-30 ignores the Enter that commits an IME composition and submits the next one', () => {
    const onSubmit = jest.fn()
    const input = renderField(onSubmit)
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
