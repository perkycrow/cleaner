import {parseModule, walk} from '../core/ast.js'


export const DEFAULT_IGNORE_PREFIXES = [
    'init', 'main', 'reset', 'animate', 'update', 'mount', 'setup', 'load', 'parse', 'get', 'add'
]


function matchesIgnoredPrefix (name, prefixes) {
    return prefixes.some(prefix => {
        if (!name.startsWith(prefix)) {
            return false
        }
        const rest = name.slice(prefix.length)
        return rest === '' || /^[A-Z0-9]/.test(rest)
    })
}


function normalizeBody (content, node) {
    return content.slice(node.body.start, node.body.end).replace(/\s+/g, ' ').trim()
}


export function collectFunctionDeclarations (content) {
    const ast = parseModule(content)
    if (!ast) {
        return []
    }

    const functions = []

    walk(ast, node => {
        if (node.type !== 'FunctionDeclaration' || !node.id) {
            return
        }
        functions.push({
            name: node.id.name,
            line: node.loc.start.line,
            params: node.params.length,
            lines: node.loc.end.line - node.loc.start.line + 1,
            body: normalizeBody(content, node)
        })
    })

    return functions
}


export function findDuplicateFunctions (files, readFile, options = {}) {
    const ignorePrefixes = options.ignorePrefixes || DEFAULT_IGNORE_PREFIXES
    const byName = new Map()

    for (const file of files) {
        for (const fn of collectFunctionDeclarations(readFile(file))) {
            if (matchesIgnoredPrefix(fn.name, ignorePrefixes)) {
                continue
            }
            if (!byName.has(fn.name)) {
                byName.set(fn.name, [])
            }
            byName.get(fn.name).push({...fn, file})
        }
    }

    const duplicates = []

    for (const [name, occurrences] of byName) {
        if (occurrences.length < 2) {
            continue
        }
        const bodies = new Set(occurrences.map(occ => occ.body))
        duplicates.push({
            name,
            count: occurrences.length,
            identicalBody: bodies.size === 1,
            occurrences: occurrences.map(({file, line, params, lines}) => ({file, line, params, lines}))
        })
    }

    return duplicates.sort((a, b) => b.count - a.count)
}
