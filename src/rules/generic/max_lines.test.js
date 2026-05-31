import {describe, test, expect} from 'vitest'
import rule, {countLines} from './max_lines.js'


describe('max-lines rule', () => {

    test('countLines counts newline-separated lines', () => {
        expect(countLines('a\nb\nc')).toBe(3)
    })

    test('flags files over the default threshold', () => {
        const content = Array(301).fill('x').join('\n')
        expect(rule.check(content, {options: {}})).toHaveLength(1)
    })

    test('respects a custom max option', () => {
        const content = Array(11).fill('x').join('\n')
        expect(rule.check(content, {options: {max: 10}})[0]).toContain('11 lines (max 10)')
    })

    test('accepts files within the threshold', () => {
        expect(rule.check('a\nb\nc', {options: {}})).toEqual([])
    })

    test('generic group, not fixable, excludes test/doc/guide', () => {
        expect(rule.group).toBe('generic')
        expect(rule.fixable).toBe(false)
        expect(rule.defaultExclude).toContain('**/*.test.js')
    })

})
