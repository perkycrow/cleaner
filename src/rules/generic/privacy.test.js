import {describe, test, expect} from 'vitest'
import rule, {findUnderscoreMembers} from './privacy.js'


describe('findUnderscoreMembers', () => {

    test('flags _ class members', () => {
        const content = 'class A {\n  _secret () {}\n  ok () {}\n}'
        const issues = findUnderscoreMembers(content)
        expect(issues).toHaveLength(1)
        expect(issues[0].name).toBe('_secret')
        expect(issues[0].type).toBe('method')
    })

    test('flags _ this-assignments', () => {
        const content = 'class A {\n  constructor () { this._x = 1 }\n}'
        const issues = findUnderscoreMembers(content)
        expect(issues.some(i => i.name === 'this._x')).toBe(true)
    })

    test('ignores __ (dunder) and # (real private)', () => {
        const content = 'class A {\n  __proto () {}\n  #real () {}\n}'
        expect(findUnderscoreMembers(content)).toHaveLength(0)
    })

    test('returns nothing on parse error', () => {
        expect(findUnderscoreMembers('not js {')).toEqual([])
    })

})


describe('privacy rule', () => {

    test('generic, not fixable', () => {
        expect(rule.group).toBe('generic')
        expect(rule.fixable).toBe(false)
    })

    test('check returns formatted plain messages', () => {
        const messages = rule.check('class A {\n  _x () {}\n}')
        expect(messages[0]).toMatch(/^L2: method: _x$/)
    })

})
