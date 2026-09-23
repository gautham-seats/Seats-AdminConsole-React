import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { checkImport, nextErrorSort, parseImportTypes, sortImportErrors, toImportForm } from '../import-file'
import { ImportScreen } from '../ImportScreen'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const put = jest.mocked(api.put)

const csv = (name = 'students.csv', type = 'text/csv') => new File(['id,name\n1,Amy'], name, { type })

function setup(actions = [1, 2]) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 35, actions: actions.map(id => ({ id })) }])
    if (path === 'ImportApi/GetImportTypes')
      return Promise.resolve([
        { id: 7, description: 'Rooms' },
        { id: 3, description: 'Students' },
      ])
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
}

async function chooseType(name: string) {
  const trigger = await screen.findByRole('combobox')
  await waitFor(() => expect(trigger).toBeEnabled())
  await act(async () => {
    fireEvent.keyDown(trigger, { key: 'Enter' })
  })
  await act(async () => {
    fireEvent.click(await screen.findByRole('option', { name }))
  })
  await waitFor(() => expect(trigger).toHaveTextContent(name))
}

const renderScreen = () =>
  render(
    <ProfileProvider>
      <ImportScreen />
    </ProfileProvider>,
  )

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('import helpers', () => {
  it('checks type, then file, then MIME type like legacy', () => {
    expect(checkImport(null, csv())).toBe('typeRequired')
    expect(checkImport(3, null)).toBe('fileRequired')
    expect(checkImport(3, csv('a.csv', 'application/pdf'))).toBe('fileNotSupported')
    expect(checkImport(3, csv('a.csv', 'application/vnd.ms-excel'))).toBeNull()
  })

  it('sends the type id and the file under the legacy field names', () => {
    const form = toImportForm(3, csv())
    expect(form.get('selectedImportTypeId')).toBe('3')
    expect((form.get('file') as File).name).toBe('students.csv')
  })

  it('drops invalid types and sorts errors by either column', () => {
    expect(
      parseImportTypes([
        { id: 0, description: 'x' },
        { id: 3, description: 'Students' },
      ]),
    ).toEqual([{ id: 3, description: 'Students' }])
    const rows = [
      { lineNumber: 9, exceptionInfo: 'b' },
      { lineNumber: 2, exceptionInfo: 'c' },
    ]
    expect(sortImportErrors(rows, { column: 'lineNumber', dir: 'asc' }).map(r => r.lineNumber)).toEqual([
      2, 9,
    ])
    expect(nextErrorSort({ column: 'lineNumber', dir: 'asc' }, 'lineNumber').dir).toBe('desc')
  })
})

// The idle result panel is a live region too, so a notice is found by its own text.
const noticeText = (text: string) => screen.getByText(text).closest('[role="status"],[role="alert"]')

describe('ImportScreen', () => {
  it('asks for an import type before sending anything', async () => {
    setup()
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: /Validate File/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Select import type')
    expect(put).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument(), { timeout: 2000 })
    // The short toast is gone, but each missing part stays flagged beside its own field.
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Select import type')
    expect(screen.getByLabelText(/Select or Drop File Here/)).toHaveAccessibleDescription('Select file')
  })

  it('validates the picked file and lists the returned errors', async () => {
    setup()
    renderScreen()
    await chooseType('Students')
    expect(screen.getByRole('link', { name: /Get sample file/ })).toHaveAttribute(
      'href',
      '/Seats.Trunk.Admin/api/ImportApi/GetImportFileSample/3',
    )
    fireEvent.change(screen.getByLabelText(/Select or Drop File Here/), { target: { files: [csv()] } })
    put.mockResolvedValueOnce([{ lineNumber: 4, exceptionInfo: 'Student Id is required' }])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Validate File/ }))
    })
    expect(put).toHaveBeenCalledWith(
      'ImportApi/validateFile',
      expect.objectContaining({ body: expect.any(FormData) }),
    )
    expect(screen.getByText('Student Id is required')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('The file data is invalid')
  })

  // F7-02: seats-grid.html:205-211,264-270 — sizes 10/20/30/50/100/200, default 100, so ≤100 errors fit one page.
  it('F7-02 lists every returned error on one page by default and offers the legacy page sizes', async () => {
    setup()
    renderScreen()
    await chooseType('Students')
    fireEvent.change(screen.getByLabelText(/Select or Drop File Here/), { target: { files: [csv()] } })
    put.mockResolvedValueOnce(
      Array.from({ length: 15 }, (_, index) => ({
        lineNumber: index + 1,
        exceptionInfo: `Row ${index + 1} bad`,
      })),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Validate File/ }))
    })
    expect(screen.getByText('Row 15 bad')).toBeInTheDocument()
    expect(screen.getAllByText(/^Row \d+ bad$/)).toHaveLength(15)
    const sizes = screen.getByLabelText(/Number of items per page/i) as HTMLSelectElement
    expect(sizes).toHaveValue('100')
    expect(Array.from(sizes.options).map(option => option.value)).toEqual([
      '10',
      '20',
      '30',
      '50',
      '100',
      '200',
    ])
  })

  it('shows the server message when processing fails', async () => {
    setup()
    renderScreen()
    await chooseType('Rooms')
    fireEvent.change(screen.getByLabelText(/Select or Drop File Here/), { target: { files: [csv()] } })
    put.mockRejectedValueOnce(new ApiError('http', '/api/ImportApi/UploadFile', 400, 'File with errors'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Process File/ }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('File with errors')
  })

  it('hides Process without the Add right', async () => {
    setup([1])
    renderScreen()
    await screen.findByRole('button', { name: /Validate File/ })
    expect(screen.queryByRole('button', { name: /Process File/ })).not.toBeInTheDocument()
  })

  it('shows live upload progress, cancels the request and retries it', async () => {
    setup()
    renderScreen()
    await chooseType('Rooms')
    fireEvent.change(screen.getByLabelText(/Select or Drop File Here/), { target: { files: [csv()] } })
    let signal: AbortSignal | undefined
    put.mockImplementationOnce((path, options) => {
      signal = options?.signal
      options?.onUploadProgress?.(0.4)
      return new Promise((_, reject) =>
        signal?.addEventListener('abort', () => reject(new ApiError('aborted', path))),
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Process File/ }))
    })
    expect(screen.getByRole('progressbar', { name: 'Uploading' })).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText('40%')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    })
    expect(signal?.aborted).toBe(true)
    expect(noticeText('Upload cancelled. Nothing was imported.')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    put.mockResolvedValueOnce(undefined)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    })
    expect(put).toHaveBeenCalledTimes(2)
    expect(put.mock.calls[1][0]).toBe('ImportApi/UploadFile')
    expect(noticeText('The file has been uploaded and will be processed soon')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('offers Retry after a failed upload but not in safe mode', async () => {
    setup()
    renderScreen()
    await chooseType('Rooms')
    fireEvent.change(screen.getByLabelText(/Select or Drop File Here/), { target: { files: [csv()] } })
    put.mockRejectedValueOnce(new ApiError('network', '/api/ImportApi/UploadFile'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Process File/ }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('There was an error uploading the file')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    put.mockRejectedValueOnce(new ApiError('blocked', '/api/ImportApi/UploadFile'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('safe mode')
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })
})
