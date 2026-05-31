const MIN_OPERATIONS = 1
const MIN_SET_ATTR_OPS = 4

const SUPPORTED_PROPS = new Set([
    'className', 'id', 'textContent', 'innerHTML', 'style',
    'href', 'src', 'alt', 'title', 'value', 'type', 'name', 'placeholder'
])
const SUPPORTED_METHODS = new Set(['setAttribute'])


function getTargetString (node) {
    if (node.type === 'Identifier') {
        return node.name
    }

    if (node.type === 'MemberExpression' && node.object.type === 'ThisExpression') {
        const prop = node.property
        if (prop.type === 'PrivateIdentifier') {
            return `this.#${prop.name}`
        }
        if (prop.type === 'Identifier') {
            return `this.${prop.name}`
        }
    }

    return null
}


function isDocumentCreateElement (node) {
    if (!node || node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
        return false
    }
    const obj = node.callee.object
    const prop = node.callee.property
    return obj.type === 'Identifier' && obj.name === 'document' &&
        prop.type === 'Identifier' && prop.name === 'createElement'
}


function getTagName (callNode) {
    const arg = callNode.arguments[0]
    return arg?.type === 'Literal' ? arg.value : '?'
}


function getAssignmentOp (expr, targetName) {
    if (expr.type !== 'AssignmentExpression' || expr.left.type !== 'MemberExpression') {
        return null
    }

    const obj = expr.left.object

    if (getTargetString(obj) === targetName) {
        const prop = expr.left.property
        const propName = prop.type === 'Identifier' ? prop.name : '?'
        return {name: `.${propName}`, supported: SUPPORTED_PROPS.has(propName)}
    }

    if (obj.type === 'MemberExpression' &&
        getTargetString(obj.object) === targetName &&
        obj.property.type === 'Identifier' &&
        obj.property.name === 'style') {
        const styleProp = expr.left.property
        const propName = styleProp.type === 'Identifier' ? styleProp.name : '?'
        return {name: `.style.${propName}`, supported: true}
    }

    return null
}


function getCallOp (expr, targetName) {
    if (expr.type !== 'CallExpression' || expr.callee.type !== 'MemberExpression') {
        return null
    }
    if (getTargetString(expr.callee.object) !== targetName) {
        return null
    }
    const prop = expr.callee.property
    const methodName = prop.type === 'Identifier' ? prop.name : '?'
    return {name: `.${methodName}()`, supported: SUPPORTED_METHODS.has(methodName)}
}


function getOperationOnTarget (node, targetName) {
    if (node.type !== 'ExpressionStatement') {
        return null
    }
    const expr = node.expression
    return getAssignmentOp(expr, targetName) || getCallOp(expr, targetName)
}


function collectOperations (statements, startIndex, targetName) {
    const supportedOps = []
    let totalOps = 0

    for (let j = startIndex + 1; j < statements.length; j++) {
        const op = getOperationOnTarget(statements[j], targetName)
        if (!op) {
            break
        }
        totalOps++
        if (op.supported) {
            supportedOps.push(op.name)
        }
    }

    return {supportedOps, totalOps}
}


function extractFromVariableDeclaration (node) {
    const declarator = node.declarations[0]
    if (!declarator || declarator.id.type !== 'Identifier' || !isDocumentCreateElement(declarator.init)) {
        return null
    }
    return {targetName: declarator.id.name, initNode: declarator.init}
}


function extractFromAssignment (expr) {
    if (!isDocumentCreateElement(expr.right)) {
        return null
    }
    const targetName = getTargetString(expr.left)
    return targetName ? {targetName, initNode: expr.right} : null
}


function extractCreateElementInfo (node) {
    if (node.type === 'VariableDeclaration') {
        return extractFromVariableDeclaration(node)
    }
    if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression') {
        return extractFromAssignment(node.expression)
    }
    return null
}


export function checkCreateElementSequence (statements, startIndex) {
    const node = statements[startIndex]
    const createInfo = extractCreateElementInfo(node)
    if (!createInfo) {
        return null
    }

    const {targetName, initNode} = createInfo
    const {supportedOps, totalOps} = collectOperations(statements, startIndex, targetName)

    if (supportedOps.length >= MIN_OPERATIONS) {
        const line = node.loc.start.line
        const issue = `L${line}: createElement('${getTagName(initNode)}') + ${supportedOps.length} ops: ${supportedOps.join(', ')}`
        return {issue, skip: totalOps}
    }

    return null
}


function isSetAttributeCall (node) {
    if (node.type !== 'ExpressionStatement') {
        return false
    }
    const expr = node.expression
    if (expr.type !== 'CallExpression' || expr.callee.type !== 'MemberExpression') {
        return false
    }
    const prop = expr.callee.property
    return prop.type === 'Identifier' && prop.name === 'setAttribute'
}


function getCallTarget (node) {
    return getTargetString(node.expression.callee.object)
}


function getAttributeName (node) {
    const arg = node.expression.arguments[0]
    return arg?.type === 'Literal' ? arg.value : '?'
}


export function checkSetAttributeSequence (statements, startIndex) {
    const node = statements[startIndex]
    if (!isSetAttributeCall(node)) {
        return null
    }

    const targetName = getCallTarget(node)
    if (!targetName) {
        return null
    }

    const line = node.loc.start.line
    const attrs = [getAttributeName(node)]
    let count = 1

    for (let j = startIndex + 1; j < statements.length; j++) {
        const nextNode = statements[j]
        if (isSetAttributeCall(nextNode) && getCallTarget(nextNode) === targetName) {
            attrs.push(getAttributeName(nextNode))
            count++
        } else {
            break
        }
    }

    if (count >= MIN_SET_ATTR_OPS) {
        return {issue: `L${line}: ${targetName}.setAttribute() x${count}: ${attrs.join(', ')}`, skip: count - 1}
    }

    return null
}
