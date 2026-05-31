import fs from 'fs'
import path from 'path'
import {findFiles, isInScope} from './scanner.js'


export async function runAudit (rootDir, registry, config, options = {}) {
    const files = findFiles(rootDir, {ignore: config.ignore, targetPath: options.targetPath})
    const readFile = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf-8')
    const results = []

    for (const rule of registry.all()) {
        const ruleConfig = config.rules[rule.name]
        if (!ruleConfig || !ruleConfig.enabled) {
            continue
        }

        const scoped = files.filter(file => isInScope(file, ruleConfig))
        const issues = await collectIssues(rule, scoped, {rootDir, readFile, options: ruleConfig.options})

        results.push({
            name: rule.name,
            category: rule.category,
            hint: resolveHint(rule),
            fixable: rule.fixable,
            filesScanned: scoped.length,
            issues,
            issueCount: issues.reduce((sum, entry) => sum + entry.messages.length, 0)
        })
    }

    return {
        results,
        totals: {
            rules: results.length,
            issues: results.reduce((sum, result) => sum + result.issueCount, 0)
        }
    }
}


async function collectIssues (rule, files, ctx) {
    if (typeof rule.audit === 'function') {
        return normalize(await rule.audit({...ctx, files}))
    }

    const issues = []
    for (const file of files) {
        const messages = await rule.check(ctx.readFile(file), {
            relativePath: file,
            absolutePath: path.join(ctx.rootDir, file),
            rootDir: ctx.rootDir,
            options: ctx.options
        })
        if (messages && messages.length) {
            issues.push({file, messages})
        }
    }
    return issues
}


function normalize (raw) {
    if (!raw) {
        return []
    }
    return raw
        .filter(entry => entry && entry.file)
        .map(entry => ({file: entry.file, messages: entry.messages || []}))
}


function resolveHint (rule) {
    return typeof rule.hint === 'function' ? rule.hint() : rule.hint
}
