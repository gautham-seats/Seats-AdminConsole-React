export type StorageArea = 'local' | 'session'

export type UserStorage = {
  read<T>(key: string, parse: (value: unknown) => T | null): T | null
  write(key: string, value: unknown): boolean
  remove(key: string): void
}

const NAMESPACE = 'seats-admin'

function resolveArea(area: StorageArea): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function userStorageKey(userId: string, key: string): string {
  return `${NAMESPACE}:${userId}:${key}`
}

// Sign-out on a shared machine must not leave the next person another user's searches and preferences.
export function clearUserStorage(): void {
  for (const area of ['local', 'session'] as const) {
    const storage = resolveArea(area)
    if (!storage) continue
    const keys: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(`${NAMESPACE}:`)) keys.push(key)
    }
    for (const key of keys) storage.removeItem(key)
  }
}

export function createUserStorage(
  userId: string | number | null | undefined,
  area: StorageArea = 'local',
): UserStorage {
  const id = userId === null || userId === undefined ? '' : String(userId).trim()
  if (!id || id === '0') {
    throw new Error('User storage requires a signed-in user id.')
  }

  return {
    read(key, parse) {
      const storage = resolveArea(area)
      const raw = storage?.getItem(userStorageKey(id, key)) ?? null
      if (raw === null) return null
      try {
        return parse(JSON.parse(raw))
      } catch {
        return null
      }
    },
    write(key, value) {
      const storage = resolveArea(area)
      if (!storage) return false
      try {
        storage.setItem(userStorageKey(id, key), JSON.stringify(value))
        return true
      } catch {
        return false
      }
    },
    remove(key) {
      resolveArea(area)?.removeItem(userStorageKey(id, key))
    },
  }
}

// Only the legacy layout HTML carries the user id, so the last signed-in id is kept to read that user's
// preferences before the HTML arrives. It sits in the namespace, so sign-out clears it too.
const LAST_USER_KEY = `${NAMESPACE}:last-user`

export function readLastUserId(): string | null {
  return resolveArea('local')?.getItem(LAST_USER_KEY) ?? null
}

export function rememberLastUserId(userId: string): void {
  try {
    resolveArea('local')?.setItem(LAST_USER_KEY, userId)
  } catch {
    // Storage blocked: the preference simply is not remembered.
  }
}
