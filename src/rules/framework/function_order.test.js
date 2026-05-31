import {describe, test, expect} from 'vitest'
import rule, {findFunctionsBeforeClass} from './function_order.js'


describe('findFunctionsBeforeClass', () => {

    test('flags a function declared before the export default class', () => {
        const content = 'function helper () {}\nexport default class A {}'
        const issues = findFunctionsBeforeClass(content)
        expect(issues).toHaveLength(1)
        expect(issues[0]).toContain('helper()')
    })

    test('accepts functions declared after the class', () => {
        const content = 'export default class A {}\nfunction helper () {}'
        expect(findFunctionsBeforeClass(content)).toHaveLength(0)
    })

    test('no default-export class = nothing to enforce', () => {
        expect(findFunctionsBeforeClass('function a () {}\nfunction b () {}')).toHaveLength(0)
    })

    test('returns nothing on parse error', () => {
        expect(findFunctionsBeforeClass('not js {')).toEqual([])
    })

})


describe('function-order rule', () => {

    test('framework group, off by default (generic preset)', () => {
        expect(rule.group).toBe('framework')
        expect(rule.fixable).toBe(false)
    })

})
