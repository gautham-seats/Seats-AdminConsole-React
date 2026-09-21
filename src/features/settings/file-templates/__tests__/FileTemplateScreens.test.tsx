import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { forwardRef, useImperativeHandle, useRef, useState, type AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import type { FileTemplateDetailsDto, FileTemplateDto } from '@/types/file-templates'
import { FileTemplateDetailsScreen } from '../FileTemplateDetailsScreen'
import { FileTemplatesScreen } from '../FileTemplatesScreen'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))
jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})
// Quill needs a real layout engine, so the editor is a plain textarea with the same handle.
jest.mock('../TemplateEditor', () => ({
  TemplateEditor: forwardRef(function FakeEditor(
    { label, initialHtml, onChange }: { label: string; initialHtml: string; onChange: () => void },
    ref,
  ) {
    const [html, setHtml] = useState(initialHtml)
    const value = useRef(html)
    value.current = html
    useImperativeHandle(ref, () => ({
      getHtml: () => value.current,
      replaceWithHtml: (next: string) => setHtml(next),
      insertAtCursor: (text: string) => setHtml(current => current + text),
    }))
    return (
      <textarea
        aria-label={label}
        value={html}
        onChange={event => {
          setHtml(event.target.value)
          onChange()
        }}
      />
    )
  }),
}))

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const TEMPLATE: FileTemplateDto = {
  id: 5,
  name: 'Absence letter',
  comment: null,
  fileName: 'absence.html',
  contentFile: '<html><head><title>Letter</title></head><body><p>Dear @Model.Name</p></body></html>',
  fileTemplateTypeId: 1,
  fileTemplateTypeDescription: 'Student',
  subject: 'Absence',
  externalFileName: null,
  dateCreated: '2026-09-01T10:00:00',
  size: 0,
}

const DETAILS: FileTemplateDetailsDto = {
  detail: TEMPLATE,
  fileTemplateTypeAvailables: [
    { id: 1, description: 'Student', className: 'Student', setDynamicType: false },
  ],
  typeValuesAvailables: [{ className: 'Student', values: ['Name'] }],
}

const EMPTY_DETAILS: FileTemplateDetailsDto = {
  ...DETAILS,
  detail: {
    ...TEMPLATE,
    id: 0,
    name: null,
    subject: null,
    fileName: null,
    contentFile: null,
    fileTemplateTypeId: 0,
  },
}

type Route = { list?: () => Promise<unknown>; details?: FileTemplateDetailsDto }

function setup(actions: number[], route: Route = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 12, actions: actions.map(id => ({ id })) }])
    if (path === 'FileTemplateApi') return route.list ? route.list() : Promise.resolve([TEMPLATE])
    if (path === 'FileTemplateApi/') return Promise.resolve(route.details ?? DETAILS)
    if (path === 'FileTemplateApi/GetSubjectTemplateTypes') return Promise.resolve([])
    return Promise.resolve(null)
  })
}

const renderIn = (ui: React.ReactNode) => render(<ProfileProvider>{ui}</ProfileProvider>)
const posted = (path: string) => post.mock.calls.filter(([called]) => called === path)
const clickSave = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  })

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockImplementation((path: string) =>
    Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
  )
})

