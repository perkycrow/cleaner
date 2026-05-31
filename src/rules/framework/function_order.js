import * as acorn from 'acorn'
import {defineRule} from '../../core/rule.js'


function parseContent (content) {
    try {
        return acorn.parse(content, {ecmaVersion: 'latest', sourceType: 'module', locations: true})
    } catch {
        return null
    }
}


function findExportDefaultClass (ast) {
    for (const node of ast.body) {
        if (node.type === 'ExportDefaultDeclaration' && node.declaration?.type === 'ClassDeclaration') {
            return {startLine: node.loc.start.line}
        }
    }
    return null
}


export function findFunctionsBeforeClass (content) {
    const ast = parseContent(content)
    if (!ast) {
        return []
    }

    const exportDefaultClass = findExportDefaultClass(ast)
    if (!exportDefaultClass) {
        return []
    }

    const issues = []
    for (const node of ast.body) {
        if (node.type === 'FunctionDeclaration' && node.loc.start.line < exportDefaultClass.startLine) {
            const name = node.id?.name || 'anonymous'
            issues.push(`L${node.loc.start.line}: function ${name}() declared before class`)
        }
    }

    return issues
}


export default defineRule({
    name: 'function-order',
    group: 'framework',
    category: 'function_order',
    hint: 'Declare functions after the export default class',
    defaultExclude: ['**/*.test.js', '**/*.doc.js'],
    check (content) {
        return findFunctionsBeforeClass(content)
    }
})
