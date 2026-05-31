import {describe, test, expect} from 'vitest'
import rule, {findMultipleClasses} from './multiple_classes.js'


describe('findMultipleClasses', () => {

    test('flags files with more than one class', () => {
        const content = 'class A {}\nclass B {}'
        const messages = findMultipleClasses(content)
        expect(messages).toHaveLength(1)
        expect(messages[0]).toContain('2 classes found: A, B')
    })

    test('accepts a single class', () => {
        expect(findMultipleClasses('class A {}')).toHaveLength(0)
    })

    test('counts an exported class plus a local one', () => {
        const content = 'export default class A {}\nclass B {}'
        expect(findMultipleClasses(content)).toHaveLength(1)
    })

    test('returns nothing on parse error', () => {
        expect(findMultipleClasses('not js {')).toEqual([])
    })

})


describe('multiple-classes rule', () => {

    test('generic, excludes test and doc files by default', () => {
        expect(rule.group).toBe('generic')
        expect(rule.defaultExclude).toContain('**/*.test.js')
        expect(rule.defaultExclude).toContain('**/*.doc.js')
    })

})
