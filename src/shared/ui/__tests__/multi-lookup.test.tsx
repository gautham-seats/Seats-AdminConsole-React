import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { LookupSearch, type LookupOption } from '../LookupSearch'
import { MultiSelect } from '../MultiSelect'

const OPTIONS = [
  { value: '1', label: 'Attendance Risk' },
  { value: '2', label: 'Pilot Nursing' },
]
const LABELS = { all: 'All', placeholder: 'Select', selected: (count: number) => `${count} selected` }

function Multi() {
  const [value, setValue] = useState<string[]>([])
  return (
    <MultiSelect
      id="models"
      options={OPTIONS}
      value={value}
      onChange={setValue}
      labels={LABELS}
      label="Models"
    />
  )
}

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})

describe('MultiSelect', () => {
  it('ticks single options and All, and summarises the count', async () => {
    render(<Multi />)
    const trigger = screen.getByRole('button', { name: 'Models' })
    expect(trigger).not.toHaveAttribute('role')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveTextContent('Select')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Pilot Nursing' }))
    expect(trigger).toHaveTextContent('1 selected')
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'All' }))
    expect(trigger).toHaveTextContent('2 selected')
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'All' }))
    expect(trigger).toHaveTextContent('Select')
  })

  it('SL-16 offers a filter box on long lists so every option can be reached', async () => {
    const many = Array.from({ length: 150 }, (_, index) => ({
      value: String(index),
      label: `Model ${index}`,
    }))
    function Long() {
      const [value, setValue] = useState<string[]>([])
      return (
        <MultiSelect
          id="long"
          options={many}
          value={value}
          onChange={setValue}
          labels={LABELS}
          label="Models"
        />
      )
    }
    render(<Long />)
    const trigger = screen.getByRole('button', { name: 'Models' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    await screen.findByRole('menuitemcheckbox', { name: 'Model 0' })
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Model 149' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Select' }), { target: { value: '149' } })
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Model 149' }))
    expect(trigger).toHaveTextContent('1 selected')
  })

  it('SL-36 filters without accents and SL-37 closes on Escape from the filter box', async () => {
    const many = [
      ...Array.from({ length: 12 }, (_, index) => ({ value: String(index), label: `Model ${index}` })),
      { value: 'e', label: 'Étudiants' },
    ]
    render(
      <MultiSelect id="acc" options={many} value={[]} onChange={jest.fn()} labels={LABELS} label="Models" />,
    )
    const trigger = screen.getByRole('button', { name: 'Models' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    const box = await screen.findByRole('searchbox', { name: 'Select' })
    fireEvent.change(box, { target: { value: 'etu' } })
    expect(await screen.findByRole('menuitemcheckbox', { name: 'Étudiants' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Model 1' })).not.toBeInTheDocument()
    fireEvent.keyDown(box, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('searchbox')).not.toBeInTheDocument())
  })

  it('SL-53 "All" applies to the filtered options only', async () => {
    const many = Array.from({ length: 14 }, (_, index) => ({ value: String(index), label: `Model ${index}` }))
    function Host() {
      const [value, setValue] = useState<string[]>([])
      return (
        <MultiSelect
          id="all"
          options={many}
          value={value}
          onChange={setValue}
          labels={LABELS}
          label="Models"
        />
      )
    }
    render(<Host />)
    const trigger = screen.getByRole('button', { name: 'Models' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Select' }), {
      target: { value: 'Model 1' },
    })
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'All' }))
    expect(trigger).toHaveTextContent('5 selected')
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'All' }))
    expect(trigger).toHaveTextContent('Select')
  })

  it('takes its name from a visible label by id', () => {
    render(
      <>
        <span id="models-label">Engagement models</span>
        <MultiSelect
          id="models"
          options={OPTIONS}
          value={[]}
          onChange={jest.fn()}
          labels={LABELS}
          labelledBy="models-label"
        />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Engagement models' })).toHaveAttribute(
      'aria-labelledby',
      'models-label',
    )
  })
})

