import type {
  ListOption,
  RuleDefinitionAttributeOption,
  TriggerTypeAttributeOption,
} from './node-panel-types'

// WorkflowStageRuleGroupsRuleAttributes.cshtml:44 lists these by enum id, never by display name:
// CfcWorkflowRuleDefinitionAttributesEnum.LessonTypePercent = 15, LessonTypeMissed = 16.
const LESSON_TYPE_ATTRIBUTE_IDS = new Set([15, 16])
const RANGE_STRING_ATTRIBUTE_IDS = new Set([17, 18, 19, 20, 40, 41])
const RANGE_STRING_PATTERN = /^([0-9]+(\-[0-9]+)*,*)+$/

export function isLessonTypeAttribute(attribute: RuleDefinitionAttributeOption): boolean {
  return LESSON_TYPE_ATTRIBUTE_IDS.has(attribute.id)
}

export function validateRuleAttributeValue(
  attribute: RuleDefinitionAttributeOption | undefined,
  value: string,
): boolean {
  if (!attribute?.dataType) return false
  switch (attribute.dataType) {
    case 'Int32':
      return /^\d+$/.test(value)
    case 'String':
      // _validateModal (:629-638) only ever accepts the range-string ids; any other String stays invalid.
      if (!value || !RANGE_STRING_ATTRIBUTE_IDS.has(attribute.id)) return false
      if (value.endsWith(',')) return false
      return RANGE_STRING_PATTERN.test(value)
    case 'Double':
      return value !== '' && /^\d*(\.\d{0,2})?$/.test(value)
    case 'Bool':
      return value === 'true' || value === 'false'
    default:
      return false
  }
}

export function validateTriggerAttributeValue(
  attribute: TriggerTypeAttributeOption | undefined,
  value: string,
): boolean {
  if (!attribute?.dataType) return false
  switch (attribute.dataType) {
    case 'Int32':
    case 'Double':
      return /^\d+$/.test(value)
    case 'Bool':
      return value === 'true' || value === 'false'
    case 'String':
      return typeof value === 'string'
    default:
      return false
  }
}

const VALUE_MESSAGES = {
  chooseType: 'Select an attribute type.',
  required: 'Enter a value.',
  wholeNumber: 'Enter a whole number, for example 12.',
  range: 'Enter numbers or ranges separated by commas, for example 1-3,5.',
  decimal: 'Enter a number with up to two decimal places, for example 12.5.',
  yesNo: 'Select Yes or No.',
  unsupported: 'This attribute type cannot be saved.',
} as const

// Specific inline messages for the same rules the validators enforce (requirement 8.1).
export function ruleAttributeValueError(
  attribute: RuleDefinitionAttributeOption | undefined,
  value: string,
): string | null {
  if (validateRuleAttributeValue(attribute, value)) return null
  if (!attribute) return VALUE_MESSAGES.chooseType
  switch (attribute.dataType) {
    case 'Int32':
      return value ? VALUE_MESSAGES.wholeNumber : VALUE_MESSAGES.required
    case 'String':
      return value ? VALUE_MESSAGES.range : VALUE_MESSAGES.required
    case 'Double':
      return value ? VALUE_MESSAGES.decimal : VALUE_MESSAGES.required
    case 'Bool':
      return VALUE_MESSAGES.yesNo
    default:
      return VALUE_MESSAGES.unsupported
  }
}

export function triggerAttributeValueError(
  attribute: TriggerTypeAttributeOption | undefined,
  value: string,
): string | null {
  if (validateTriggerAttributeValue(attribute, value)) return null
  if (!attribute) return VALUE_MESSAGES.chooseType
  switch (attribute.dataType) {
    case 'Int32':
    case 'Double':
      return value ? VALUE_MESSAGES.wholeNumber : VALUE_MESSAGES.required
    case 'Bool':
      return VALUE_MESSAGES.yesNo
    default:
      return VALUE_MESSAGES.unsupported
  }
}

export type TriggerListKind = 'template' | 'contact' | 'function' | 'stage' | 'manual'

// WorkflowStageRuleGroupsTriggerAttributes.cshtml:60-64 keys these off CfcTriggerTypeAttributeEnum ids, not
// names. SmsFileTemplateUniqueIdentifier (20) is deliberately absent from its template list.
const TRIGGER_LIST_IDS: ReadonlyArray<readonly [TriggerListKind, ReadonlySet<number>]> = [
  ['template', new Set([23, 15])],
  ['contact', new Set([18, 16, 17])],
  ['function', new Set([30, 28, 29])],
  ['stage', new Set([1])],
  ['manual', new Set([6])],
]

export function triggerAttributeListKind(attribute: TriggerTypeAttributeOption): TriggerListKind | null {
  return TRIGGER_LIST_IDS.find(([, ids]) => ids.has(attribute.id))?.[0] ?? null
}

export function listOptionLabel(option: ListOption): string {
  return option.description ?? String(option.id)
}
