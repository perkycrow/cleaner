import {describe, test, expect} from 'vitest'
import {collectCommentBlocks, applyBlockEdits, runInteractiveComments} from './comments.js'


describe('collectCommentBlocks', () => {

    test('groups consecutive // lines into one block', () => {
        const content = '// line one\n// line two\nconst x = 1\n// far'
        const blocks = collectCommentBlocks(content)
        expect(blocks).toHaveLength(2)
        expect(blocks[0].lines).toHaveLength(2)
        expect(blocks[0].startLine).toBe(1)
        expect(blocks[0].endLine).toBe(2)
        expect(blocks[1].lines).toHaveLength(1)
    })

    test('skips eslint directives and kept (//!) comments', () => {
        const content = 'const x = 1 // strip me\n// eslint-disable-line foo\n//! kept'
        const blocks = collectCommentBlocks(content)
        expect(blocks).toHaveLength(1)
        expect(blocks[0].lines[0].after).toBe(' strip me')
    })

    test('an inline comment is its own block, not merged with standalone lines above', () => {
        const content = '// a\n// b\nconst x = 1 // inline'
        const blocks = collectCommentBlocks(content)
        expect(blocks).toHaveLength(2)
        expect(blocks[0].lines).toHaveLength(2)
        expect(blocks[1].lines).toHaveLength(1)
    })

    test('ignores // inside strings', () => {
        expect(collectCommentBlocks("const u = 'http://x'")).toHaveLength(0)
    })

})


describe('applyBlockEdits', () => {

    const content = '// a\n// b\nconst x = 1 // inline\n'
    const blocks = collectCommentBlocks(content)

    test('keep adds //! to every line of the block', () => {
        const result = applyBlockEdits(content, [{block: blocks[0], action: 'keep'}])
        expect(result).toContain('//! a')
        expect(result).toContain('//! b')
    })

    test('discard removes standalone comment lines and trims inline ones', () => {
        const result = applyBlockEdits(content, [
            {block: blocks[0], action: 'discard'},
            {block: blocks[1], action: 'discard'}
        ])
        expect(result).not.toContain('// a')
        expect(result).not.toContain('// b')
        expect(result).toContain('const x = 1')
        expect(result).not.toContain('inline')
    })

    test('skip leaves the block untouched', () => {
        expect(applyBlockEdits(content, [{block: blocks[0], action: 'skip'}])).toBe(content)
    })

})


describe('runInteractiveComments', () => {

    test('drives prompts and writes the edited file', async () => {
        const files = {'a.js': '// keep me\n// and me\nconst x = 1 // drop'}
        const written = {}
        const answers = ['keep', 'discard']
        let call = 0

        const stats = await runInteractiveComments(['a.js'], {
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

        expect(stats.blocks).toBe(2)
        expect(stats.kept).toBe(1)
        expect(stats.discarded).toBe(1)
        expect(written['a.js']).toContain('//! keep me')
        expect(written['a.js']).toContain('//! and me')
        expect(written['a.js']).toContain('const x = 1')
        expect(written['a.js']).not.toContain('drop')
    })

})
