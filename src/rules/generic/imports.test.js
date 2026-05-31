import {describe, test, expect} from 'vitest'
import rule, {hasJsExtension, findImportIssues} from './imports.js'


describe('hasJsExtension', () => {

    test('accepts .js/.json/.css', () => {
        expect(hasJsExtension('./a.js')).toBe(true)
        expect(hasJsExtension('./a.json')).toBe(true)
        expect(hasJsExtension('./a.css')).toBe(true)
        expect(hasJsExtension('./a')).toBe(false)
    })

})


describe('findImportIssues', () => {

    test('flags extensionless relative imports', () => {
        const content = "import {x} from './foo'\nimport {y} from './bar.js'"
        const issues = findImportIssues(content, '/nowhere')
        expect(issues).toHaveLength(1)
        expect(issues[0].importPath).toBe('./foo')
        expect(issues[0].correctedPath).toBe('./foo.js')
    })

    test('ignores bare/package imports', () => {
        expect(findImportIssues("import x from 'acorn'", '/nowhere')).toHaveLength(0)
    })

})


describe('imports rule', () => {

    test('generic + fixable', () => {
        expect(rule.group).toBe('generic')
        expect(rule.fixable).toBe(true)
    })

    test('fix adds the extension', () => {
        const {result, fixed} = rule.fix("import x from './foo'", {absolutePath: '/nowhere/file.js'})
        expect(fixed).toBe(true)
        expect(result).toBe("import x from './foo.js'")
    })

})
