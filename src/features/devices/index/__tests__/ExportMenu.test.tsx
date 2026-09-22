import { fireEvent, render, screen } from '@testing-library/react'
import { ExportMenu } from '../ExportMenu'
import { DEVICES_TEXT, type DevicesTextKey } from '../devices-text'

const t = (key: DevicesTextKey) => DEVICES_TEXT[key]

describe('ExportMenu', () => {
  it('offers PDF and CSV and reports the chosen ExportToEnum value', async () => {
    const onExport = jest.fn()
    render(<ExportMenu pending={null} onExport={onExport} t={t} />)
    const trigger = screen.getByText('Export').closest('button')
    if (!trigger) throw new Error('Export trigger not found')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(await screen.findByText('Export to CSV'))
    expect(onExport).toHaveBeenCalledWith(1)
  })

  it('is disabled and says so while an export is being queued', () => {
    render(<ExportMenu pending={0} onExport={jest.fn()} t={t} />)
    expect(screen.getByText('Exporting').closest('button')).toBeDisabled()
  })
})
