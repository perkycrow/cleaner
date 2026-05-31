import path from 'path'
import {parseModule, walk} from '../core/ast.js'
import {createMatcher} from '../core/scanner.js'


export function collectImportSources (content) {
    const ast = parseModule(content)
    if (!ast) {
        return []
    }

    const sources = []

    walk(ast, node => {
        const hasSource = node.type === 'ImportDeclaration' ||
            node.type === 'ExportNamedDeclaration' ||
            node.type === 'ExportAllDeclaration'

        if (hasSource && node.source) {
            sources.push(node.source.value)
        }
        if (node.type === 'ImportExpression' && node.source?.type === 'Literal') {
            sources.push(node.source.value)
        }
    })

    return sources.filter(source => typeof source === 'string' && source.startsWith('.'))
}


function resolveImport (importerRelative, spec, fileSet) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(importerRelative), spec))
    const candidates = [base, `${base}.js`, path.posix.join(base, 'index.js')]
    return candidates.find(candidate => fileSet.has(candidate)) || null
}


export function findUnusedFiles (files, readFile, options = {}) {
    const fileSet = new Set(files)
    const referenced = new Set()

    for (const file of files) {
        for (const spec of collectImportSources(readFile(file))) {
            const target = resolveImport(file, spec, fileSet)
            if (target) {
                referenced.add(target)
            }
        }
    }

    const isExcluded = createMatcher(options.exclude || [])

    return files.filter(file => !referenced.has(file) && !isExcluded(file))
}
