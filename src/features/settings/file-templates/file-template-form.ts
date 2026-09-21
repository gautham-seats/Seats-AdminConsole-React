import type { FileTemplateDto, FileTemplateTypeDto, TypeValuesDto } from '@/types/file-templates'

// seats-website-file-template.html field limits and system wildcards.
export const NAME_MAX = 250
export const COMMENT_MAX = 200
export const TITLE_MAX = 200
export const SUBJECT_MAX = 250
export const TEMPLATE_ACCEPT = '.html,.cshtml,.txt,.csv'
export const SYSTEM_WILDCARDS = [
  'DateTime.Now.ToShortDateString()',
  'DateTime.Today',
  'DateTime.Now',
] as const
const ALLOWED_TYPES = ['text/html', 'text/plain', 'text/csv', 'application/vnd.ms-excel']
const ALLOWED_EXTENSIONS = ['.html', '.cshtml', '.txt', '.csv']
// Types 12, 14 and 20-23 have no subject wildcard dropdown (:794).
const NO_SUBJECT_WILDCARDS = [12, 14, 20, 21, 22, 23]
const EMPTY_EDITOR = '<p><br></p>'

export function subjectWildcardsHidden(typeId: number | null): boolean {
  return typeId === null || typeId === 0 || NO_SUBJECT_WILDCARDS.includes(typeId)
}

export function wildcardsFor(
  typeId: number | null,
  types: readonly FileTemplateTypeDto[],
  typeValues: readonly TypeValuesDto[],
): string[] {
  const type = types.find(item => item.id === typeId)
  const extra = type?.className
    ? (typeValues.find(item => item.className === type.className)?.values ?? [])
    : []
  return [...SYSTEM_WILDCARDS, ...extra]
}

// _listItemSeleted (:773-790): DateTime values get "@", model values get "@Model.", plus a trailing space.
export function wildcardInsertion(item: string): string {
  const value = item.trim()
  const prefix = value.includes('DateTime.Today') || value.includes('DateTime.Now') ? '@' : '@Model.'
  return `${prefix}${value} `
}

export function appendSubjectWildcard(subject: string | null, value: string): string {
  return `${subject ?? ''}@Model.${value}`
}

// Legacy compared the whole file name with the MIME list when the type was empty, so .cshtml always failed.
export function isAllowedTemplateFile(file: { name: string; type: string }): boolean {
  if (file.type) return ALLOWED_TYPES.includes(file.type)
  const name = file.name.toLowerCase()
  return ALLOWED_EXTENSIONS.some(extension => name.endsWith(extension))
}

const SVG_TAGS = /<[/]{0,1}(svg|SVG)[^><]*>/g

export function extractTitle(content: string): string {
  return /<title[^>]*?>/i.test(content)
    ? content.replace(/^[\S\s]*<title[^>]*?>/i, '').replace(/<\/title[\S\s]*$/i, '')
    : ''
}

export function extractBody(content: string): string {
  return content.replace(/^[\S\s]*<body[^>]*?>/i, '').replace(/<\/body[\S\s]*$/i, '')
}

export function readTemplateFile(text: string): { title: string; body: string } {
  return { title: extractTitle(text).replace(SVG_TAGS, ''), body: extractBody(text).replace(SVG_TAGS, '') }
}

// Stored <div class="content_pre"> blocks go back into the editor as code blocks.
export function toEditorHtml(content: string | null): string {
  if (!content) return ''
  return extractBody(content).replace(/<div class="content_pre">([\s\S]*?)<\/div>/g, '<pre>$1</pre>')
}

const INDENT = /ql-indent-(\d+)/
const LIST_STYLES = ['decimal', 'lower-alpha', 'lower-roman'] as const

type ListItem = { kind: 'bullet' | 'ordered'; level: number; html: string }

// Quill 2 keeps every list flat with data-list and ql-indent-N; e-mails need real nested lists (legacy listFix, :595-710).
export function nestQuillLists(html: string): string {
  return html.replace(/<ol>([\s\S]*?)<\/ol>/g, (_, inner: string) => {
    const items: ListItem[] = [...inner.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].map(match => {
      const attributes = match[1]
      const kind = /data-list="ordered"/.test(attributes) ? 'ordered' : 'bullet'
      const level = Number(INDENT.exec(attributes)?.[1] ?? 0)
      const body = match[2].replace(/<span class="ql-ui"[^>]*><\/span>/g, '')
      return { kind, level, html: body }
    })
    let out = ''
    const open: ListItem['kind'][] = []
    for (const item of items) {
      while (open.length > item.level + 1) out += `</li></${open.pop() === 'ordered' ? 'ol' : 'ul'}>`
      if (open.length === item.level + 1 && open[open.length - 1] !== item.kind) {
        out += `</li></${open.pop() === 'ordered' ? 'ol' : 'ul'}>`
      }
      if (open.length === item.level + 1) {
        out += '</li>'
      }
      while (open.length < item.level + 1) {
        const depth = open.length
        out +=
          item.kind === 'ordered'
            ? `<ol style="list-style-type:${LIST_STYLES[depth % LIST_STYLES.length]};">`
            : '<ul>'
        open.push(item.kind)
      }
      out += `<li>${item.html}`
    }
    while (open.length) out += `</li></${open.pop() === 'ordered' ? 'ol' : 'ul'}>`
    return out
  })
}

