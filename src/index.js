import {createRegistry} from './core/registry.js'
import {ALL_RULES} from './rules/index.js'


export function createCleanerRegistry () {
    return createRegistry(ALL_RULES)
}


export {loadConfig, resolveConfig} from './core/config.js'
export {PRESETS} from './core/presets.js'
export {runAudit} from './core/runner.js'
export {report} from './core/reporter.js'
export {defineRule} from './core/rule.js'
export {ALL_RULES} from './rules/index.js'
