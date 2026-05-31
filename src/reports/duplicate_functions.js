import * as acorn from 'acorn'


function parseContent (content) {
    try {
        return acorn.parse(content, {ecmaVersion: 'latest', sourceType: 'module', locations: true})
    } catch {
        return null
    }
}


function walk (node, visit) {
    if (!node || typeof node !== 'object') {
        return
    }

    visit(node)

    for (const key of Object.keys(node)) {
        const child = node[key]
        if (Array.isArray(child)) {
            for (const item of child) {
                walk(item, visit)
            }
        } else if (child && typeof child === 'object' && child.type) {
            walk(child, visit)
        }
    }
}


function normalizeBody (content, node) {
    return content.slice(node.body.start, node.body.end).replace(/\s+/g, ' ').trim()
}


export function collectFunctionDeclarations (content) {
    const ast = parseContent(content)
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


export function findDuplicateFunctions (files, readFile) {
    const byName = new Map()

    for (const file of files) {
        for (const fn of collectFunctionDeclarations(readFile(file))) {
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
