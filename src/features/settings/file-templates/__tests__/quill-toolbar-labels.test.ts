import { labelQuillToolbar } from '../quill-toolbar-labels'

describe('labelQuillToolbar', () => {
  it('names the toolbar, picker labels, picker items and buttons', () => {
    const toolbar = document.createElement('div')
    toolbar.innerHTML = [
      '<span class="ql-header ql-picker"><span class="ql-picker-label" role="button"></span>',
      '<span class="ql-picker-options"><span class="ql-picker-item" data-value="1"></span><span class="ql-picker-item"></span></span></span>',
      '<span class="ql-background ql-picker ql-color-picker"><span class="ql-picker-label" role="button"></span>',
      '<span class="ql-picker-options"><span class="ql-picker-item ql-primary" data-value="#e60000"></span></span></span>',
      '<button class="ql-bold ql-active" aria-label="bold"></button>',
      '<button class="ql-list" value="ordered" aria-label="list: ordered"></button>',
      '<button class="ql-indent" value="+1"></button>',
    ].join('')

    labelQuillToolbar(toolbar)

    const label = (selector: string) => toolbar.querySelector(selector)?.getAttribute('aria-label')
    expect(toolbar.getAttribute('aria-label')).toBe('Formatting')
    expect(label('.ql-header .ql-picker-label')).toBe('Heading')
    expect(label('.ql-header [data-value="1"]')).toBe('Heading: Heading 1')
    expect(label('.ql-header .ql-picker-item:not([data-value])')).toBe('Heading: Normal text')
    expect(label('.ql-background .ql-picker-label')).toBe('Highlight colour')
    expect(label('.ql-background .ql-picker-item')).toBe('Highlight colour: #e60000')
    expect(label('.ql-bold')).toBe('Bold')
    expect(label('.ql-list')).toBe('Numbered list')
    expect(label('.ql-indent')).toBe('Increase indent')
  })
})
