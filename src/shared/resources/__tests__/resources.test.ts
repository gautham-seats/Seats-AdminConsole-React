import { renderHook } from '@testing-library/react'
import { api } from '@/shared/api'
import { getUiCulture, resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import { clearResourceCache, loadScreenResources, unwrapScreenResources } from '../resources'
import { useResources } from '../use-resources'

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  api: { post: jest.fn() },
}))

const post = jest.mocked(api.post)

beforeEach(() => {
  clearResourceCache()
  resetUiCulture()
  post.mockReset()
})

describe('unwrapScreenResources', () => {
  it('unwraps the single culture property', () => {
    expect(unwrapScreenResources({ 'en-GB': { Save: 'Save', Bad: 3 } })).toEqual({ Save: 'Save' })
  })

  it.each([null, 'x', {}, { 'en-GB': null }])('returns no values for %p', value => {
    expect(unwrapScreenResources(value)).toEqual({})
  })
})

describe('loadScreenResources', () => {
  it('posts the key list to GetResourcesForScreen and caches the result', async () => {
    post.mockResolvedValue({ 'en-GB': { Save: 'Save', Cancel: 'Cancel' } })

    await expect(loadScreenResources(['Save', 'Cancel', 'Save'])).resolves.toEqual({
      Save: 'Save',
      Cancel: 'Cancel',
    })
    expect(post).toHaveBeenCalledWith('ResourceApi/GetResourcesForScreen', {
      body: ['Save', 'Cancel'],
      signal: undefined,
    })

    await loadScreenResources(['Save'])
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('requests only keys that are not cached', async () => {
    post
      .mockResolvedValueOnce({ 'en-GB': { Save: 'Save' } })
      .mockResolvedValueOnce({ 'en-GB': { Close: 'Close' } })
    await loadScreenResources(['Save'])
    await expect(loadScreenResources(['Save', 'Close'])).resolves.toEqual({ Save: 'Save', Close: 'Close' })
    expect(post).toHaveBeenLastCalledWith('ResourceApi/GetResourcesForScreen', {
      body: ['Close'],
      signal: undefined,
    })
  })

  it('J3 remembers a key the server did not return instead of asking again', async () => {
    post.mockResolvedValue({ 'en-GB': { Save: 'Save' } })
    await expect(loadScreenResources(['Save', 'Missing'])).resolves.toEqual({ Save: 'Save' })
    await expect(loadScreenResources(['Save', 'Missing'])).resolves.toEqual({ Save: 'Save' })
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('J3 keeps one cache per culture', async () => {
    post
      .mockResolvedValueOnce({ 'en-GB': { Save: 'Save' } })
      .mockResolvedValueOnce({ 'fr-FR': { Save: 'Enregistrer' } })
    await expect(loadScreenResources(['Save'])).resolves.toEqual({ Save: 'Save' })
    setUiCulture('fr-FR')
    await expect(loadScreenResources(['Save'])).resolves.toEqual({ Save: 'Enregistrer' })
    expect(post).toHaveBeenCalledTimes(2)
  })
})

describe('SF-09 / SF-10', () => {
  it('SF-09 shares one POST between components that ask for the same missing keys at once', async () => {
    let resolve!: (value: unknown) => void
    post.mockReturnValueOnce(new Promise(r => (resolve = r)))
    const first = loadScreenResources(['Save', 'Cancel'])
    const second = loadScreenResources(['Cancel', 'Save'])
    expect(post).toHaveBeenCalledTimes(1)
    resolve({ 'en-GB': { Save: 'Save', Cancel: 'Cancel' } })
    await expect(first).resolves.toEqual({ Save: 'Save', Cancel: 'Cancel' })
    await expect(second).resolves.toEqual({ Cancel: 'Cancel', Save: 'Save' })
    await loadScreenResources(['Save'])
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('SF-10 ignores a late answer for a culture the user has already left', async () => {
    setUiCulture('en-GB')
    post.mockResolvedValueOnce({ 'en-GB': { Save: 'Save' } })
    const pending = loadScreenResources(['Save'])
    setUiCulture('es-ES')
    await pending
    expect(unwrapScreenResources({ 'en-GB': { Save: 'Save' } }, 'en-GB')).toEqual({ Save: 'Save' })
    expect(getUiCulture()).toBe('es-ES')
  })

  it('SF-50 caches a late answer under the culture it was asked for, not the one chosen meanwhile', async () => {
    setUiCulture('en-GB')
    let resolve!: (value: unknown) => void
    post.mockReturnValueOnce(new Promise(r => (resolve = r)))
    const pending = loadScreenResources(['Save'])
    setUiCulture('es-ES')
    resolve({ 'en-GB': { Save: 'Save' } })
    await pending
    post.mockResolvedValueOnce({ 'es-ES': { Save: 'Guardar' } })
    await expect(loadScreenResources(['Save'])).resolves.toEqual({ Save: 'Guardar' })
    expect(post).toHaveBeenCalledTimes(2)
  })
})

describe('SF-52 useResources with no keys', () => {
  it('SF-52 reports success at once and posts nothing', () => {
    const { result } = renderHook(() => useResources([]))
    expect(result.current.status).toBe('success')
    expect(result.current.text('Save')).toBe('Save')
    expect(post).not.toHaveBeenCalled()
  })
})