const RAZOR_BLOCKS = [
  { start: '@{', open: '{', close: '}' },
  { start: '@(', open: '(', close: ')' },
  { start: '@if', open: '{', close: '}' },
  { start: '@foreach', open: '{', close: '}' },
  { start: '@while', open: '{', close: '}' },
  { start: '@for', open: '{', close: '}' },
] as const

// _checkRazorCode (:870-929): inside Razor blocks the editor's <p> tags are removed and &amp; becomes &.
export function cleanRazorBlocks(content: string): string {
  let result = content
  for (const block of RAZOR_BLOCKS) {
    const lower = result.toLowerCase()
    const ranges: { start: number; end: number }[] = []
    let from = 0
    for (;;) {
      const start = lower.indexOf(block.start, from)
      if (start === -1) break
      const openAt = lower.indexOf(block.open, start)
      if (openAt === -1) break
      let depth = 0
      let end = -1
      for (let index = openAt; index < lower.length; index++) {
        if (lower[index] === block.open) depth++
        else if (lower[index] === block.close && --depth === 0) {
          end = index
          break
        }
      }
      if (end === -1) break
      ranges.push({ start, end })
      from = end + 1
    }
    for (const range of ranges.reverse()) {
      const segment = result.slice(range.start, range.end + 1)
      const cleaned = segment.replace(/<p>/g, '').replace(/<\/p>/g, '').replace(/&amp;/g, '&')
      result = result.slice(0, range.start) + cleaned + result.slice(range.end + 1)
    }
  }
  return result
}

// _formatTagPre(true) (:754-768), without the legacy "<<div" slip.
export function formatCodeBlocks(content: string): string {
  return content
    .replace(
      /<div class="ql-code-block-container"[^>]*>([\s\S]*?)<\/div>(?=\s*(<|$))/g,
      (_, inner: string) => {
        const lines = [...inner.matchAll(/<div class="ql-code-block"[^>]*>([\s\S]*?)<\/div>/g)].map(
          match => match[1],
        )
        return `<pre>${lines.join('\n')}</pre>`
      },
    )
    .replace(
      /<pre[^>]*>([\s\S]*?)<\/pre>/g,
      (_, inner: string) => `<div class="content_pre">${inner.replace(/&amp;/g, '&')}</div>`,
    )
}

export function hasRelativeLinks(html: string): boolean {
  return [...html.matchAll(/href="([^"]*)"/gi)].some(match => {
    const href = match[1].toLowerCase()
    return !href.includes('http') && !href.includes('mailto')
  })
}

export function isEditorEmpty(html: string): boolean {
  return !html || html === EMPTY_EDITOR
}

// _computedContentFile (:721-753).
export function buildContentFile(title: string, editorHtml: string): string {
  const body = formatCodeBlocks(cleanRazorBlocks(nestQuillLists(editorHtml)))
  return (
    '<!DOCTYPE html> ' +
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">' +
    `<head><meta charset="utf-8" /><title>${escapeTitle(title)}</title></head>` +
    `<body class ="bodyTemplate">${body}</body>` +
    '</html>'
  ).replace(/@@/g, '@')
}

// Legacy concatenated the title raw; < and > would break the head.
function escapeTitle(title: string): string {
  return title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export type TemplateValues = Pick<FileTemplateDto, 'name' | 'subject' | 'fileTemplateTypeId'>

export type TemplateMissing = 'Subject' | 'Name' | 'FileTemplateType' | 'FileEditor'

// _validateFileTemplate (:525-551): subject, name, type, then content.
export function missingTemplateFields(values: TemplateValues, hasContent: boolean): TemplateMissing[] {
  const missing: TemplateMissing[] = []
  if (!values.subject) missing.push('Subject')
  if (!values.name) missing.push('Name')
  if (!values.fileTemplateTypeId) missing.push('FileTemplateType')
  if (!hasContent) missing.push('FileEditor')
  return missing
}

export function validationBody(template: FileTemplateDto, contentFile: string) {
  return {
    fileName: '',
    subject: template.subject,
    name: '',
    comment: '',
    fileTemplateTypeId: template.fileTemplateTypeId,
    fileTemplateTypeDescription: '',
    contentFile,
  }
}
