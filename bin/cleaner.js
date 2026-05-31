#!/usr/bin/env node

import path from 'path'
import {parseArgs} from '@perkycrow/cli_tools/parse_args'
import {createCleanerRegistry, loadConfig, runAudit, runFix, report, reportFix} from '../src/index.js'


const cli = parseArgs(process.argv.slice(2), {
    usage: 'cleaner [options] [path]',
    description: 'Configurable code-quality auditor.',
    positionals: ['target'],
    flags: {
        audit: {type: 'bool', help: 'Audit only (default)'},
        fix: {type: 'bool', help: 'Apply fixes for fixable rules'},
        dryRun: {type: 'bool', help: 'Preview fixes without writing'},
        config: {type: 'string', alias: '-c', help: 'Path to a cleaner config file'},
        json: {type: 'bool', help: 'Output results as JSON'}
    }
})


const rootDir = process.cwd()
const registry = createCleanerRegistry()
const configPath = cli.config ? path.resolve(rootDir, cli.config) : undefined
const config = await loadConfig(rootDir, registry, {configPath})
const targetPath = cli.target ? path.resolve(rootDir, cli.target) : null

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
        report(result, {compact: true})
    }
    process.exit(result.totals.issues > 0 ? 1 : 0)
}
