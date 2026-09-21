import { clearUserStorage, createUserStorage, userStorageKey } from '../user-storage'

const asStringList = (value: unknown) =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? value : null

describe('createUserStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it.each([null, undefined, '', ' ', 0, '0'])('refuses to work without a user id (%p)', userId => {
    expect(() => createUserStorage(userId)).toThrow('User storage requires a signed-in user id.')
  })

  it('keeps each user separate', () => {
    createUserStorage(7).write('columns', ['name'])
    expect(createUserStorage(8).read('columns', asStringList)).toBeNull()
    expect(createUserStorage(7).read('columns', asStringList)).toEqual(['name'])
    expect(window.localStorage.getItem(userStorageKey('7', 'columns'))).toBe('["name"]')
  })

  it('uses session storage when asked', () => {
    createUserStorage(7, 'session').write('filter', ['a'])
    expect(window.sessionStorage.getItem('seats-admin:7:filter')).toBe('["a"]')
    expect(window.localStorage.length).toBe(0)
  })

  it('rejects corrupt or wrongly shaped values', () => {
    window.localStorage.setItem('seats-admin:7:columns', '{not json')
    expect(createUserStorage(7).read('columns', asStringList)).toBeNull()
    window.localStorage.setItem('seats-admin:7:columns', '{"a":1}')
    expect(createUserStorage(7).read('columns', asStringList)).toBeNull()
  })

  it('removes a key', () => {
    const storage = createUserStorage(7)
    storage.write('columns', ['name'])
    storage.remove('columns')
    expect(storage.read('columns', asStringList)).toBeNull()
  })

  it('J14 clears every seats-admin key in both areas and nothing else', () => {
    createUserStorage(7).write('columns', ['name'])
    createUserStorage(8, 'session').write('filter', ['a'])
    window.localStorage.setItem('other-app', '1')
    clearUserStorage()
    expect(window.localStorage.getItem(userStorageKey('7', 'columns'))).toBeNull()
    expect(window.sessionStorage.getItem('seats-admin:8:filter')).toBeNull()
    expect(window.localStorage.getItem('other-app')).toBe('1')
  })
})
