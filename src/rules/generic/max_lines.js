import {defineRule} from '../../core/rule.js'


const DEFAULT_MAX = 300


export function countLines (content) {
    return content.split('\n').length
}


export default defineRule({
    name: 'max-lines',
    group: 'generic',
    category: 'file_length',
    hint: 'Split large files into smaller, focused modules',
    defaultExclude: ['**/*.test.js', '**/*.doc.js', '**/*.guide.js'],
    check (content, ctx) {
        const max = ctx.options.max || DEFAULT_MAX
        const lines = countLines(content)
        return lines > max ? [`${lines} lines (max ${max})`] : []
    }
})
