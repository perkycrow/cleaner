import {describe, test, expect, beforeAll, afterAll} from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import rule from './missing_docs.js'


describe('missing-docs rule', () => {

    let root

    beforeAll(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaner-docs-'))
        fs.writeFileSync(path.join(root, 'documented.js'), '')
        fs.writeFileSync(path.join(root, 'documented.doc.js'), '')
        fs.writeFileSync(path.join(root, 'undocumented.js'), '')
    })

    afterAll(() => {
        fs.rmSync(root, {recursive: true, force: true})
    })

    test('flags files without a .doc.js sibling', () => {
        const issues = rule.audit({rootDir: root, files: ['documented.js', 'undocumented.js']})
        expect(issues).toHaveLength(1)
        expect(issues[0].file).toBe('undocumented.js')
        expect(issues[0].messages[0]).toBe('missing undocumented.doc.js')
    })

    test('framework group, off by default', () => {
        expect(rule.group).toBe('framework')
    })

    test('excludes test/doc/guide/index/test_helpers by default', () => {
        expect(rule.defaultExclude).toContain('**/index.js')
        expect(rule.defaultExclude).toContain('**/*.guide.js')
    })

})
