import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Dialog } from '../Dialog'
import { TimePicker } from '../TimePicker'

const options = ['07:00', '07:15', '08:00', '08:15', '08:30', '23:00']
const labels = { hours: 'Hours', minutes: 'Minutes', empty: 'All day' }

function Host() {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState('')
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Dates" closeLabel="Close">
      <TimePicker
        id="time"
        label="Start time"
        value={value}
        options={options}
        labels={labels}
        onChange={setValue}
      />
    </Dialog>
  )
}

describe('SF-47 time picker inside a dialog', () => {
  it('SF-47 picking a time does not close the dialog behind it', () => {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'Start time' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: '08' }))
    fireEvent.click(screen.getByRole('button', { name: '08' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: ':30' }))
    fireEvent.click(screen.getByRole('button', { name: ':30' }))
    expect(screen.getByText('Dates')).toBeInTheDocument()
  })

  it('SF-47 Escape closes the picker only, the dialog stays', () => {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'Start time' }))
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Start time' })).not.toBeInTheDocument()
    expect(screen.getByText('Dates')).toBeInTheDocument()
  })
})
