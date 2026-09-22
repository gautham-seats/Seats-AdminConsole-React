import { render, screen } from '@testing-library/react'
import { NavLogo } from '../NavLogo'
import logo from '../seats-one-logo.png'

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, style }: { alt: string; style?: object }) => <img alt={alt} style={style} />,
}))

describe('NavLogo', () => {
  it('shows the logo file itself and keeps the ring and glint out of the accessibility tree', () => {
    const { container } = render(<NavLogo src={logo} alt="SEAtS ONE" />)

    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'SEAtS ONE' })).toBeInTheDocument()
    expect(container.querySelector('.nav-seal-disc')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.nav-seal-glint')).toHaveAttribute('aria-hidden', 'true')
  })

  it('masks the glint with the logo so the light only lands on the logo', () => {
    const { container } = render(<NavLogo src={logo} alt="SEAtS ONE" />)

    const glint = container.querySelector<HTMLElement>('.nav-seal-glint')
    expect(glint?.style.mask || glint?.style.webkitMask).toContain(logo.src)
  })

  it('points the chrome ring and the solid-white filter at their own definitions', () => {
    const { container } = render(<NavLogo src={logo} alt="SEAtS ONE" />)

    const ring = container.querySelector('.nav-seal-ring')
    const gradientId = container.querySelector('linearGradient')?.id
    const filterId = container.querySelector('filter')?.id
    expect(ring).toHaveAttribute('stroke', `url(#${gradientId})`)
    expect(screen.getByRole('img').getAttribute('style')).toContain(`url(#${filterId})`)
  })
})
