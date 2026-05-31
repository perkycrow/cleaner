import {describe, expect, test} from 'vitest'
import whitespaceRule, {
    fixTrailingWhitespace,
    fixEofNewline,
    processContent
} from './whitespace.js'
import {analyzeLineBreaks, fixLineBreaks} from './whitespace_linebreaks.js'


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


    test('counts only the blank run, not a comment block, as the gap', () => {
        const content = `function foo () {}


// doc for bar
function bar () {}
`

        expect(analyzeLineBreaks(content)).toHaveLength(0)
    })


    test('flags a too-small blank run even with a comment present', () => {
        const content = `function foo () {}
// doc for bar
function bar () {}
`
        const adjustments = analyzeLineBreaks(content)
        expect(adjustments).toHaveLength(1)
        expect(adjustments[0].currentGap).toBe(0)
        expect(adjustments[0].expectedGap).toBe(2)
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


    test('normalizes the blank run without deleting a comment between declarations', () => {
        const content = `function foo () {}
// doc for bar
function bar () {}
`
        const adjustments = analyzeLineBreaks(content)
        const {result} = fixLineBreaks(content, adjustments)

        expect(result).toContain('// doc for bar')
        expect(result).toBe(`function foo () {}


// doc for bar
function bar () {}
`)
    })


    test('preserves a multi-line doc block sitting between functions (the v0.1.0 regression)', () => {
        const content = `function foo () {}

// line one of the doc
// line two of the doc
function bar () {}
`
        const adjustments = analyzeLineBreaks(content)
        const {result} = fixLineBreaks(content, adjustments)

        expect(result).toContain('// line one of the doc')
        expect(result).toContain('// line two of the doc')
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
