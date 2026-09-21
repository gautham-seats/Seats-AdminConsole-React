// next.config.ts compiles ADMIN_ALLOW_WRITES into the bundle; a production build without an explicit
// value must fail, so a server-side setting can never be mistaken for a working switch.
const loadConfig = async () => (await import('../../../next.config')).default
// NODE_ENV is typed read-only by Next; the test sets it through Object.assign on purpose.
const setEnv = (values: Record<string, string | undefined>) => Object.assign(process.env, values)

describe('safe-mode build guard', () => {
  const original = { NODE_ENV: process.env.NODE_ENV, ADMIN_ALLOW_WRITES: process.env.ADMIN_ALLOW_WRITES }

  afterEach(() => {
    setEnv(original)
    jest.resetModules()
  })

  it('refuses a production build when the flag is not set', async () => {
    setEnv({ NODE_ENV: 'production', ADMIN_ALLOW_WRITES: undefined })
    delete process.env.ADMIN_ALLOW_WRITES
    jest.resetModules()
    await expect(loadConfig()).rejects.toThrow(/ADMIN_ALLOW_WRITES must be set explicitly/)
  })

  it.each(['true', 'false'])('compiles the flag in as %s', async value => {
    setEnv({ NODE_ENV: 'production', ADMIN_ALLOW_WRITES: value })
    jest.resetModules()
    const config = await loadConfig()
    expect(config.env?.ADMIN_ALLOW_WRITES).toBe(value)
  })

  it('treats any other value as read-only outside production', async () => {
    setEnv({ NODE_ENV: 'test', ADMIN_ALLOW_WRITES: 'yes' })
    jest.resetModules()
    const config = await loadConfig()
    expect(config.env?.ADMIN_ALLOW_WRITES).toBe('false')
  })
})
