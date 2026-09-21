import { ENGAGEMENT_FALLBACK_ONLY } from '../engagement-text'

// ViewModels/Engagement/*.cs shapes; kept here until src/types/engagement.ts gains them (owner-only).
export type SimpleListItem = { id: number; description: string | null }

export type EngagementConstraint = {
  isInclude: boolean
  category: string
  value: string
  valueDescription: string | null
}

export type EngagementNode = {
  id: number
  parentNodeId: number
  isActive: boolean
  name: string | null
  nodeTypeId: number | null
  url: string | null
  urlKey: string | null
  level: number | null
  mapTo: number | null
  synapsesId: number | null
  weight: number | null
  decay: number | null
  patience: number | null
  threshold: number | null
  minZ: number | null
  maxZ: number | null
  childs: EngagementNode[]
  synapsesOptions: SimpleListItem[] | null
}

export type EngagementModelView = {
  applied: { id: number; modelName: string | null; isActive: boolean; constraints: EngagementConstraint[] }
  buildingDto: unknown
  nodeSynapsesOptions: unknown
  root: EngagementNode
}

export const DROPDOWN_CATEGORIES = ['facultyids', 'studenttypeids', 'studentyears', 'collegeyearids'] as const
export const SEARCH_CATEGORIES = ['courseids', 'programmeids', 'schoolids'] as const
export type DropdownCategory = (typeof DROPDOWN_CATEGORIES)[number]
export type SearchCategory = (typeof SEARCH_CATEGORIES)[number]
export type ConstraintCategory = DropdownCategory | SearchCategory

// Order of the "Model applied to" category list (seats-admin-engagement-model-rule.html:67-75).
export const APPLIED_CATEGORIES: readonly ConstraintCategory[] = [
  'courseids',
  'facultyids',
  'programmeids',
  'schoolids',
  'studenttypeids',
  'studentyears',
]

export const CATEGORY_TEXT = {
  courseids: 'Course',
  facultyids: 'Faculty',
  programmeids: 'Programme',
  schoolids: 'School',
  studenttypeids: 'StudentType',
  studentyears: 'StudentYear',
  collegeyearids: 'CollegeYear',
} as const satisfies Record<ConstraintCategory, string>

// Dataset building adds College Year to the same list (seats-admin-engagement-model-rule.html:68, show-college-year).
export const BUILDING_CATEGORIES: readonly ConstraintCategory[] = [
  'courseids',
  'collegeyearids',
  'facultyids',
  'programmeids',
  'schoolids',
  'studenttypeids',
  'studentyears',
]

export const NODE_NUMBER_FIELDS = ['weight', 'decay', 'patience', 'threshold', 'minZ', 'maxZ'] as const
export type NodeNumberField = (typeof NODE_NUMBER_FIELDS)[number]

export type NodeFields = Record<NodeNumberField | 'url' | 'urlKey', string> & { isActive: boolean }

export type DetailsForm = {
  modelName: string
  isActive: boolean
  constraints: EngagementConstraint[]
  nodes: Record<string, NodeFields>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object'
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null)

export function parseModelId(param: string): number | null {
  return /^\d+$/.test(param) && Number(param) > 0 ? Number(param) : null
}

export function parseSimpleList(raw: unknown): SimpleListItem[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(item =>
    isRecord(item) && typeof item.id === 'number'
      ? [{ id: item.id, description: str(item.description) }]
      : [],
  )
}

function parseNode(raw: unknown): EngagementNode {
  const record = isRecord(raw) ? raw : {}
  return {
    id: num(record.id) ?? 0,
    parentNodeId: num(record.parentNodeId) ?? 0,
    isActive: record.isActive === true,
    name: str(record.name),
    nodeTypeId: num(record.nodeTypeId),
    url: str(record.url),
    urlKey: str(record.urlKey),
    level: num(record.level),
    mapTo: num(record.mapTo),
    synapsesId: num(record.synapsesId),
    weight: num(record.weight),
    decay: num(record.decay),
    patience: num(record.patience),
    threshold: num(record.threshold),
    minZ: num(record.minZ),
    maxZ: num(record.maxZ),
    childs: Array.isArray(record.childs) ? record.childs.map(parseNode) : [],
    synapsesOptions: Array.isArray(record.synapsesOptions) ? parseSimpleList(record.synapsesOptions) : null,
  }
}