describe('FileTemplatesScreen', () => {
  it('lists templates and opens a row', async () => {
    setup([1, 2, 4])
    renderIn(<FileTemplatesScreen />)
    fireEvent.click(await screen.findByText('Absence letter'))
    expect(push).toHaveBeenCalledWith('/settings/file-templates/5')
  })

  it('shows the empty state with no templates', async () => {
    setup([1], { list: () => Promise.resolve([]) })
    renderIn(<FileTemplatesScreen />)
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Absence letter')).not.toBeInTheDocument()
  })

  it('shows the error state with Refresh when the list fails', async () => {
    setup([1], { list: () => Promise.reject(new ApiError('http', '/api/FileTemplateApi', 500)) })
    renderIn(<FileTemplatesScreen />)
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('needs File Template access', async () => {
    setup([])
    renderIn(<FileTemplatesScreen />)
    expect(await screen.findByText('You do not have permission to view this page.')).toBeInTheDocument()
  })
})

describe('FileTemplateDetailsScreen', () => {
  it('opens the editor with the stored template and saves after validation', async () => {
    setup([1, 3])
    renderIn(<FileTemplateDetailsScreen id={5} />)
    expect(await screen.findByLabelText('Name')).toHaveValue('Absence letter')
    expect(screen.getByLabelText('File Template Editor')).toHaveValue('<p>Dear @Model.Name</p>')
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Absence notice' } })
    await clickSave()
    expect(posted('FileTemplateApi/ValidateTemplateTypes')).toHaveLength(1)
    expect(posted('FileTemplateApi/')[0][1]?.body).toMatchObject({ id: 5, subject: 'Absence notice' })
    expect(push).toHaveBeenCalledWith('/settings/file-templates')
  })

  it('lists the missing fields and does not call the server', async () => {
    setup([1, 2], { details: EMPTY_DETAILS })
    renderIn(<FileTemplateDetailsScreen id={0} />)
    await screen.findByLabelText('Name')
    await clickSave()
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Name is required.')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Letter' } })
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid')
    expect(posted('FileTemplateApi/ValidateTemplateTypes')).toHaveLength(0)
    expect(posted('FileTemplateApi/')).toHaveLength(0)
  })

  it('loads a chosen file into the editor and rejects unsupported files', async () => {
    setup([1, 3])
    renderIn(<FileTemplateDetailsScreen id={5} />)
    const input = await screen.findByLabelText('Template')
    const good = new File(['<html><body><p>From file</p></body></html>'], 'new.html', { type: 'text/html' })
    fireEvent.change(input, { target: { files: [good] } })
    await waitFor(() => expect(screen.getByLabelText('File Template Editor')).toHaveValue('<p>From file</p>'))
    expect(screen.getByText('new.html')).toBeInTheDocument()
    const bad = new File(['x'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [bad] } })
    expect(await screen.findByText('Attachment file format is not supported.')).toBeInTheDocument()
  })

  it('shows the invalid format message when validation fails and does not save', async () => {
    setup([1, 3])
    post.mockImplementation((path: string) =>
      path === 'FileTemplateApi/ValidateTemplateTypes'
        ? Promise.reject(new ApiError('http', '/api/x', 400))
        : Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
    )
    renderIn(<FileTemplateDetailsScreen id={5} />)
    await screen.findByLabelText('Name')
    await clickSave()
    expect(
      await screen.findByText('There was an error validating the template. It has an invalid format.'),
    ).toBeInTheDocument()
    expect(posted('FileTemplateApi/')).toHaveLength(0)
  })

  it('shows the save error and stays on the page when the save fails', async () => {
    setup([1, 3])
    post.mockImplementation((path: string) =>
      path === 'FileTemplateApi/'
        ? Promise.reject(new ApiError('http', '/api/x', 500))
        : Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
    )
    renderIn(<FileTemplateDetailsScreen id={5} />)
    await screen.findByLabelText('Name')
    await clickSave()
    expect(await screen.findByText('There was an error while trying to save the item.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('explains safe mode when the save is blocked', async () => {
    setup([1, 3])
    post.mockImplementation((path: string) =>
      path === 'FileTemplateApi/'
        ? Promise.reject(new ApiError('blocked', '/api/x'))
        : Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
    )
    renderIn(<FileTemplateDetailsScreen id={5} />)
    await screen.findByLabelText('Name')
    await clickSave()
    expect(await screen.findByText(/safe mode/)).toBeInTheDocument()
  })

  it('hides Save, Validate and Choose file without Edit rights', async () => {
    setup([1])
    renderIn(<FileTemplateDetailsScreen id={5} />)
    expect(await screen.findByLabelText('Name')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Validate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose file' })).not.toBeInTheDocument()
  })
})
