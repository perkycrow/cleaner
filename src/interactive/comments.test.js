import {describe, test, expect} from 'vitest'
import {
    collectCommentBlocks,
    collectEslintItems,
    collectTriageItems,
    applyTriageEdits,
    runInteractive
} from './comments.js'


describe('collectCommentBlocks', () => {

    test('groups consecutive standalone // lines into one block', () => {
        const content = '// line one\n// line two\nconst x = 1\n// far'
        const blocks = collectCommentBlocks(content)
        expect(blocks).toHaveLength(2)
        expect(blocks[0].lines).toHaveLength(2)
    })

    test('an inline comment is its own block', () => {
        const blocks = collectCommentBlocks('// a\n// b\nconst x = 1 // inline')
        expect(blocks).toHaveLength(2)
        expect(blocks[1].lines).toHaveLength(1)
    })

    test('skips eslint directives and kept (//!) comments', () => {
        const content = 'const x = 1 // strip me\n// eslint-disable-line foo\n//! kept'
        const blocks = collectCommentBlocks(content)
        expect(blocks).toHaveLength(1)
        expect(blocks[0].lines[0].after).toBe(' strip me')
    })

})


describe('collectEslintItems', () => {

    test('collects unclean disable directives (line, next-line, whole-file)', () => {
        const content = [
            'const a = 1 // eslint-disable-line no-unused-vars',
            '// eslint-disable-next-line foo',
            '/* eslint-disable */'
        ].join('\n')
        const items = collectEslintItems(content)
        expect(items).toHaveLength(3)
        expect(items.every(item => item.kind === 'eslint')).toBe(true)
    })

    test('ignores directives already marked -- clean', () => {
        expect(collectEslintItems('x // eslint-disable-line foo -- clean')).toHaveLength(0)
    })

})


describe('applyTriageEdits', () => {

    test('comment keep adds //!, discard removes/trims', () => {
        const content = '// a\nconst x = 1 // inline'
        const items = collectCommentBlocks(content)
        const kept = applyTriageEdits(content, [{item: items[0], action: 'keep'}])
        expect(kept).toContain('//! a')
        const discarded = applyTriageEdits(content, [{item: items[1], action: 'discard'}])
        expect(discarded).toContain('const x = 1')
        expect(discarded).not.toContain('inline')
    })

    test('eslint keep appends -- clean (// form)', () => {
        const content = 'const x = 1 // eslint-disable-line no-unused-vars'
        const item = collectEslintItems(content)[0]
        const result = applyTriageEdits(content, [{item, action: 'keep'}])
        expect(result).toBe('const x = 1 // eslint-disable-line no-unused-vars -- clean')
    })

    test('eslint keep inserts -- clean before */ (block form)', () => {
        const content = '/* eslint-disable */'
        const item = collectEslintItems(content)[0]
        const result = applyTriageEdits(content, [{item, action: 'keep'}])
        expect(result).toBe('/* eslint-disable -- clean */')
    })

    test('eslint discard removes a standalone directive line', () => {
        const content = '// eslint-disable-next-line foo\nconst x = 1'
        const item = collectEslintItems(content)[0]
        const result = applyTriageEdits(content, [{item, action: 'discard'}])
        expect(result).toBe('const x = 1')
    })

})


describe('collectTriageItems', () => {

    test('merges comments and eslint items in line order', () => {
        const content = '// top\nconst x = 1 // eslint-disable-line foo'
        const items = collectTriageItems(content)
        expect(items.map(i => i.kind)).toEqual(['comment', 'eslint'])
    })

})


describe('runInteractive', () => {

    test('triages comments and eslint, writes results, quit stops', async () => {
        const files = {
            'a.js': '// drop me\nconst x = 1 // eslint-disable-line foo',
            'b.js': '// untouched'
        }
        const written = {}
        const answers = ['discard', 'keep', 'quit']
        let call = 0

        const stats = await runInteractive(['a.js', 'b.js'], {
            readFile: file => files[file],
            writeFile: (file, content) => {
                written[file] = content
            },
            prompt: async (question, choices) => {
                const want = answers[call++]
                return choices.find(c => c.action === want)
            },
            print: () => {}
        })

        expect(stats.discarded).toBe(1)
        expect(stats.kept).toBe(1)
        expect(stats.quit).toBe(true)
        expect(written['a.js']).not.toContain('// drop me')
        expect(written['a.js']).toContain('eslint-disable-line foo -- clean')
        expect(written['b.js']).toBeUndefined()
    })

})
