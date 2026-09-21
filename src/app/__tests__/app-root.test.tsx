import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import RootLayout, { metadata } from '../layout'
import HomePage from '../page'

describe('app root', () => {
  it('renders the placeholder heading', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SEAtS Admin')
  })

  it('keeps the console out of search engines and wraps children in the layout', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>child</p>
      </RootLayout>,
    )
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<p>child</p>')
  })
})
