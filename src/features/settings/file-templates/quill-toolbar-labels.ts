// Fallback names for the Quill toolbar; Quill itself only sets raw format keys such as "bold".
export const TOOLBAR_EN = {
  toolbar: 'Formatting',
  header: 'Heading',
  headerValues: { '1': 'Heading 1', '2': 'Heading 2', '3': 'Heading 3', '': 'Normal text' },
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strike: 'Strikethrough',
  color: 'Text colour',
  background: 'Highlight colour',
  defaultColour: 'Default',
  list: { ordered: 'Numbered list', bullet: 'Bulleted list' },
  indent: { '-1': 'Decrease indent', '+1': 'Increase indent' },
  align: 'Alignment',
  alignValues: { '': 'Left', center: 'Centre', right: 'Right', justify: 'Justify' },
  link: 'Link',
  blockquote: 'Quote',
  codeBlock: 'Code block',
  clean: 'Clear formatting',
} as const

export type ToolbarLabels = typeof TOOLBAR_EN

const lookup = (map: Readonly<Record<string, string>>, key: string) => map[key] ?? key

const FORMATS = [
  'ql-header',
  'ql-color',
  'ql-background',
  'ql-align',
  'ql-bold',
  'ql-italic',
  'ql-underline',
  'ql-strike',
  'ql-list',
  'ql-indent',
  'ql-link',
  'ql-blockquote',
  'ql-code-block',
  'ql-clean',
] as const

const formatOf = (element: Element) => FORMATS.find(name => element.classList.contains(name))

function pickerNames(format: string, labels: ToolbarLabels) {
  if (format === 'ql-header')
    return { name: labels.header, item: (value: string) => lookup(labels.headerValues, value) }
  if (format === 'ql-align')
    return { name: labels.align, item: (value: string) => lookup(labels.alignValues, value) }
  const name = format === 'ql-background' ? labels.background : labels.color
  return { name, item: (value: string) => value || labels.defaultColour }
}

function buttonName(format: string, value: string, labels: ToolbarLabels): string | null {
  const names: Readonly<Record<string, string>> = {
    'ql-bold': labels.bold,
    'ql-italic': labels.italic,
    'ql-underline': labels.underline,
    'ql-strike': labels.strike,
    'ql-list': lookup(labels.list, value),
    'ql-indent': lookup(labels.indent, value),
    'ql-link': labels.link,
    'ql-blockquote': labels.blockquote,
    'ql-code-block': labels.codeBlock,
    'ql-clean': labels.clean,
  }
  return names[format] ?? null
}

// Names every toolbar button, picker label and picker item after Quill has built the toolbar.
export function labelQuillToolbar(toolbar: Element, labels: ToolbarLabels = TOOLBAR_EN) {
  toolbar.setAttribute('aria-label', labels.toolbar)
  for (const picker of toolbar.querySelectorAll('.ql-picker')) {
    const format = formatOf(picker)
    if (!format) continue
    const names = pickerNames(format, labels)
    picker.querySelector('.ql-picker-label')?.setAttribute('aria-label', names.name)
    for (const item of picker.querySelectorAll('.ql-picker-item')) {
      item.setAttribute('aria-label', `${names.name}: ${names.item(item.getAttribute('data-value') ?? '')}`)
    }
  }
  for (const button of toolbar.querySelectorAll('button')) {
    const format = formatOf(button)
    const value = button.getAttribute('value') ?? ''
    const name = format ? buttonName(format, value, labels) : null
    if (name) button.setAttribute('aria-label', name)
  }
}