describe('LookupSearch', () => {
  it('waits for the minimum length, then picks and clears an option', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] })
    const search = jest.fn((query: string) =>
      Promise.resolve<LookupOption[]>([{ id: 142, label: `${query} Smith` }]),
    )
    const onSelect = jest.fn()
    render(
      <LookupSearch
        id="student"
        label="Students"
        placeholder="All"
        clearLabel="Clear student"
        cacheKey="test-students"
        minLength={2}
        selected={null}
        search={search}
        onSelect={onSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'A' } })
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(search).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'Am' } })
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    fireEvent.click(await screen.findByRole('option', { name: 'Am Smith' }))
    expect(onSelect).toHaveBeenCalledWith({ id: 142, label: 'Am Smith' })
    fireEvent.click(screen.getByRole('button', { name: 'Clear student' }))
    expect(onSelect).toHaveBeenLastCalledWith(null)
    jest.useRealTimers()
  })

  it('SL-17 shows a failed search as an error with Retry, never as no results', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] })
    const search = jest
      .fn<Promise<LookupOption[]>, [string, AbortSignal]>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce([{ id: 1, label: 'Back up' }])
    render(
      <LookupSearch
        id="s"
        label="Students"
        placeholder="All"
        clearLabel="Clear"
        cacheKey="test-fail"
        minLength={1}
        selected={null}
        search={search}
        onSelect={jest.fn()}
        errorLabel="Search failed."
        retryLabel="Retry"
      />,
    )
    const input = screen.getByRole('combobox')
    expect(input).not.toHaveAttribute('aria-controls')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'a' } })
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Search failed.')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-controls')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('option', { name: 'Back up' })).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('SL-43 keeps the highlight inside a shorter answer so Enter still picks', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] })
    const search = jest.fn((query: string) =>
      Promise.resolve<LookupOption[]>(
        query === 'ab'
          ? [{ id: 9, label: 'Abel' }]
          : [
              { id: 1, label: 'Ann' },
              { id: 2, label: 'Abe' },
              { id: 3, label: 'Abel' },
            ],
      ),
    )
    const onSelect = jest.fn()
    render(
      <LookupSearch
        id="p"
        label="People"
        placeholder="All"
        clearLabel="Clear"
        cacheKey="test-clamp"
        minLength={1}
        selected={null}
        search={search}
        onSelect={onSelect}
        delayMs={100}
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'a' } })
    await act(async () => {
      jest.advanceTimersByTime(150)
    })
    await screen.findByRole('option', { name: 'Ann' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.change(input, { target: { value: 'ab' } })
    await act(async () => {
      jest.advanceTimersByTime(150)
    })
    const only = await screen.findByRole('option', { name: 'Abel' })
    expect(input).toHaveAttribute('aria-activedescendant', only.id)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith({ id: 9, label: 'Abel' })
    jest.useRealTimers()
  })

  it('points aria-activedescendant at the active option and hides an empty list on request', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] })
    const search = jest.fn((query: string) =>
      Promise.resolve<LookupOption[]>(
        query === 'none'
          ? []
          : [
              { id: 1, label: 'One' },
              { id: 2, label: 'Two' },
            ],
      ),
    )
    render(
      <LookupSearch
        id="room"
        label="Rooms"
        placeholder="All"
        clearLabel="Clear room"
        cacheKey="test-rooms"
        minLength={1}
        selected={null}
        search={search}
        onSelect={jest.fn()}
        delayMs={250}
        maxResults={1}
        hideEmptyList
      />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'On' } })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })
    const option = await screen.findByRole('option', { name: 'One' })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(input).toHaveAttribute('aria-activedescendant', option.id)
    fireEvent.change(input, { target: { value: 'none' } })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input).not.toHaveAttribute('aria-activedescendant')
    jest.useRealTimers()
  })
})
