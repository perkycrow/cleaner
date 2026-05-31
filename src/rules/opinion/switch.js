import {defineRule} from '../../core/rule.js'


function isInsideTemplateString (content, targetIndex) {
    let inTemplate = false

    for (let i = 0; i < targetIndex; i++) {
        if (content[i] === '`' && (i === 0 || content[i - 1] !== '\\')) {
            inTemplate = !inTemplate
        }
    }

    return inTemplate
}


export function findSwitches (content) {
    const regex = /\bswitch\s*\(/g
    const lines = content.split('\n')
    const switches = []
    let match

    while ((match = regex.exec(content)) !== null) {
        if (isInsideTemplateString(content, match.index)) {
            continue
        }
        const lineNumber = content.substring(0, match.index).split('\n').length
        switches.push({line: lineNumber, context: lines[lineNumber - 1].trim()})
    }

    return switches
}


export default defineRule({
    name: 'switch',
    group: 'opinion',
    category: 'switch',
    hint: 'Consider refactoring to object lookups or polymorphism',
    check (content) {
        return findSwitches(content).map(entry => `L${entry.line}: ${entry.context}`)
    }
})
