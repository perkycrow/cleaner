#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import {parseArgs} from '@perkycrow/cli_tools/parse_args'
import {createCleanerRegistry, loadConfig, runAudit, runFix, report, reportFix} from '../src/index.js'
import {findFiles} from '../src/core/scanner.js'
import {reportDuplicates, reportUnused} from '../src/reports/index.js'


const cli = parseArgs(process.argv.slice(2), {
    usage: 'cleaner [options] [path]',
    description: 'Configurable code-quality auditor.',
    positionals: ['target'],
    flags: {
        audit: {type: 'bool', help: 'Audit only (default)'},
        fix: {type: 'bool', help: 'Apply fixes for fixable rules'},
        dryRun: {type: 'bool', help: 'Preview fixes without writing'},
        duplicates: {type: 'bool', help: 'Report functions declared more than once'},
        unused: {type: 'bool', help: 'Report files never imported anywhere'},
        compact: {type: 'bool', help: 'One-line summary per rule (no per-issue detail)'},
        config: {type: 'string', alias: '-c', help: 'Path to a cleaner config file'},
        json: {type: 'bool', help: 'Output results as JSON'}
    }
})


const rootDir = process.cwd()
const registry = createCleanerRegistry()
const configPath = cli.config ? path.resolve(rootDir, cli.config) : undefined
const config = await loadConfig(rootDir, registry, {configPath})
const targetPath = cli.target ? path.resolve(rootDir, cli.target) : null

if (cli.duplicates) {
    const files = findFiles(rootDir, {ignore: config.ignore, targetPath})
    const readFile = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf-8')
    if (cli.json) {
        const {findDuplicateFunctions} = await import('../src/reports/index.js')
        console.log(JSON.stringify(findDuplicateFunctions(files, readFile), null, 2))
    } else {
        reportDuplicates(files, readFile)
    }
    process.exit(0)
}

if (cli.unused) {
    const files = findFiles(rootDir, {ignore: config.ignore, targetPath})
    const readFile = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf-8')
    if (cli.json) {
        const {findUnusedFiles} = await import('../src/reports/index.js')
        console.log(JSON.stringify(findUnusedFiles(files, readFile, {exclude: ['**/*.test.js', '**/*.doc.js', '**/*.guide.js']}), null, 2))
    } else {
        reportUnused(files, readFile)
    }
    process.exit(0)
}

if (cli.fix) {
    const fixResult = await runFix(rootDir, registry, config, {targetPath, dryRun: cli.dryRun})
    if (cli.json) {
        console.log(JSON.stringify(fixResult, null, 2))
    } else {
        reportFix(fixResult)
    }
}

if (cli.audit || !cli.fix) {
    const result = await runAudit(rootDir, registry, config, {targetPath})
    if (cli.json) {
        console.log(JSON.stringify(result, null, 2))
    } else {
        report(result, {compact: cli.compact})
    }
    process.exit(result.totals.issues > 0 ? 1 : 0)
}
