import {describe, test, expect} from 'vitest'
import deepNesting, {findDeepNesting} from './deep_nesting.js'
import itStyle, {findTestStyleIssues} from './it_usage.js'
import singleDescribe, {findSingleTestDescribes} from './single_describes.js'


describe('deep-nesting', () => {

    test('flags test lines indented past the threshold', () => {
        const content = ['describe(\'a\', () => {', '    describe(\'b\', () => {', '            test(\'deep\', () => {})'].join('\n')
        expect(findDeepNesting(content, 12).length).toBeGreaterThan(0)
    })

    test('accepts shallow tests', () => {
        expect(findDeepNesting('test(\'shallow\', () => {})', 12)).toHaveLength(0)
    })

    test('opinion group, targets test files', () => {
        expect(deepNesting.group).toBe('opinion')
        expect(deepNesting.defaultInclude).toEqual(['**/*.test.js'])
    })

})


describe('test-style (it / should)', () => {

    test('flags it() usage', () => {
        expect(findTestStyleIssues("it('does x', () => {})").some(i => i.kind === 'it')).toBe(true)
    })

    test('flags test("should ...")', () => {
        expect(findTestStyleIssues("test('should do x', () => {})").some(i => i.kind === 'should')).toBe(true)
    })

    test('accepts method-named test()', () => {
        expect(findTestStyleIssues("test('getValue returns null', () => {})")).toHaveLength(0)
    })

    test('opinion group, targets test files', () => {
        expect(itStyle.group).toBe('opinion')
        expect(itStyle.defaultInclude).toEqual(['**/*.test.js'])
    })

})


describe('single-describe', () => {

    test('flags a describe wrapping a single test (with >1 total tests)', () => {
        const content = [
            "describe('lonely', () => {",
            "    test('only one', () => {})",
            '})',
            "test('top level', () => {})"
        ].join('\n')
        expect(findSingleTestDescribes(content).length).toBeGreaterThan(0)
    })

    test('ignores files with a single total test', () => {
        expect(findSingleTestDescribes("describe('x', () => { test('one', () => {}) })")).toHaveLength(0)
    })

    test('accepts a describe with multiple tests', () => {
        const content = [
            "describe('group', () => {",
            "    test('a', () => {})",
            "    test('b', () => {})",
            '})'
        ].join('\n')
        expect(findSingleTestDescribes(content)).toHaveLength(0)
    })

    test('opinion group', () => {
        expect(singleDescribe.group).toBe('opinion')
    })

})
