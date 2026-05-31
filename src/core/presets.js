function enableGroups (registry, groups) {
    const config = {}
    for (const rule of registry.all()) {
        if (groups.includes(rule.group)) {
            config[rule.name] = true
        }
    }
    return config
}


export const PRESETS = {
    generic (registry) {
        return enableGroups(registry, ['generic'])
    },

    perky (registry) {
        return enableGroups(registry, ['generic', 'opinion', 'framework'])
    }
}


export function resolvePreset (name, registry) {
    const preset = PRESETS[name]
    if (!preset) {
        throw new Error(`Unknown preset: '${name}' (available: ${Object.keys(PRESETS).join(', ')})`)
    }
    return preset(registry)
}
