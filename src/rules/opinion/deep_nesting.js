import {defineRule} from '../../core/rule.js'


const DEFAULT_INDENT = 12


function countLeadingSpaces (line) {
    const match = line.match(/^(\s*)/)
    return match ? match[1].length : 0
}


function isTestLine (line) {
    const trimmed = line.trim()
    return trimmed.startsWith('describe(') || trimmed.startsWith('test(') || trimmed.startsWith('it(')
}


export function findDeepNesting (content, threshold = DEFAULT_INDENT) {
    const lines = content.split('\n')
    const deep = []

    for (let i = 0; i < lines.length; i++) {
        const indent = countLeadingSpaces(lines[i])
        if (isTestLine(lines[i]) && indent >= threshold) {
            deep.push({line: i + 1, indent})
        }
    }

    return deep
}


export default defineRule({
    name: 'test-deep-nesting',
    group: 'opinion',
    category: 'tests',
    hint: 'Flatten structure — remove unnecessary describe wrappers',
    defaultInclude: ['**/*.test.js'],
    check (content, ctx) {
        const threshold = ctx.options.indent || DEFAULT_INDENT
        return findDeepNesting(content, threshold).map(entry =>
            `L${entry.line}: deeply nested (indent ${entry.indent})`)
    }
})
