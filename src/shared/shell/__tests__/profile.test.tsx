import { render, screen } from '@testing-library/react'
import { api } from '@/shared/api'
import { ProfileProvider, useProfile } from '../profile'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn() } }
})

function Probe() {
  const { status, error, profile } = useProfile()
  return <div>{`${status}|${error?.kind ?? ''}|${profile.length}`}</div>
}

describe('ProfileProvider', () => {
  it('B2 reports a non-array claims payload as a parse error with nothing granted', async () => {
    jest.mocked(api.get).mockResolvedValue(null)
    render(
      <ProfileProvider>
        <Probe />
      </ProfileProvider>,
    )
    expect(await screen.findByText('error|parse|0')).toBeInTheDocument()
  })

  it('keeps a real claims array as success', async () => {
    jest.mocked(api.get).mockResolvedValue([{ Id: 6, Actions: [{ Id: 1 }] }])
    render(
      <ProfileProvider>
        <Probe />
      </ProfileProvider>,
    )
    expect(await screen.findByText('success||1')).toBeInTheDocument()
  })
})