// Also used for the dataset building rules, which hold the same shape.
export function parseConstraintList(raw: unknown): EngagementConstraint[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(item => {
    if (
      !isRecord(item) ||
      typeof item.category !== 'string' ||
      item.value === undefined ||
      item.value === null
    )
      return []
    return [
      {
        isInclude: item.isInclude === true || item.isInclude === 'true',
        category: item.category,
        value: String(item.value),
        valueDescription: str(item.valueDescription),
      },
    ]
  })
}

// An unknown id comes back without buildingDto (EngagementApiController.cs:180-189).
export function parseModelView(raw: unknown): EngagementModelView | null {
  if (!isRecord(raw) || !isRecord(raw.appliedDto) || !isRecord(raw.buildingDto)) return null
  const applied = raw.appliedDto
  const nodeDto = isRecord(raw.nodeDto) ? raw.nodeDto : {}
  return {
    applied: {
      id: num(applied.id) ?? 0,
      modelName: str(applied.modelName),
      isActive: applied.isActive === true,
      constraints: parseConstraintList(applied.constraints),
    },
    buildingDto: raw.buildingDto,
    nodeSynapsesOptions: nodeDto.synapsesOptions ?? null,
    root: parseNode(nodeDto.node),
  }
}

export type NodeEntry = { path: string; node: EngagementNode; parent: EngagementNode | null }

// Root, second level and third level, as legacy renders them (seats-admin-engagement-model.html:494-524).
export function flattenNodes(root: EngagementNode): NodeEntry[] {
  const walk = (node: EngagementNode, path: string, parent: EngagementNode | null): NodeEntry[] => [
    { path, node, parent },
    ...node.childs.flatMap((child, index) => walk(child, `${path}.${index}`, node)),
  ]
  return walk(root, 'r', null)
}

const text = (value: number | null) => (value === null ? '' : String(value))

export function toDetailsForm(view: EngagementModelView): DetailsForm {
  const nodes: Record<string, NodeFields> = {}
  for (const { path, node } of flattenNodes(view.root)) {
    nodes[path] = {
      isActive: node.isActive,
      weight: text(node.weight),
      decay: text(node.decay),
      patience: text(node.patience),
      threshold: text(node.threshold),
      minZ: text(node.minZ),
      maxZ: text(node.maxZ),
      url: node.url ?? '',
      urlKey: node.urlKey ?? '',
    }
  }
  return {
    modelName: view.applied.modelName ?? '',
    isActive: view.applied.isActive,
    constraints: view.applied.constraints,
    nodes,
  }
}

// The server names the background node "Background" (EngagementApiController.cs:253).
export const isBackgroundNode = (node: EngagementNode) => node.level === 2 && node.name === 'Background'

// seats-admin-engagement-node.html:282-284: weight is hidden on the root and on presence children.
export function weightHidden(node: EngagementNode, parent: EngagementNode | null): boolean {
  if (node.level === 1) return true
  return node.level === 3 && (parent?.name ?? '').toLowerCase().includes('presence')
}

// seats-admin-engagement-node.html:276-281.
export const settingsDisabled = (node: EngagementNode, fields: NodeFields) =>
  isBackgroundNode(node) || !fields.isActive
export const urlDisabled = (node: EngagementNode, fields: NodeFields) =>
  !isBackgroundNode(node) || !fields.isActive

// Keystroke filters from the legacy allowed-pattern attributes (seats-admin-engagement-node.html:88-121).
const ALLOWED: Record<NodeNumberField, RegExp> = {
  weight: /[^-.0-9]/g,
  decay: /[^0-9.]/g,
  patience: /[^0-9]/g,
  threshold: /[^0-9]/g,
  minZ: /[^.0-9]/g,
  maxZ: /[^.0-9]/g,
}

export const filterNodeInput = (field: NodeNumberField, value: string) => value.replace(ALLOWED[field], '')

// seats-admin-engagement-model.html:873-876.
export const isValidUrl = (value: string) => /^(?:\w+:)?\/\/([^\s.]+\.\S{2}|localhost[:?\d]*)\S*$/.test(value)

