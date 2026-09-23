import { fireEvent, render, screen } from '@testing-library/react'
import {
  ENGAGEMENT_FALLBACK_ONLY,
  ENGAGEMENT_TEXT,
  type EngagementText,
  type EngagementTextKey,
} from '../../engagement-text'
import { EXPORT_TO_CSV, EXPORT_TO_PDF } from '../history-query'
import { HistoryExportMenu } from '../HistoryExportMenu'

const t: EngagementText = (key: EngagementTextKey) => ENGAGEMENT_TEXT[key]

const open = async (item: string) => {
  const trigger = screen.getByText('Export').closest('button')
  if (!trigger) throw new Error('Export trigger not found')
  fireEvent.click(trigger)
  fireEvent.click(await screen.findByText(item))
}

describe('HistoryExportMenu', () => {
  // D-097: seats-admin-engagement-history.html:383 hides PDF on an undefined property, which Polymer 1 never evaluates.
  it.each([
    ['Export to PDF', EXPORT_TO_PDF],
    ['Export to CSV', EXPORT_TO_CSV],
  ])('offers %s and reports its ExportToEnum value', async (item, exportTo) => {
    const onExport = jest.fn()
    render(<HistoryExportMenu busy={false} onExport={onExport} t={t} />)
    await open(item)
    expect(onExport).toHaveBeenCalledWith(exportTo)
  })

  it('is disabled and says so while an export is being queued', () => {
    render(<HistoryExportMenu busy onExport={jest.fn()} t={t} />)
    expect(screen.getByText(ENGAGEMENT_FALLBACK_ONLY.exporting).closest('button')).toBeDisabled()
  })
})
