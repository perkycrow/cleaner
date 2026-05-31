#!/usr/bin/env node

import path from 'path'
import {parseArgs} from '@perkycrow/cli_tools/parse_args'
import {createCleanerRegistry, loadConfig, runAudit, report} from '../src/index.js'


const cli = parseArgs(process.argv.slice(2), {
    usage: 'cleaner [options] [path]',
    description: 'Configurable code-quality auditor.',
    positionals: ['target'],
    flags: {
        audit: {type: 'bool', help: 'Audit only (default)'},
        json: {type: 'bool', help: 'Output results as JSON'}
    }
})


const rootDir = process.cwd()
const registry = createCleanerRegistry()
const config = await loadConfig(rootDir, registry)
const targetPath = cli.target ? path.resolve(rootDir, cli.target) : null

const result = await runAudit(rootDir, registry, config, {targetPath})

if (cli.json) {
    console.log(JSON.stringify(result, null, 2))
} else {
    report(result, {compact: true})
}

process.exit(result.totals.issues > 0 ? 1 : 0)
