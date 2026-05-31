export function createRegistry (rules = []) {
    const map = new Map()

    for (const rule of rules) {
        if (map.has(rule.name)) {
            throw new Error(`Duplicate rule: ${rule.name}`)
        }
        map.set(rule.name, rule)
    }

    return {
        all () {
            return [...map.values()]
        },
        get (name) {
            return map.get(name)
        },
        has (name) {
            return map.has(name)
        },
        byGroup (group) {
            return [...map.values()].filter(rule => rule.group === group)
        }
    }
}
