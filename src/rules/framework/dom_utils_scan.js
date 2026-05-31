import * as acorn from 'acorn'
import {checkCreateElementSequence, checkSetAttributeSequence} from './dom_utils_sequences.js'


const LOOP_TYPES = new Set(['ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement'])


function parseContent (content) {
    try {
        return acorn.parse(content, {ecmaVersion: 'latest', sourceType: 'module', locations: true})
    } catch {
        return null
    }
}


function scanSequences (statements, index) {
    const createResult = checkCreateElementSequence(statements, index)
    if (createResult) {
        return createResult
    }
    return checkSetAttributeSequence(statements, index)
}


function scanNestedBlocks (node) {
    if (node.type === 'IfStatement') {
        const issues = []
        if (node.consequent?.body) {
            issues.push(...scanBlockStatements(node.consequent.body))
        }
        if (node.alternate?.body) {
            issues.push(...scanBlockStatements(node.alternate.body))
        }
        return issues
    }

    if (LOOP_TYPES.has(node.type) && node.body?.body) {
        return scanBlockStatements(node.body.body)
    }

    return []
}


function scanBlockStatements (statements) {
    const issues = []

    for (let i = 0; i < statements.length; i++) {
        const result = scanSequences(statements, i)
        if (result) {
            issues.push(result.issue)
            i += result.skip
            continue
        }
        issues.push(...scanNestedBlocks(statements[i]))
    }

    return issues
}


function scanClassBody (classBody) {
    const issues = []
    for (const member of classBody.body) {
        if (member.type === 'MethodDefinition' && member.value?.body?.body) {
            issues.push(...scanBlockStatements(member.value.body.body))
        }
    }
    return issues
}


function scanNodeBody (node) {
    if (node.type === 'ExportDefaultDeclaration' && node.declaration?.type === 'ClassDeclaration') {
        return scanClassBody(node.declaration.body)
    }
    if (node.type === 'ClassDeclaration') {
        return scanClassBody(node.body)
    }
    if (node.type === 'FunctionDeclaration' && node.body?.body) {
        return scanBlockStatements(node.body.body)
    }
    return []
}


export function findVerbosePatterns (content) {
    const ast = parseContent(content)
    if (!ast) {
        return []
    }

    const issues = []

    for (let i = 0; i < ast.body.length; i++) {
        const result = scanSequences(ast.body, i)
        if (result) {
            issues.push(result.issue)
            i += result.skip
            continue
        }
        issues.push(...scanNodeBody(ast.body[i]))
    }

    return issues
}
