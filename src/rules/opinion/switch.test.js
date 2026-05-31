import {describe, test, expect} from 'vitest'
import rule, {findSwitches} from './switch.js'


describe('findSwitches', () => {

    test('finds switch statements', () => {
        const content = 'function f (x) {\n  switch (x) { case 1: break }\n}'
        const found = findSwitches(content)
        expect(found).toHaveLength(1)
        expect(found[0].line).toBe(2)
    })

    test('ignores switch inside a template string', () => {
        const content = 'const t = `do a switch (x) here`'
        expect(findSwitches(content)).toHaveLength(0)
    })

    test('finds multiple switches', () => {
        const content = 'switch (a) {}\nswitch (b) {}'
        expect(findSwitches(content)).toHaveLength(2)
    })

})


describe('switch rule', () => {

    test('opinion group, not fixable', () => {
        expect(rule.group).toBe('opinion')
        expect(rule.fixable).toBe(false)
    })

})
