import * as acorn from 'acorn'


export function parseModule (content) {
    try {
        return acorn.parse(content, {ecmaVersion: 'latest', sourceType: 'module', locations: true})
    } catch {
        return null
    }
}


export function walk (node, visit) {
    if (!node || typeof node !== 'object') {
        return
    }

    visit(node)

    for (const key of Object.keys(node)) {
        const child = node[key]
        if (Array.isArray(child)) {
            for (const item of child) {
                walk(item, visit)
            }
        } else if (child && typeof child === 'object' && child.type) {
            walk(child, visit)
        }
    }
}
