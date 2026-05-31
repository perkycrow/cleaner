import {describe, test, expect} from 'vitest'
import rule, {findComments, cleanFileContent, isUrlComment} from './comments.js'


describe('findComments', () => {

    test('flags a plain single-line comment', () => {
        expect(findComments('const x = 1 // nope')).toHaveLength(1)
    })

    test('keeps eslint directives', () => {
        expect(findComments('const x = 1 // eslint-disable-line foo')).toHaveLength(0)
    })

    test('ignores // inside a string', () => {
        expect(findComments("const url = 'http://x'")).toHaveLength(0)
    })

    test('flags a multi-line comment', () => {
        expect(findComments('/* a block */\nconst x = 1')).toHaveLength(1)
    })

    test('isUrlComment detects protocol before //', () => {
        expect(isUrlComment('const u = https:')).toBe(true)
    })

})


describe('cleanFileContent', () => {

    test('strips comments and reports count', () => {
        const {result, modified, comments} = cleanFileContent('const x = 1 // remove me\n')
        expect(modified).toBe(true)
        expect(comments.length).toBe(1)
        expect(result).not.toContain('remove me')
    })

})


describe('comments rule', () => {

    test('opinion group, fixable, excludes test/doc', () => {
        expect(rule.group).toBe('opinion')
        expect(rule.fixable).toBe(true)
        expect(rule.defaultExclude).toEqual(['**/*.test.js', '**/*.doc.js'])
    })

})
