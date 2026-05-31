import fs from 'fs'
import path from 'path'
import {defineRule} from '../../core/rule.js'


function matchImportLine (line) {
    const importMatch = line.match(/^(\s*import\s+.+\s+from\s+['"])(\.[^'"]+)(['"].*)$/)
    const exportMatch = line.match(/^(\s*export\s+.+\s+from\s+['"])(\.[^'"]+)(['"].*)$/)
    const dynamicMatch = line.match(/^(.+import\s*\(\s*['"])(\.[^'"]+)(['"]\s*\).*)$/)

    return importMatch || exportMatch || dynamicMatch
}


export function hasJsExtension (importPath) {
    return importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.css')
}


function resolveImportPath (fileDir, importPath) {
    const resolvedPath = path.resolve(fileDir, importPath)

    try {
        const stats = fs.statSync(resolvedPath)
        if (stats.isDirectory()) {
            const indexPath = path.join(resolvedPath, 'index.js')
            if (fs.existsSync(indexPath)) {
                return {correctedPath: importPath + '/index.js', isDirectory: true}
            }
            return {correctedPath: importPath + '.js', isDirectory: true}
        }
    } catch {
        // unresolved path: fall through to the plain .js suffix
    }

    return {correctedPath: importPath + '.js', isDirectory: false}
}


export function findImportIssues (content, fileDir) {
    const lines = content.split('\n')
    const issues = []

    lines.forEach((line, index) => {
        const match = matchImportLine(line)
        if (!match) {
            return
        }

        const importPath = match[2]
        if (hasJsExtension(importPath)) {
            return
        }

        const {correctedPath} = resolveImportPath(fileDir, importPath)

        issues.push({
            line: index + 1,
            importPath,
            correctedPath,
            prefix: match[1],
            suffix: match[3]
        })
    })

    return issues
}


export default defineRule({
    name: 'imports',
    group: 'generic',
    category: 'imports',
    hint: 'Add .js extension for ESM compatibility',
    defaultExclude: ['**/*.test.js'],
    check (content, ctx) {
        const fileDir = path.dirname(ctx.absolutePath)
        return findImportIssues(content, fileDir).map(issue =>
            `L${issue.line}: ${issue.importPath} → ${issue.correctedPath}`)
    },
    fix (content, ctx) {
        const fileDir = path.dirname(ctx.absolutePath)
        const issues = findImportIssues(content, fileDir)

        if (issues.length === 0) {
            return {result: content, fixed: false}
        }

        const lines = content.split('\n')
        for (const issue of [...issues].sort((a, b) => b.line - a.line)) {
            lines[issue.line - 1] = issue.prefix + issue.correctedPath + issue.suffix
        }

        return {result: lines.join('\n'), fixed: true, fixCount: issues.length}
    }
})
