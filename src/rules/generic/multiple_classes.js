import * as acorn from 'acorn'
import {defineRule} from '../../core/rule.js'


function parseContent (content) {
    try {
        return acorn.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            locations: true
        })
    } catch {
        return null
    }
}


function extractClassFromNode (node) {
    if (node.type === 'ClassDeclaration') {
        return {name: node.id?.name || 'Anonymous', line: node.loc.start.line}
    }

    const isExport = node.type === 'ExportDefaultDeclaration' || node.type === 'ExportNamedDeclaration'
    if (isExport && node.declaration?.type === 'ClassDeclaration') {
        return {name: node.declaration.id?.name || 'Anonymous', line: node.loc.start.line}
    }

    return null
}


export function findMultipleClasses (content) {
    const ast = parseContent(content)
    if (!ast) {
        return []
    }

    const classes = ast.body.map(extractClassFromNode).filter(Boolean)
    if (classes.length <= 1) {
        return []
    }

    const names = classes.map(entry => entry.name).join(', ')
    const locations = classes.map(entry => `L${entry.line}`).join(', ')

    return [`${locations}: ${classes.length} classes found: ${names}`]
}


export default defineRule({
    name: 'multiple-classes',
    group: 'generic',
    category: 'multiple_classes',
    hint: 'Each file should contain only one class. Split into separate files.',
    defaultExclude: ['**/*.test.js', '**/*.doc.js'],
    check (content) {
        return findMultipleClasses(content)
    }
})
