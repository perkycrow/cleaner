import fs from 'fs'
import path from 'path'
import {pathToFileURL} from 'url'
import {resolvePreset} from './presets.js'


const RESERVED_KEYS = new Set(['include', 'exclude', 'enabled'])
const DEFAULT_PRESET = 'generic'


export async function loadConfig (rootDir, registry, options = {}) {
    const configPath = options.configPath || path.join(rootDir, 'cleaner.config.js')
    let userConfig = {}

    if (fs.existsSync(configPath)) {
        const module = await import(pathToFileURL(configPath).href)
        userConfig = module.default || {}
    }

    return resolveConfig(userConfig, registry)
}


export function resolveConfig (userConfig, registry) {
    const presetName = userConfig.preset || DEFAULT_PRESET
    const base = resolvePreset(presetName, registry)
    const overrides = userConfig.rules || {}
    const merged = {...base, ...overrides}

    const rules = {}
    for (const rule of registry.all()) {
        rules[rule.name] = resolveRule(rule, merged[rule.name])
    }

    return {
        preset: presetName,
        ignore: userConfig.ignore || [],
        rules
    }
}


function resolveRule (rule, setting) {
    if (!setting || setting === 'off') {
        return {name: rule.name, enabled: false, include: [], exclude: [], options: {}}
    }

    const config = (setting === true || setting === 'on') ? {} : setting

    return {
        name: rule.name,
        enabled: true,
        include: config.include || rule.defaultInclude || [],
        exclude: config.exclude || rule.defaultExclude || [],
        options: extractOptions(config)
    }
}


function extractOptions (config) {
    if (config.options) {
        return config.options
    }

    const options = {}
    for (const [key, value] of Object.entries(config)) {
        if (!RESERVED_KEYS.has(key)) {
            options[key] = value
        }
    }
    return options
}
