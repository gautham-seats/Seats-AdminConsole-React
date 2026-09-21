import { sanitizeTemplateHtml } from '../sanitize-template-html'

describe('TemplateEditor hostile HTML handling', () => {
  it('removes executable elements, handlers and URL schemes before Quill receives them', () => {
    const hostile =
      '<p onclick="alert(1)">Safe text</p><script>alert(2)</script><img src="data:text/html,x" onerror="alert(3)"><a href="javascript:alert(4)">Link</a><iframe srcdoc="<script>alert(5)</script>"></iframe>'

    const html = sanitizeTemplateHtml(hostile)

    expect(html).toContain('Safe text')
    expect(html).not.toMatch(/<script|<iframe|onclick|onerror|srcdoc|javascript:|data:text/i)
  })

  it('closes the escapes a naive scheme check misses', () => {
    const html = sanitizeTemplateHtml(
      '<a href="java	script:alert(1)">Tab</a>' +
        '<a href=" JAVASCRIPT:alert(2)">Spaced</a>' +
        '<p style="background:url(javascript:alert(3))">Styled</p>' +
        '<img src="x" srcset="evil.png 1x">' +
        '<math><mtext><table><mglyph><style><img src=x onerror=alert(4)></style></mglyph></table></mtext></math>' +
        '<style>body{background:red}</style><link rel="stylesheet" href="x.css">',
    )
    expect(html).not.toMatch(/javascript:|onerror|srcset|<style|<link|<math/i)
    expect(html).toContain('Tab')
    expect(html).toContain('Styled')
  })

  it('keeps Quill colour and highlight styles but drops anything executable in style', () => {
    const html = sanitizeTemplateHtml(
      '<span style="color: rgb(230, 0, 0); background-color: #ffff00;">Marked</span>' +
        '<p style="background:url(javascript:alert(1)); color:red">Mixed</p>' +
        '<p style="width: expression(alert(2))">Expr</p>',
    )
    expect(html).toContain('color: rgb(230, 0, 0); background-color: #ffff00')
    expect(html).toContain('style="color:red"')
    expect(html).not.toMatch(/url\(|expression|javascript/i)
  })

  it('keeps an embedded image, which templates use for logos', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='
    expect(sanitizeTemplateHtml(`<img src="${png}">`)).toContain(png)
    expect(sanitizeTemplateHtml('<img src="data:text/html,<script>alert(1)</script>">')).not.toContain(
      'data:',
    )
  })

  it('keeps normal template links and images', () => {
    expect(
      sanitizeTemplateHtml(
        '<a href="https://example.test">Web</a><a href="mailto:a@example.test">Mail</a><img src="/logo.png">',
      ),
    ).toBe(
      '<a href="https://example.test">Web</a><a href="mailto:a@example.test">Mail</a><img src="/logo.png">',
    )
  })
})
