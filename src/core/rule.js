export const RULE_GROUPS = ['generic', 'opinion', 'framework']


export function defineRule (rule) {
    if (!rule.name) {
        throw new Error('A rule needs a name')
    }
    if (!RULE_GROUPS.includes(rule.group)) {
        throw new Error(`Rule '${rule.name}' needs a group (one of: ${RULE_GROUPS.join(', ')})`)
    }
    if (typeof rule.check !== 'function' && typeof rule.audit !== 'function') {
        throw new Error(`Rule '${rule.name}' needs a check() (per-file) or audit() (project) function`)
    }

    return {
        category: rule.name,
        fixable: typeof rule.fix === 'function',
        hint: null,
        ...rule
    }
}
