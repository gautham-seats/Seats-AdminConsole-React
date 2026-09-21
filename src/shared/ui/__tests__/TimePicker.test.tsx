import { fireEvent, render, screen } from '@testing-library/react'
import { TimePicker } from '../TimePicker'

const options = ['07:00', '07:15', '08:00', '08:15', '08:30', '23:00']
const labels = { hours: 'Hours', minutes: 'Minutes', empty: 'All day' }

function setup(value = '') {
  const onChange = jest.fn()
  render(
    <>
      <TimePicker
        id="time"
        label="Start time"
        value={value}
        options={options}
        labels={labels}
        onChange={onChange}
      />
      <button type="button">Outside</button>
    </>,
  )
  return onChange
}

describe('TimePicker', () => {
  it('picks an hour then a minute and closes', () => {
    const onChange = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Start time' }))
    fireEvent.click(screen.getByRole('button', { name: '08' }))
    expect(screen.getByRole('button', { name: ':30' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: ':30' }))
    expect(onChange).toHaveBeenCalledWith('08:30')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('applies the chosen hour on an outside click and disables missing minutes', () => {
    const onChange = setup('08:15')
    fireEvent.click(screen.getByRole('button', { name: 'Start time' }))
    fireEvent.click(screen.getByRole('button', { name: '23' }))
    expect(screen.getByRole('button', { name: ':15' })).toBeDisabled()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }))
    expect(onChange).toHaveBeenCalledWith('23:00')
  })

  it('clears to the empty value', () => {
    const onChange = setup('07:15')
    fireEvent.click(screen.getByRole('button', { name: 'Start time' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'All day' })[0])
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('names the trigger and panel by the label and describes the chosen time', () => {
    setup('07:15')
    const trigger = screen.getByRole('button', { name: 'Start time' })
    expect(trigger).toHaveAccessibleDescription('07:15')
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Start time' })).toBeInTheDocument()
  })

  it('falls back to built-in words when labels are empty', () => {
    render(
      <TimePicker
        id="blank"
        label=""
        value=""
        options={options}
        labels={{ hours: '', minutes: '', empty: '' }}
        onChange={jest.fn()}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Time' })
    expect(trigger).toHaveAccessibleDescription('All day')
    fireEvent.click(trigger)
    expect(screen.getByRole('group', { name: 'Hours' })).toBeInTheDocument()
  })
})

describe('TimePicker keyboard reach (SL-28)', () => {
  it('moves focus into the panel on open, wraps Tab inside it and returns on Escape', () => {
    setup('08:15')
    const trigger = screen.getByRole('button', { name: 'Start time' })
    trigger.focus()
    fireEvent.click(trigger)
    const allDay = screen.getAllByRole('button', { name: 'All day' })[0]
    expect(screen.getByRole('button', { name: '08' })).toHaveFocus()
    screen.getByRole('button', { name: ':30' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(allDay).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: ':30' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveFocus()
  })
})
