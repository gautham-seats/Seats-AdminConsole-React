import {
  buildContentFile,
  cleanRazorBlocks,
  extractTitle,
  formatCodeBlocks,
  hasRelativeLinks,
  isAllowedTemplateFile,
  missingTemplateFields,
  nestQuillLists,
  readTemplateFile,
  subjectWildcardsHidden,
  toEditorHtml,
  wildcardInsertion,
  wildcardsFor,
} from '../file-template-form'

describe('file template rules', () => {
  it('reads the title and body of an uploaded file without svg tags', () => {
    const file =
      '<html><head><title>Welcome <svg></svg></title></head><body class="x"><p>Hi</p><svg><path/></svg></body></html>'
    expect(readTemplateFile(file)).toEqual({ title: 'Welcome ', body: '<p>Hi</p><path/>' })
    expect(extractTitle('<p>no title</p>')).toBe('')
  })

  it('restores stored code blocks for the editor', () => {
    expect(
      toEditorHtml('<body><div class="content_pre">a</div><div class="content_pre">b</div></body>'),
    ).toBe('<pre>a</pre><pre>b</pre>')
  })

  it('inserts wildcards with the legacy prefixes', () => {
    expect(wildcardInsertion('DateTime.Today')).toBe('@DateTime.Today ')
    expect(wildcardInsertion('FullName')).toBe('@Model.FullName ')
  })

  it('builds wildcard lists and hides the subject dropdown for some types', () => {
    const types = [
      { id: 2, description: 'WorkflowEmail', className: 'EmailViewModelDto', setDynamicType: false },
    ]
    const values = [{ className: 'EmailViewModelDto', values: ['StudentName'] }]
    expect(wildcardsFor(2, types, values)).toEqual([
      'DateTime.Now.ToShortDateString()',
      'DateTime.Today',
      'DateTime.Now',
      'StudentName',
    ])
    expect(subjectWildcardsHidden(14)).toBe(true)
    expect(subjectWildcardsHidden(2)).toBe(false)
  })

  it('accepts template files by type or by extension', () => {
    expect(isAllowedTemplateFile({ name: 'a.html', type: 'text/html' })).toBe(true)
    expect(isAllowedTemplateFile({ name: 'a.cshtml', type: '' })).toBe(true)
    expect(isAllowedTemplateFile({ name: 'a.pdf', type: 'application/pdf' })).toBe(false)
  })

  it('nests Quill 2 lists with legacy ordered list styles', () => {
    const html =
      '<ol><li data-list="ordered">One</li><li data-list="ordered" class="ql-indent-1">Sub</li><li data-list="bullet">Dot</li></ol>'
    expect(nestQuillLists(html)).toBe(
      '<ol style="list-style-type:decimal;"><li>One<ol style="list-style-type:lower-alpha;"><li>Sub</li></ol></li></ol><ul><li>Dot</li></ul>',
    )
  })

  it('cleans Razor blocks and turns code blocks into content_pre divs', () => {
    expect(cleanRazorBlocks('<p>@if (x) {</p><p>A &amp; B</p><p>}</p>')).toBe('<p>@if (x) {A & B}</p>')
    expect(formatCodeBlocks('<pre data-language="plain">a &amp; b</pre>')).toBe(
      '<div class="content_pre">a & b</div>',
    )
  })

  it('wraps the document like legacy and collapses @@', () => {
    const content = buildContentFile('Hello <b>', '<p>@@Model.Name</p>')
    expect(content).toBe(
      '<!DOCTYPE html> <html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8" /><title>Hello &lt;b&gt;</title></head><body class ="bodyTemplate"><p>@Model.Name</p></body></html>',
    )
  })

  it('flags links without a web or mail prefix and lists missing fields in order', () => {
    expect(hasRelativeLinks('<a href="www.site.com">x</a>')).toBe(true)
    expect(hasRelativeLinks('<a href="https://site.com">x</a><a href="mailto:a@b.c">y</a>')).toBe(false)
    expect(missingTemplateFields({ name: '', subject: '', fileTemplateTypeId: 0 }, false)).toEqual([
      'Subject',
      'Name',
      'FileTemplateType',
      'FileEditor',
    ])
  })
})
