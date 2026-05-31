import {defineRule} from '../../core/rule.js'
import {isInsideString} from '../../core/text.js'


const PATTERNS = [
    /eslint-disable-next-line\s+([\w-]+(?:,\s*[\w-]+)*)/,
    /eslint-disable-line\s+([\w-]+(?:,\s*[\w-]+)*)/,
    /eslint-disable\s+([\w-]+(?:,\s*[\w-]+)*)/
]


export function isCleanDirective (line) {
    return /--\s*clean\b/.test(line)
}


function isInComment (line, matchIndex) {
    const singleLineComment = line.indexOf('//')
    if (singleLineComment !== -1 && singleLineComment < matchIndex) {
        if (!isInsideString(line.substring(0, singleLineComment))) {
            return true
        }
    }
    const blockComment = line.indexOf('/*')
    if (blockComment !== -1 && blockComment < matchIndex) {
        if (!isInsideString(line.substring(0, blockComment))) {
            return true
        }
    }
    return false
}


const DIRECTIVE_DETECT = [
    /eslint-disable-next-line\b/,
    /eslint-disable-line\b/,
    /eslint-disable\b/
]


export function findUncleanDirectiveLines (content) {
    const lines = content.split('\n')
    const items = []

    lines.forEach((line, index) => {
        for (const pattern of DIRECTIVE_DETECT) {
            const match = line.match(pattern)
            if (match && isInComment(line, match.index) && !isCleanDirective(line)) {
                const slash = line.indexOf('//')
                const block = line.indexOf('/*')
                const useSlash = slash !== -1 && (block === -1 || slash < block)
                const opener = useSlash ? slash : block

                items.push({index, before: line.slice(0, opener), style: useSlash ? '//' : 'block', line})
                break
            }
        }
    })

    return items
}


export function findUncleanDisables (content) {
    const lines = content.split('\n')
    const unclean = []

    lines.forEach((line, index) => {
        for (const pattern of PATTERNS) {
            const match = line.match(pattern)
            if (match && isInComment(line, match.index) && !isCleanDirective(line)) {
                for (const rule of match[1].split(',').map(entry => entry.trim())) {
                    unclean.push({line: index + 1, rule})
                }
            }
        }
    })

    return unclean
}


export default defineRule({
    name: 'eslint-disable-justified',
    group: 'opinion',
    category: 'eslint',
    hint: 'Fix the issue, or add "-- clean" at the end of the eslint-disable comment if legit',
    check (content) {
        return findUncleanDisables(content).map(entry =>
            `L${entry.line}: ${entry.rule} (add "-- clean" if intentional)`)
    }
})
