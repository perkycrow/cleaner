import fs from 'fs'
import path from 'path'
import picomatch from 'picomatch'


const ALWAYS_SKIP = new Set(['node_modules', '.git'])


export function createMatcher (patterns) {
    if (!patterns || patterns.length === 0) {
        return () => false
    }
    const isMatch = picomatch(patterns, {dot: true})
    return relativePath => isMatch(toPosix(relativePath))
}


export function isInScope (relativePath, {include = [], exclude = []} = {}) {
    if (exclude.length && createMatcher(exclude)(relativePath)) {
        return false
    }
    if (include.length && !createMatcher(include)(relativePath)) {
        return false
    }
    return true
}


export function findFiles (rootDir, options = {}) {
    const {ignore = [], targetPath = null, extensions = ['.js']} = options
    const ctx = {
        rootDir,
        extensions,
        isIgnored: createMatcher(ignore),
        found: []
    }

    walk(targetPath || rootDir, ctx)

    return ctx.found.sort()
}


function walk (current, ctx) {
    if (fs.statSync(current).isFile()) {
        collectFile(current, ctx)
        return
    }

    for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
        if (entry.isDirectory()) {
            if (ALWAYS_SKIP.has(entry.name) || entry.name.startsWith('.')) {
                continue
            }
            walk(path.join(current, entry.name), ctx)
        } else if (entry.isFile()) {
            collectFile(path.join(current, entry.name), ctx)
        }
    }
}


function collectFile (absolutePath, ctx) {
    if (!ctx.extensions.includes(path.extname(absolutePath))) {
        return
    }
    const relativePath = toPosix(path.relative(ctx.rootDir, absolutePath))
    if (ctx.isIgnored(relativePath)) {
        return
    }
    ctx.found.push(relativePath)
}


function toPosix (filePath) {
    return filePath.split(path.sep).join('/')
}
