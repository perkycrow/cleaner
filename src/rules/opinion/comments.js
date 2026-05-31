import {defineRule} from '../../core/rule.js'
import {isInsideString} from '../../core/text.js'


const PROTECTED_COMMENT_PATTERNS = [
    /eslint-disable/,
    /eslint-enable/,
    /eslint-ignore/,
    /eslint-env/,
    /global\s+\w+/,
    /globals\s+\w+/,
    /jshint/,
    /jslint/,
    /prettier-ignore/,
    /webpack/,
    /istanbul/,
    /c8/,
    /@ts-/,
    /@vite-ignore/,
    /@vitest-environment/,
    /^\s*=+\s+.+\s+=+\s*$/,
    /^\s*GENERATED/
]


function isProtectedComment (text) {
    return PROTECTED_COMMENT_PATTERNS.some(pattern => pattern.test(text))
}


export function isUrlComment (textBefore) {
    return /https?:$/.test(textBefore)
}


export function findComments (content) {
    const comments = []
    const lines = content.split('\n')
    let textFromStart = ''

    for (const line of lines) {
        const match = line.match(/^(.*?)\/\/(.*)$/)

        if (match) {
            const [, before, after] = match
            const currentLineBeforeComment = textFromStart + before

            if (!isUrlComment(before) && !isInsideString(currentLineBeforeComment) && !isProtectedComment(after)) {
                comments.push({type: 'single-line', text: '//' + after.trim()})
                textFromStart += before + '\n'
            } else {
                textFromStart += line + '\n'
            }
        } else {
            textFromStart += line + '\n'
        }
    }

    content.replace(/\/\*[\s\S]*?\*\//g, (match, offset) => {
        const beforeMatch = content.substring(0, offset)
        const lineStart = beforeMatch.lastIndexOf('\n') + 1
        const textBeforeOnLine = content.substring(lineStart, offset)

        if (!isProtectedComment(match) && !isInsideString(textBeforeOnLine)) {
            const preview = match.length > 100 ? match.substring(0, 100) + '...' : match
            comments.push({type: 'multi-line', text: preview})
        }
        return match
    })

    return comments
}


function removeSingleLineComments (content) {
    const comments = []
    const lines = content.split('\n')
    const resultLines = []
    let textFromStart = ''

    for (const line of lines) {
        const match = line.match(/^(.*?)\/\/(.*)$/)

        if (match) {
            const [, before, after] = match
            const currentLineBeforeComment = textFromStart + before

            if (isUrlComment(before) || isInsideString(currentLineBeforeComment) || isProtectedComment(after)) {
                resultLines.push(line)
                textFromStart += line + '\n'
            } else {
                comments.push({type: 'single-line'})
                resultLines.push(before.trimEnd())
                textFromStart += before + '\n'
            }
        } else {
            resultLines.push(line)
            textFromStart += line + '\n'
        }
    }

    return {result: resultLines.join('\n'), comments}
}


function removeMultiLineComments (content, originalContent) {
    const comments = []

    const result = content.replace(/\/\*[\s\S]*?\*\//g, (match, offset) => {
        const beforeMatch = originalContent.substring(0, offset)
        const lineStart = beforeMatch.lastIndexOf('\n') + 1
        const textBeforeOnLine = originalContent.substring(lineStart, offset)

        if (isProtectedComment(match) || isInsideString(textBeforeOnLine)) {
            return match
        }

        comments.push({type: 'multi-line'})
        return ''
    })

    return {result, comments}
}


function normalizeWhitespace (content) {
    return content.replace(/^[ \t]+$/gm, '').replace(/\n{4,}/g, '\n\n\n')
}


export function cleanFileContent (content) {
    const originalContent = content
    let comments = []

    const singleLine = removeSingleLineComments(content)
    let result = singleLine.result
    comments = comments.concat(singleLine.comments)

    const multiLine = removeMultiLineComments(result, originalContent)
    result = multiLine.result
    comments = comments.concat(multiLine.comments)

    result = normalizeWhitespace(result)

    return {result, comments, modified: comments.length > 0}
}


export default defineRule({
    name: 'comments',
    group: 'opinion',
    category: 'comments',
    hint: 'Keep eslint directives and essential comments',
    defaultExclude: ['**/*.test.js', '**/*.doc.js'],
    check (content) {
        return findComments(content).map(comment => `${comment.type}: ${comment.text}`)
    },
    fix (content) {
        const {result, comments, modified} = cleanFileContent(content)
        return {result, fixed: modified, fixCount: comments.length}
    }
})
