import {describe, test, expect, beforeAll, afterAll} from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {createMatcher, isInScope, findFiles} from './scanner.js'


describe('createMatcher', () => {

    test('empty patterns never match', () => {
        expect(createMatcher([])('anything.js')).toBe(false)
    })

    test('** matches across directories', () => {
        const match = createMatcher(['core/**'])
        expect(match('core/a/b.js')).toBe(true)
        expect(match('render/a.js')).toBe(false)
    })

    test('extension globs match anywhere', () => {
        const match = createMatcher(['**/*.styles.js'])
        expect(match('ui/x.styles.js')).toBe(true)
        expect(match('ui/x.js')).toBe(false)
    })

})


describe('isInScope', () => {

    test('no include/exclude = in scope', () => {
        expect(isInScope('a/b.js', {})).toBe(true)
    })

    test('exclude wins over include', () => {
        expect(isInScope('core/x.test.js', {include: ['core/**'], exclude: ['**/*.test.js']})).toBe(false)
    })

    test('include restricts scope', () => {
        expect(isInScope('render/x.js', {include: ['core/**']})).toBe(false)
        expect(isInScope('core/x.js', {include: ['core/**']})).toBe(true)
    })

})


describe('findFiles', () => {

    let root

    beforeAll(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaner-scan-'))
        fs.mkdirSync(path.join(root, 'core'), {recursive: true})
        fs.mkdirSync(path.join(root, 'node_modules', 'pkg'), {recursive: true})
        fs.mkdirSync(path.join(root, 'dist'), {recursive: true})
        fs.writeFileSync(path.join(root, 'core', 'a.js'), '')
        fs.writeFileSync(path.join(root, 'core', 'a.test.js'), '')
        fs.writeFileSync(path.join(root, 'b.js'), '')
        fs.writeFileSync(path.join(root, 'readme.md'), '')
        fs.writeFileSync(path.join(root, 'node_modules', 'pkg', 'index.js'), '')
        fs.writeFileSync(path.join(root, 'dist', 'bundle.js'), '')
    })

    afterAll(() => {
        fs.rmSync(root, {recursive: true, force: true})
    })

    test('finds .js files, skips node_modules and non-js', () => {
        const files = findFiles(root)
        expect(files).toContain('core/a.js')
        expect(files).toContain('core/a.test.js')
        expect(files).toContain('b.js')
        expect(files).toContain('dist/bundle.js')
        expect(files).not.toContain('readme.md')
        expect(files.some(f => f.includes('node_modules'))).toBe(false)
    })

    test('honors ignore globs', () => {
        const files = findFiles(root, {ignore: ['dist/**', '**/*.test.js']})
        expect(files).toContain('core/a.js')
        expect(files).not.toContain('dist/bundle.js')
        expect(files).not.toContain('core/a.test.js')
    })

    test('targetPath can scope to a single file', () => {
        const files = findFiles(root, {targetPath: path.join(root, 'b.js')})
        expect(files).toEqual(['b.js'])
    })

})
