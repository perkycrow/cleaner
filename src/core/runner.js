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


async function fixFileWithRule (rule, file, {rootDir, ruleConfig, dryRun}) {
    const absolutePath = path.join(rootDir, file)
    const content = fs.readFileSync(absolutePath, 'utf-8')
    const outcome = await rule.fix(content, {relativePath: file, absolutePath, rootDir, options: ruleConfig.options})

    if (!outcome.fixed) {
        return 0
    }

    if (!dryRun) {
        fs.writeFileSync(absolutePath, outcome.result, 'utf-8')
    }

    return outcome.fixCount || 1
}


async function fixRule (rule, files, {rootDir, ruleConfig, dryRun}) {
    const scoped = files.filter(file => isInScope(file, ruleConfig))
    let filesFixed = 0
    let issuesFixed = 0

    for (const file of scoped) {
        const fixCount = await fixFileWithRule(rule, file, {rootDir, ruleConfig, dryRun})
        if (fixCount > 0) {
            filesFixed += 1
            issuesFixed += fixCount
        }
    }

    return {name: rule.name, filesFixed, issuesFixed}
}


export async function runFix (rootDir, registry, config, options = {}) {
    const files = findFiles(rootDir, {ignore: config.ignore, targetPath: options.targetPath})
    const dryRun = options.dryRun || false
    const results = []

    for (const rule of registry.all()) {
        const ruleConfig = config.rules[rule.name]
        if (!ruleConfig || !ruleConfig.enabled || typeof rule.fix !== 'function') {
            continue
        }

        results.push(await fixRule(rule, files, {rootDir, ruleConfig, dryRun}))
    }

    return {
        dryRun,
        results,
        totals: {
            filesFixed: results.reduce((sum, result) => sum + result.filesFixed, 0),
            issuesFixed: results.reduce((sum, result) => sum + result.issuesFixed, 0)
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
