import {describe, test, expect} from 'vitest'
import {collectImportSources, findUnusedFiles} from './unused_files.js'


describe('collectImportSources', () => {

    test('collects relative import/export/dynamic sources', () => {
        const content = [
            "import a from './a.js'",
            "export {b} from './b.js'",
            "const c = await import('./c.js')",
            "import x from 'acorn'"
        ].join('\n')
        const sources = collectImportSources(content)
        expect(sources).toContain('./a.js')
        expect(sources).toContain('./b.js')
        expect(sources).toContain('./c.js')
        expect(sources).not.toContain('acorn')
    })

})


describe('findUnusedFiles', () => {

    const files = {
        'index.js': "import './used.js'\nimport './dir'",
        'used.js': 'export const x = 1',
        'dir/index.js': 'export const y = 2',
        'orphan.js': 'export const z = 3'
    }
    const readFile = file => files[file]

    test('flags files never imported', () => {
        const unused = findUnusedFiles(Object.keys(files), readFile)
        expect(unused).toContain('orphan.js')
        expect(unused).not.toContain('used.js')
    })

    test('resolves directory imports to index.js', () => {
        const unused = findUnusedFiles(Object.keys(files), readFile)
        expect(unused).not.toContain('dir/index.js')
    })

    test('exclude globs drop entry points', () => {
        const unused = findUnusedFiles(Object.keys(files), readFile, {exclude: ['index.js']})
        expect(unused).not.toContain('index.js')
    })

})
