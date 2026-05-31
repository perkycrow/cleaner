import {describe, expect, test} from 'vitest'
import whitespaceRule, {
    fixTrailingWhitespace,
    fixEofNewline,
    analyzeLineBreaks,
    fixLineBreaks,
    processContent
} from './whitespace.js'


describe('fixTrailingWhitespace', () => {

    test('removes trailing spaces', () => {
        const content = 'const x = 1   \nconst y = 2  '
        const {result, modified} = fixTrailingWhitespace(content)

        expect(result).toBe('const x = 1\nconst y = 2')
        expect(modified).toBe(true)
    })


    test('does not modify content without trailing whitespace', () => {
        const content = 'const x = 1\nconst y = 2'
        const {result, modified} = fixTrailingWhitespace(content)

        expect(result).toBe(content)
        expect(modified).toBe(false)
    })

})


describe('fixEofNewline', () => {

    test('adds missing EOF newline', () => {
        const {result, modified} = fixEofNewline('const x = 1')
        expect(result).toBe('const x = 1\n')
        expect(modified).toBe(true)
    })


    test('removes extra EOF newlines', () => {
        const {result} = fixEofNewline('const x = 1\n\n\n')
        expect(result).toBe('const x = 1\n')
    })

})


describe('analyzeLineBreaks', () => {

    test('detects wrong gap after imports', () => {
        const content = `import foo from './foo.js'

function bar () {}
`
        const adjustments = analyzeLineBreaks(content)
        expect(adjustments).toHaveLength(1)
        expect(adjustments[0].context).toBe('after imports')
    })


    test('detects wrong gap between functions', () => {
        const content = `function foo () {}

function bar () {}
`
        const adjustments = analyzeLineBreaks(content)
        expect(adjustments[0].context).toBe('between function and function')
    })


    test('handles parse errors gracefully', () => {
        expect(analyzeLineBreaks('this is not valid javascript {')).toEqual([])
    })

})


describe('fixLineBreaks', () => {

    test('adds missing blank lines', () => {
        const adjustments = [{afterLine: 1, beforeLine: 2, currentGap: 0, expectedGap: 2, context: 'test'}]
        const {result, modified} = fixLineBreaks('line1\nline3', adjustments)
        expect(result).toBe('line1\n\n\nline3')
        expect(modified).toBe(true)
    })


    test('returns unchanged content when no adjustments', () => {
        const {result, modified} = fixLineBreaks('line1\nline2', [])
        expect(result).toBe('line1\nline2')
        expect(modified).toBe(false)
    })

})


describe('processContent', () => {

    test('combines all fixes', () => {
        const {result, modified, issues} = processContent('const x = 1  ')
        expect(result).toBe('const x = 1\n')
        expect(modified).toBe(true)
        expect(issues).toContain('trailing whitespace')
        expect(issues).toContain('EOF newline')
    })


    test('returns unmodified for clean content', () => {
        const {modified, issues} = processContent('const x = 1\n')
        expect(modified).toBe(false)
        expect(issues).toHaveLength(0)
    })

})


describe('whitespace rule', () => {

    test('declares generic group and is fixable', () => {
        expect(whitespaceRule.group).toBe('generic')
        expect(whitespaceRule.fixable).toBe(true)
    })


    test('check returns issue messages', () => {
        expect(whitespaceRule.check('const x = 1  ')).toContain('trailing whitespace')
    })


    test('fix returns a repaired result', () => {
        const {result, fixed, fixCount} = whitespaceRule.fix('const x = 1  ')
        expect(result).toBe('const x = 1\n')
        expect(fixed).toBe(true)
        expect(fixCount).toBeGreaterThan(0)
    })

})
