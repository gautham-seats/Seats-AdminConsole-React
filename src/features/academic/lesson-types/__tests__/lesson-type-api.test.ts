import { getLegacyViewHtml } from '@/shared/api/legacy-view'
import { clearLessonTypeFlagsCache, fetchLessonTypeFlags } from '../lesson-type-api'

jest.mock('@/shared/api/legacy-view', () => ({ getLegacyViewHtml: jest.fn() }))

const view = jest.mocked(getLegacyViewHtml)

// A partial readTenantFlags recognises: it carries the api/LessonTypeApi marker and both flag columns.
const PARTIAL = `<script>x('/api/LessonTypeApi/')</script><th id="attendance-scaling-col"></th><th id="is-consecutive-attendance-update-col"></th>`

const live = () => new AbortController().signal

beforeEach(() => {
  jest.clearAllMocks()
  clearLessonTypeFlagsCache()
})

describe('fetchLessonTypeFlags cache', () => {
  it('reads each partial once and serves the second visit from the cache', async () => {
    view.mockResolvedValue(PARTIAL)
    const first = await fetchLessonTypeFlags('Index', live())
    const second = await fetchLessonTypeFlags('Index', live())
    expect(second).toEqual(first)
    expect(view).toHaveBeenCalledTimes(1)
    expect(view).toHaveBeenCalledWith('LessonType/Index')
  })

  it('keeps a separate cache per view', async () => {
    view.mockResolvedValue(PARTIAL)
    await fetchLessonTypeFlags('Index', live())
    await fetchLessonTypeFlags('Details', live())
    await fetchLessonTypeFlags('Index', live())
    await fetchLessonTypeFlags('Details', live())
    expect(view).toHaveBeenCalledTimes(2)
    expect(view).toHaveBeenCalledWith('LessonType/Index')
    expect(view).toHaveBeenCalledWith('LessonType/Details')
  })

  it('shares one request between two reads that start together', async () => {
    let resolve!: (value: string) => void
    view.mockReturnValueOnce(new Promise(r => (resolve = r)))
    const a = fetchLessonTypeFlags('Index', live())
    const b = fetchLessonTypeFlags('Index', live())
    expect(view).toHaveBeenCalledTimes(1)
    resolve(PARTIAL)
    await expect(a).resolves.toEqual(await b)
  })

  it('never caches a failed read, so the next visit retries', async () => {
    view.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce(PARTIAL)
    await expect(fetchLessonTypeFlags('Index', live())).rejects.toThrow('500')
    await expect(fetchLessonTypeFlags('Index', live())).resolves.toBeTruthy()
    expect(view).toHaveBeenCalledTimes(2)
  })

  it('never caches an unrecognised partial as flags-off', async () => {
    view.mockResolvedValueOnce('<form action="/Account/ForceLogin"></form>').mockResolvedValueOnce(PARTIAL)
    await expect(fetchLessonTypeFlags('Index', live())).rejects.toThrow(
      'did not return the lesson type partial',
    )
    await expect(fetchLessonTypeFlags('Index', live())).resolves.toBeTruthy()
    expect(view).toHaveBeenCalledTimes(2)
  })

  it('respects a signal already aborted when the answer is cached', async () => {
    view.mockResolvedValue(PARTIAL)
    await fetchLessonTypeFlags('Index', live())
    const aborted = new AbortController()
    aborted.abort()
    await expect(fetchLessonTypeFlags('Index', aborted.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(view).toHaveBeenCalledTimes(1)
  })

  it('refetches after the cache is cleared', async () => {
    view.mockResolvedValue(PARTIAL)
    await fetchLessonTypeFlags('Index', live())
    clearLessonTypeFlagsCache()
    await fetchLessonTypeFlags('Index', live())
    expect(view).toHaveBeenCalledTimes(2)
  })
})