export type DetailsError = { path: string; field: NodeNumberField | 'url'; message: string }

export function validateDetails(
  view: EngagementModelView,
  form: DetailsForm,
  fieldLabel: (field: NodeNumberField) => string,
): DetailsError[] {
  const errors: DetailsError[] = []
  for (const { path, node } of flattenNodes(view.root)) {
    const fields = form.nodes[path]
    if (!fields) continue
    const name = node.name ?? ''
    for (const field of NODE_NUMBER_FIELDS) {
      const raw = fields[field].trim()
      if (!raw) continue
      if (field === 'decay') {
        // seats-admin-engagement-node.html:312-327.
        const decay = parseFloat(raw)
        if (Number.isNaN(decay))
          errors.push({ path, field, message: ENGAGEMENT_FALLBACK_ONLY.decayNumber(name) })
        else if (decay === 0 || decay >= 1 || !Number.isFinite(Number(raw)))
          errors.push({ path, field, message: ENGAGEMENT_FALLBACK_ONLY.decayRange(name) })
      } else if (!Number.isFinite(Number(raw))) {
        errors.push({ path, field, message: ENGAGEMENT_FALLBACK_ONLY.notANumber(name, fieldLabel(field)) })
      }
    }
    // seats-admin-engagement-model.html:1539-1560.
    if (isBackgroundNode(node) && fields.isActive && !isValidUrl(fields.url))
      errors.push({ path, field: 'url', message: ENGAGEMENT_FALLBACK_ONLY.invalidUrl })
  }
  return errors
}

const toNumber = (value: string) => (value.trim() ? Number(value) : null)

function toNodeBody(node: EngagementNode, path: string, form: DetailsForm): EngagementNode {
  const fields = form.nodes[path]
  const childs = node.childs.map((child, index) => toNodeBody(child, `${path}.${index}`, form))
  if (!fields) return { ...node, childs }
  return {
    ...node,
    isActive: fields.isActive,
    weight: toNumber(fields.weight),
    decay: toNumber(fields.decay),
    patience: toNumber(fields.patience),
    threshold: toNumber(fields.threshold),
    minZ: toNumber(fields.minZ),
    maxZ: toNumber(fields.maxZ),
    url: fields.url,
    urlKey: fields.urlKey,
    childs,
  }
}

export type SaveModelBody = {
  appliedDto: EngagementModelView['applied']
  buildingDto: unknown
  nodeDto: { node: EngagementNode; synapsesOptions: unknown }
}

// Legacy posts the whole modelDto (seats-admin-engagement-model.html:1532-1537) with the edited buildingDto
// (:284, :1223-1231), which SaveModel stores as the dataset build parameters (EngagementApiController.cs:880).
export function toSaveBody(
  view: EngagementModelView,
  form: DetailsForm,
  buildingDto: unknown,
): SaveModelBody {
  return {
    appliedDto: {
      id: view.applied.id,
      modelName: form.modelName,
      isActive: form.isActive,
      constraints: form.constraints,
    },
    buildingDto,
    nodeDto: { node: toNodeBody(view.root, 'r', form), synapsesOptions: view.nodeSynapsesOptions },
  }
}

// Same value in the same category is a duplicate (seats-admin-engagement-model-rule.html:321-323).
export function hasConstraint(
  list: readonly EngagementConstraint[],
  candidate: EngagementConstraint,
): boolean {
  return list.some(
    item =>
      item.value === candidate.value && item.category.toLowerCase() === candidate.category.toLowerCase(),
  )
}

export function categoryKey(category: string): (typeof CATEGORY_TEXT)[keyof typeof CATEGORY_TEXT] | null {
  const key = category.toLowerCase().trim()
  return key in CATEGORY_TEXT ? CATEGORY_TEXT[key as keyof typeof CATEGORY_TEXT] : null
}

export const isDropdownCategory = (value: string): value is DropdownCategory =>
  (DROPDOWN_CATEGORIES as readonly string[]).includes(value)

export const isSearchCategory = (value: string): value is SearchCategory =>
  (SEARCH_CATEGORIES as readonly string[]).includes(value)
