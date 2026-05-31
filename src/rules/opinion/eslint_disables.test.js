import {describe, test, expect} from 'vitest'
import rule, {findUncleanDisables, isCleanDirective} from './eslint_disables.js'


describe('findUncleanDisables', () => {

    test('flags an unjustified disable', () => {
        const issues = findUncleanDisables('const x = 1 // eslint-disable-line no-unused-vars')
        expect(issues).toHaveLength(1)
        expect(issues[0].rule).toBe('no-unused-vars')
    })

    test('ignores a directive marked -- clean', () => {
        expect(findUncleanDisables('const x = 1 // eslint-disable-line no-unused-vars -- clean')).toHaveLength(0)
    })

    test('captures up to the slash for namespaced rules (matches legacy behavior)', () => {
        const issues = findUncleanDisables('foo () { // eslint-disable-line perky/class-methods-use-this')
        expect(issues[0].rule).toBe('perky')
    })

    test('records each rule in a comma list', () => {
        const issues = findUncleanDisables('x // eslint-disable-line complexity, max-params')
        expect(issues.map(i => i.rule)).toEqual(['complexity', 'max-params'])
    })

    test('ignores eslint-disable text inside a string', () => {
        expect(findUncleanDisables("const s = 'eslint-disable-line no-unused-vars'")).toHaveLength(0)
    })

    test('isCleanDirective detects the marker', () => {
        expect(isCleanDirective('// eslint-disable-line x -- clean')).toBe(true)
        expect(isCleanDirective('// eslint-disable-line x')).toBe(false)
    })

})


describe('eslint-disable-justified rule', () => {

    test('opinion group, not fixable', () => {
        expect(rule.group).toBe('opinion')
        expect(rule.fixable).toBe(false)
    })

})
