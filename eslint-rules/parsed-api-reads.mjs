// Every answer from the shared API client must go through a parser before it is used, so a change
// in the server's shape surfaces as one clear error instead of a blank column. The rule accepts
// `parse(await api.get<unknown>(...))` and `const raw = await api.get<unknown>(...); parse(raw)`.
// Only reads: a write's answer is rarely used, and when it is, it goes through the same parsers.
const METHODS = new Set(['get'])

function isApiCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'api' &&
    node.callee.property.type === 'Identifier' &&
    METHODS.has(node.callee.property.name)
  )
}

function typeArgument(node) {
  const params = node.typeArguments ?? node.typeParameters
  return params?.params?.[0] ?? null
}

function isUnknownRead(node) {
  const type = typeArgument(node)
  if (!type) return true
  return type.type === 'TSUnknownKeyword'
}

function unwrap(node) {
  let current = node
  while (
    current.parent &&
    (current.parent.type === 'AwaitExpression' || current.parent.type === 'TSAsExpression')
  ) {
    current = current.parent
  }
  return current
}

function isArgumentOfCall(node) {
  const parent = node.parent
  return parent && parent.type === 'CallExpression' && parent.arguments.includes(node)
}

function variableIsParsed(context, declarator) {
  if (declarator.id.type !== 'Identifier') return false
  const scope = context.sourceCode.getScope(declarator)
  const variable =
    scope.set.get(declarator.id.name) ?? scope.variables.find(v => v.name === declarator.id.name)
  if (!variable) return false
  return variable.references.some(ref => {
    const id = ref.identifier
    if (!ref.isRead()) return false
    // Passed to a parser, or narrowed inline with typeof / Array.isArray.
    return isArgumentOfCall(id) || (id.parent?.type === 'UnaryExpression' && id.parent.operator === 'typeof')
  })
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'API reads typed as unknown must be passed to a parser' },
    schema: [],
    messages: {
      unparsed: 'Pass the result of api.{{method}}<unknown>() to a parser before using it.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isApiCall(node) || !isUnknownRead(node)) return
        const expression = unwrap(node)
        if (isArgumentOfCall(expression)) return
        const parent = expression.parent
        if (parent && parent.type === 'VariableDeclarator' && variableIsParsed(context, parent)) return
        // A void request (nothing to parse) is fine when its value is never used.
        if (parent && parent.type === 'ExpressionStatement') return
        context.report({ node, messageId: 'unparsed', data: { method: node.callee.property.name } })
      },
    }
  },
}

export default rule
