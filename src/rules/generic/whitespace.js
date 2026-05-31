import {defineRule} from '../../core/rule.js'
import {analyzeLineBreaks, fixLineBreaks} from './whitespace_linebreaks.js'


export function fixTrailingWhitespace (content) {
    const lines = content.split('\n')
    let modified = false

    const fixedLines = lines.map(line => {
        const trimmed = line.replace(/\s+$/, '')
        if (trimmed !== line) {
            modified = true
        }
        return trimmed
    })

    return {result: fixedLines.join('\n'), modified}
}


export function fixEofNewline (content) {
    const trimmed = content.replace(/\n+$/, '')
    const result = trimmed + '\n'
    return {result, modified: result !== content}
}


export function processContent (content) {
    const issues = []
    let result = content
    let modified = false

    const trailing = fixTrailingWhitespace(result)
    if (trailing.modified) {
        result = trailing.result
        modified = true
        issues.push('trailing whitespace')
    }

    const eof = fixEofNewline(result)
    if (eof.modified) {
        result = eof.result
        modified = true
        issues.push('EOF newline')
    }

    const adjustments = analyzeLineBreaks(result)
    if (adjustments.length > 0) {
        result = fixLineBreaks(result, adjustments).result
        modified = true
        for (const adj of adjustments) {
            issues.push(`line breaks ${adj.context}: ${adj.currentGap} → ${adj.expectedGap}`)
        }
    }

    return {result, modified, issues}
}


export default defineRule({
    name: 'whitespace',
    group: 'generic',
    category: 'whitespace',
    defaultExclude: ['**/*.test.js'],
    check (content) {
        return processContent(content).issues
    },
    fix (content) {
        const {result, modified, issues} = processContent(content)
        return {result, fixed: modified, fixCount: issues.length}
    }
})
