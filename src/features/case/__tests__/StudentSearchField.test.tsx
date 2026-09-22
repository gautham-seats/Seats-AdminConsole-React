import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { StudentSearchField } from '../student-workflow/StudentSearchField'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)

function Harness() {
  const [value, setValue] = useState('')
  return (
    <StudentSearchField
      id="student-search"
      label="Search by name"
      placeholder="Search students..."
      value={value}
      onValueChange={setValue}
    />
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  get.mockImplementation((path: string) =>
    path === 'caseapi/getStudentsByName'
      ? Promise.resolve([
          { id: 1, description: 'Ada Lovelace' },
          { id: 2, description: 'Alan Turing' },
        ])
      : Promise.resolve([]),
  )
})

// Requirement 2.1: APG combobox with a named listbox whose options are direct children with ids.
describe('StudentSearchField', () => {
  it('R8-09 typing three letters quickly sends one lookup, after the legacy 300 ms pause', async () => {
    render(<Harness />)
    const input = screen.getByRole('combobox', { name: 'Search by name' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'A' } })
    fireEvent.change(input, { target: { value: 'Al' } })
    fireEvent.change(input, { target: { value: 'Ala' } })
    expect(get).not.toHaveBeenCalledWith('caseapi/getStudentsByName', expect.anything())

    await screen.findAllByRole('option')
    const lookups = get.mock.calls.filter(([path]) => path === 'caseapi/getStudentsByName')
    expect(lookups).toHaveLength(1)
    expect(lookups[0]?.[1]?.query).toEqual({ query: 'Ala' })
  })

  it('exposes options through aria-activedescendant and picks one with Enter', async () => {
    render(<Harness />)
    const input = screen.getByRole('combobox', { name: 'Search by name' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Al' } })

    const listbox = await screen.findByRole('listbox', { name: 'Search by name' })
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(2)
    options.forEach(option => expect(option.parentElement).toBe(listbox))
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id)

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id)
    expect(options[1]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).toHaveValue('Alan Turing')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
